import mongoose from 'mongoose';
import Product from '@/models/Product';
import Settings from '@/models/Settings';
import Coupon, { ICoupon } from '@/models/Coupon';

export interface OrderItemInput {
  productId?: string;
  product?: string | { _id?: string };
  variantId?: string;
  quantity: number;
  title?: string;
  image?: string;
  variantOptions?: Record<string, string>;
}

export interface VerifiedOrderItem {
  product: mongoose.Types.ObjectId;
  variantId?: mongoose.Types.ObjectId;
  quantity: number;
  price: number;
  title: string;
  image?: string;
  variantOptions?: Record<string, string>;
}

export interface OrderPricingResult {
  verifiedItems: VerifiedOrderItem[];
  subtotal: number;
  shippingCost: number;
  couponDiscount: number;
  totalAmount: number;
  appliedCoupon: ICoupon | null;
  inventoryOperations: Array<{
    updateOne: {
      filter: Record<string, unknown>;
      update: Record<string, unknown>;
    };
  }>;
}

export interface PricingOptions {
  items: OrderItemInput[];
  couponCode?: string | null;
  shippingZone?: 'inside_chattogram' | 'outside_chattogram' | string;
  checkStock?: boolean;
}

/**
 * Authoritative Server-Side Order Pricing & Stock Validation Helper.
 * 
 * Never trusts prices, subtotals, or shipping costs provided by the client.
 * Fetches authoritative live documents from MongoDB in a single $in query.
 */
export async function calculateOrderTotals({
  items,
  couponCode,
  shippingZone,
  checkStock = true,
}: PricingOptions): Promise<OrderPricingResult> {
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new Error('Order must include at least one item.');
  }

  // 1. Sanitize input items and validate quantities
  const parsedItems: Array<{ pId: string; variantId?: string; quantity: number; title?: string; image?: string; variantOptions?: Record<string, string> }> = [];
  const requestedIds = new Set<string>();

  for (const item of items) {
    const pId = String(item.productId || (typeof item.product === 'object' ? item.product?._id : item.product) || '').trim();
    const qty = Number(item.quantity);

    if (!pId) {
      throw new Error('Every item must contain a valid product identifier.');
    }

    if (!Number.isInteger(qty) || qty < 1 || qty > 99) {
      throw new Error(`Invalid quantity (${item.quantity}) for product. Quantity must be an integer between 1 and 99.`);
    }

    requestedIds.add(pId);
    parsedItems.push({
      pId,
      variantId: item.variantId ? String(item.variantId).trim() : undefined,
      quantity: qty,
      title: item.title,
      image: item.image,
      variantOptions: item.variantOptions,
    });
  }

  // 2. Fetch all products in one efficient $in query
  interface DBVariant {
    _id: mongoose.Types.ObjectId;
    price: number;
    stock: number;
    isActive?: boolean;
    combinationLabel?: string;
  }

  interface DBProduct {
    _id: mongoose.Types.ObjectId;
    title: string;
    price: number;
    inventory: number;
    isPublished?: boolean;
    hasVariations?: boolean;
    variants?: DBVariant[];
    images?: Array<{ url: string } | string>;
  }

  const dbProducts = await Product.find({
    _id: { $in: Array.from(requestedIds) },
  }).lean() as unknown as DBProduct[];

  const productMap = new Map<string, DBProduct>(
    dbProducts.map((p) => [p._id.toString(), p])
  );

  const verifiedItems: VerifiedOrderItem[] = [];
  const inventoryOperations: Array<{ updateOne: { filter: Record<string, unknown>; update: Record<string, unknown> } }> = [];
  let calculatedSubtotal = 0;

  for (const item of parsedItems) {
    const dbProduct = productMap.get(item.pId);

    if (!dbProduct) {
      throw new Error(`Product not found in catalog: ${item.pId}`);
    }

    if (dbProduct.isPublished === false) {
      throw new Error(`Product "${dbProduct.title}" is currently not available for purchase.`);
    }

    let authoritativePrice: number;
    let selectedVariant: DBVariant | undefined;

    if (item.variantId && dbProduct.hasVariations && Array.isArray(dbProduct.variants)) {
      selectedVariant = dbProduct.variants.find(
        (v) => v._id?.toString() === item.variantId
      );

      if (!selectedVariant) {
        throw new Error(`Selected variant for "${dbProduct.title}" was not found.`);
      }

      if (selectedVariant.isActive === false) {
        throw new Error(`The selected variant for "${dbProduct.title}" is no longer active.`);
      }

      if (checkStock && selectedVariant.stock < item.quantity) {
        throw new Error(
          `Insufficient stock for "${dbProduct.title}" (${selectedVariant.combinationLabel || 'variant'}). Available: ${selectedVariant.stock}`
        );
      }

      authoritativePrice = Number(selectedVariant.price);

      inventoryOperations.push({
        updateOne: {
          filter: {
            _id: dbProduct._id,
            'variants._id': selectedVariant._id,
            'variants.stock': { $gte: item.quantity },
          },
          update: {
            $inc: { 'variants.$.stock': -item.quantity },
          },
        },
      });
    } else {
      // Standard product without variant
      if (checkStock && dbProduct.inventory < item.quantity) {
        throw new Error(`Insufficient stock for "${dbProduct.title}". Available: ${dbProduct.inventory}`);
      }

      authoritativePrice = Number(dbProduct.price);

      inventoryOperations.push({
        updateOne: {
          filter: {
            _id: dbProduct._id,
            inventory: { $gte: item.quantity },
          },
          update: {
            $inc: { inventory: -item.quantity },
          },
        },
      });
    }

    if (isNaN(authoritativePrice) || authoritativePrice < 0) {
      throw new Error(`Invalid price recorded for product "${dbProduct.title}".`);
    }

    calculatedSubtotal += authoritativePrice * item.quantity;

    // Get product image URL
    let imageUrl = item.image;
    if (!imageUrl && dbProduct.images && dbProduct.images.length > 0) {
      const firstImg = dbProduct.images[0];
      imageUrl = typeof firstImg === 'string' ? firstImg : firstImg?.url;
    }

    verifiedItems.push({
      product: dbProduct._id,
      variantId: selectedVariant ? selectedVariant._id : undefined,
      quantity: item.quantity,
      price: authoritativePrice, // Guaranteed DB price snapshot
      title: dbProduct.title,
      image: imageUrl,
      variantOptions: item.variantOptions,
    });
  }

  // 3. Authoritative Server-Side Shipping Calculation from Settings
  const settingsDoc = await Settings.findOne({ key: 'global' }).lean() as {
    shipping?: {
      insideChattogramRate?: number;
      outsideChattogramRate?: number;
      freeShippingEnabled?: boolean;
      freeShippingMinOrder?: number;
      freeShippingZone?: string;
    };
  } | null;

  const shippingConfig = settingsDoc?.shipping ?? {};
  const insideRate = Number(shippingConfig.insideChattogramRate ?? 120);
  const outsideRate = Number(shippingConfig.outsideChattogramRate ?? 150);
  const freeShippingEnabled = Boolean(shippingConfig.freeShippingEnabled);
  const freeShippingMin = Number(shippingConfig.freeShippingMinOrder ?? 0);
  const freeShippingZone = shippingConfig.freeShippingZone ?? 'all';

  const isInside = shippingZone === 'inside_chattogram';
  let authoritativeShipping = isInside ? insideRate : outsideRate;

  if (freeShippingEnabled && calculatedSubtotal >= freeShippingMin) {
    if (
      freeShippingZone === 'all' ||
      (isInside && freeShippingZone === 'inside_chattogram') ||
      (!isInside && freeShippingZone === 'outside_chattogram')
    ) {
      authoritativeShipping = 0;
    }
  }

  // 4. Authoritative Server-Side Coupon Validation
  let couponDiscount = 0;
  let appliedCoupon: ICoupon | null = null;

  if (couponCode && typeof couponCode === 'string' && couponCode.trim()) {
    const codeNormalized = couponCode.trim().toUpperCase();
    const couponDoc = await Coupon.findOne({ code: codeNormalized, isActive: true });

    if (couponDoc) {
      const isExpired = couponDoc.expiresAt && new Date(couponDoc.expiresAt) < new Date();
      const isExhausted = couponDoc.maxUses > 0 && couponDoc.usedCount >= couponDoc.maxUses;
      const meetsMinAmount = !couponDoc.minOrderAmount || calculatedSubtotal >= couponDoc.minOrderAmount;

      if (!isExpired && !isExhausted && meetsMinAmount) {
        appliedCoupon = couponDoc;
        if (couponDoc.discountType === 'percentage') {
          couponDiscount = Math.round((calculatedSubtotal * couponDoc.discountValue) / 100);
        } else {
          couponDiscount = Math.min(calculatedSubtotal, couponDoc.discountValue);
        }
      }
    }
  }

  // 5. Final Authoritative Total Amount
  const totalAmount = Math.max(0, calculatedSubtotal - couponDiscount + authoritativeShipping);

  return {
    verifiedItems,
    subtotal: calculatedSubtotal,
    shippingCost: authoritativeShipping,
    couponDiscount,
    totalAmount,
    appliedCoupon,
    inventoryOperations,
  };
}
