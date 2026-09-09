import connectToDatabase from '@/lib/db';
import Counter from '@/models/Counter';

const COUNTER_ID = 'products_last_updated';

/**
 * Writes the current UTC timestamp (ms) to the Counter document.
 * Call this after any product create / update / delete so the mobile
 * polling endpoint can detect stale data.
 */
export async function touchProductsTimestamp(): Promise<void> {
  try {
    await connectToDatabase();
    await Counter.findByIdAndUpdate(
      COUNTER_ID,
      { $set: { seq: Date.now() } },
      { upsert: true }
    );
  } catch (err) {
    // Non-fatal: don't let a timestamp write failure block a product save
    console.error('[lastUpdated] Failed to update products timestamp:', err);
  }
}

/**
 * Reads the current timestamp value. Returns 0 if not yet set.
 */
export async function getProductsTimestamp(): Promise<number> {
  try {
    await connectToDatabase();
    const doc = await Counter.findById(COUNTER_ID).lean();
    return (doc as any)?.seq ?? 0;
  } catch (err) {
    console.error('[lastUpdated] Failed to read products timestamp:', err);
    return 0;
  }
}

