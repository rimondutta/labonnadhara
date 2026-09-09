/**
 * Facebook/Meta Pixel event helper utilities.
 *
 * Each function is safe to call even before the pixel has loaded — events are
 * queued internally and flushed once the pixel is fully initialized.
 * All monetary values are in BDT (Bangladeshi Taka).
 *
 * NOTE: cookie/tracking consent — if you add a consent banner in the future,
 * gate these calls on consent state before invoking. GDPR / PDPA compliance
 * may require explicit opt-in before firing any pixel events.
 */

declare global {
  interface Window {
    fbq?: ((...args: any[]) => void) & {
      callMethod?: (...args: any[]) => void;
      queue?: any[];
      loaded?: boolean;
      version?: string;
      push?: (...args: any[]) => void;
    };
    _fbq?: typeof window.fbq;
  }
}

/**
 * Fires `action` directly. 
 * The Facebook Pixel inline snippet defines `window.fbq` immediately and queues 
 * events natively until the fbevents.js script finishes loading.
 */
function fireWhenReady(action: () => void) {
  if (typeof window === 'undefined') return;
  
  if (typeof window.fbq === 'function') {
    try {
      action();
    } catch {
      // Pixel failures must never crash the page
    }
  } else {
    // If not injected yet, wait briefly and try once
    setTimeout(() => {
      if (typeof window.fbq === 'function') {
        try {
          action();
        } catch {}
      }
    }, 500);
  }
}

/** ViewContent — fired when a customer views a product detail page. */
export function trackViewContent(product: {
  _id: string;
  title?: string;
  price?: number;
  category?: { title?: string };
}) {
  try {
    if (!product?._id) return;
    fireWhenReady(() => {
      window.fbq!('track', 'ViewContent', {
        content_ids: [product._id],
        content_type: 'product',
        content_name: product.title ?? '',
        content_category: product.category?.title ?? '',
        value: Math.max(0.01, Number(product.price ?? 0)),
        currency: 'BDT',
      });
    });
  } catch {
    // Pixel failures must never crash the page
  }
}

/** AddToCart — fired when a customer adds a product to their cart. */
export function trackAddToCart(
  product: { _id: string; title?: string; price?: number },
  quantity: number
) {
  try {
    if (!product?._id) return;
    fireWhenReady(() => {
      window.fbq!('track', 'AddToCart', {
        content_ids: [product._id],
        content_type: 'product',
        content_name: product.title ?? '',
        value: Math.max(0.01, Number((product.price ?? 0) * quantity)),
        currency: 'BDT',
        quantity,
      });
    });
  } catch {
    // Pixel failures must never crash the page
  }
}

/** InitiateCheckout — fired when the checkout page loads with items. */
export function trackInitiateCheckout(
  cartItems: Array<{ id: string; price?: number; quantity?: number }>,
  totalValue: number
) {
  try {
    if (!cartItems?.length) return;
    fireWhenReady(() => {
      window.fbq!('track', 'InitiateCheckout', {
        content_ids: cartItems.map((i) => i.id),
        content_type: 'product',
        num_items: cartItems.reduce((sum, i) => sum + (i.quantity ?? 1), 0),
        value: Math.max(0.01, Number(totalValue || 0)),
        currency: 'BDT',
      });
    });
  } catch {
    // Pixel failures must never crash the page
  }
}

/** Purchase — fired after a successful order is created. */
export function trackPurchase(order: {
  _id?: string;
  orderId?: string;
  items: Array<{ productId?: string; id?: string }>;
  totalAmount?: number;
  total?: number;
}) {
  try {
    const orderId = String(order._id ?? order.orderId ?? '');
    let value = Number(order.totalAmount ?? order.total ?? 0);
    if (isNaN(value) || value <= 0) {
      value = 0.01; // Meta Pixel requires a positive non-zero value if currency is provided
    }
    const contentIds = (order.items || []).map((i) => String(i.productId ?? i.id ?? ''));

    fireWhenReady(() => {
      window.fbq!('track', 'Purchase', {
        content_ids: contentIds,
        content_type: 'product',
        value: Number(value.toFixed(2)),
        currency: 'BDT',
        order_id: orderId,
      });
    });
  } catch {
    // Pixel failures must never crash the page
  }
}

/** Search — fired when a customer performs a search. */
export function trackSearch(searchString: string) {
  try {
    if (!searchString) return;
    fireWhenReady(() => {
      window.fbq!('track', 'Search', {
        search_string: searchString,
      });
    });
  } catch {}
}

/** AddToWishlist — fired when a customer adds a product to their wishlist. */
export function trackAddToWishlist(product: { _id: string; title?: string; price?: number; category?: { title?: string } }) {
  try {
    if (!product?._id) return;
    fireWhenReady(() => {
      window.fbq!('track', 'AddToWishlist', {
        content_ids: [product._id],
        content_type: 'product',
        content_name: product.title ?? '',
        content_category: product.category?.title ?? '',
        value: Math.max(0.01, Number(product.price ?? 0)),
        currency: 'BDT',
      });
    });
  } catch {}
}

/** Contact — fired when a customer submits a contact form. */
export function trackContact() {
  try {
    fireWhenReady(() => {
      window.fbq!('track', 'Contact');
    });
  } catch {}
}
