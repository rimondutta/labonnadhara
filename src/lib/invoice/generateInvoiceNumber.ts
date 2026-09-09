import Counter from '@/models/Counter';

/**
 * Generates the next sequential invoice number.
 * Format: INV-{YEAR}-{5-digit-padded-seq}
 * e.g. INV-2026-00001
 *
 * Uses an atomic findOneAndUpdate + $inc so concurrent requests
 * never produce duplicate invoice numbers.
 */
export async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const counterId = `invoice_${year}`;

  const counter = await Counter.findOneAndUpdate(
    { _id: counterId },
    { $inc: { seq: 1 } },
    { returnDocument: 'after', upsert: true }
  );

  const padded = String(counter.seq).padStart(5, '0');
  return `INV-${year}-${padded}`;
}
