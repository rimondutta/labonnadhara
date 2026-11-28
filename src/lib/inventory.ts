import Product from '@/models/Product';
import type { ClientSession } from 'mongoose';

export interface InventoryUpdateOp {
  updateOne: {
    filter: Record<string, unknown>;
    update: Record<string, unknown>;
  };
}

export class InsufficientStockError extends Error {
  statusCode = 409;
  constructor(message = 'One or more items in your order are out of stock.') {
    super(message);
    this.name = 'InsufficientStockError';
  }
}

/**
 * Merges duplicate product/variant stock deductions in the same order
 * so splitting quantity across multiple lines cannot bypass atomic $gte guards.
 */
export function coalesceInventoryOperations(
  ops: InventoryUpdateOp[]
): InventoryUpdateOp[] {
  const grouped = new Map<
    string,
    {
      productId: unknown;
      variantId?: unknown;
      totalDecrement: number;
    }
  >();

  for (const op of ops) {
    const filter = op?.updateOne?.filter || {};
    const inc = (op?.updateOne?.update?.$inc || {}) as Record<string, number>;
    const productId = filter._id;
    const variantId = filter['variants._id'];
    const rawDelta =
      typeof inc['variants.$.stock'] === 'number'
        ? inc['variants.$.stock']
        : typeof inc.inventory === 'number'
          ? inc.inventory
          : 0;

    if (!productId || rawDelta >= 0) continue;
    const qty = Math.abs(rawDelta);
    const key = `${String(productId)}::${variantId ? String(variantId) : 'base'}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.totalDecrement += qty;
    } else {
      grouped.set(key, { productId, variantId, totalDecrement: qty });
    }
  }

  const merged: InventoryUpdateOp[] = [];
  for (const entry of grouped.values()) {
    if (entry.variantId) {
      merged.push({
        updateOne: {
          filter: {
            _id: entry.productId,
            'variants._id': entry.variantId,
            'variants.stock': { $gte: entry.totalDecrement },
          },
          update: {
            $inc: { 'variants.$.stock': -entry.totalDecrement },
          },
        },
      });
    } else {
      merged.push({
        updateOne: {
          filter: {
            _id: entry.productId,
            inventory: { $gte: entry.totalDecrement },
          },
          update: {
            $inc: { inventory: -entry.totalDecrement },
          },
        },
      });
    }
  }

  return merged;
}

function buildRollbackOp(op: InventoryUpdateOp): InventoryUpdateOp {
  const filter = op.updateOne.filter;
  const inc = (op.updateOne.update.$inc || {}) as Record<string, number>;

  if ('variants._id' in filter && typeof inc['variants.$.stock'] === 'number') {
    return {
      updateOne: {
        filter: { _id: filter._id, 'variants._id': filter['variants._id'] },
        update: { $inc: { 'variants.$.stock': Math.abs(inc['variants.$.stock']) } },
      },
    };
  }

  return {
    updateOne: {
      filter: { _id: filter._id },
      update: { $inc: { inventory: Math.abs(inc.inventory || 0) } },
    },
  };
}

/**
 * Atomically reserves/deducts inventory using conditional `$gte` filters.
 * Rolls back any already-applied operations cleanly if any item lacks stock.
 */
export async function reserveOrderInventory(
  operations: InventoryUpdateOp[],
  session?: ClientSession
): Promise<InventoryUpdateOp[]> {
  const merged = coalesceInventoryOperations(operations);
  if (merged.length === 0) return [];

  const applied: InventoryUpdateOp[] = [];
  try {
    for (const op of merged) {
      const result = await Product.updateOne(
        op.updateOne.filter,
        op.updateOne.update,
        session ? { session } : undefined
      );

      if (!result || result.modifiedCount !== 1) {
        throw new InsufficientStockError(
          'Insufficient stock available for one or more selected items.'
        );
      }

      applied.push(op);
    }

    return applied;
  } catch (error) {
    // Only need explicit compensating rollback when not inside a rolled-back ACID transaction
    if (!session && applied.length > 0) {
      await releaseOrderInventory(applied).catch((rollbackErr) => {
        console.error('[Inventory] Failed compensating stock rollback:', rollbackErr);
      });
    }
    throw error;
  }
}

/**
 * Compensating rollback to restore reserved stock if order creation fails outside a transaction.
 */
export async function releaseOrderInventory(appliedOps: InventoryUpdateOp[]): Promise<void> {
  for (const op of appliedOps) {
    const rollback = buildRollbackOp(op);
    await Product.updateOne(rollback.updateOne.filter, rollback.updateOne.update);
  }
}
