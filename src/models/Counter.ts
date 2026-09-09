import mongoose, { Schema } from 'mongoose';

/**
 * Counter model for generating sequential invoice numbers.
 * Each document tracks a named sequence (e.g. "invoice_2026").
 */
const CounterSchema = new Schema({
  _id: { type: String, required: true }, // e.g. "invoice_2026"
  seq: { type: Number, default: 0 },
});

export default mongoose.models.Counter ||
  mongoose.model('Counter', CounterSchema);
