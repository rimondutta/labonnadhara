import mongoose from 'mongoose';

/**
 * VariationValue
 * Represents a specific value within a VariationType,
 * e.g. "Red" under "Color", "Large" under "Size", "10 Pieces" under "Pieces".
 * colorHex is only relevant when the parent VariationType.displayType === "swatch".
 */
const VariationValueSchema = new mongoose.Schema(
  {
    variationType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VariationType',
      required: true,
      index: true,
    },
    value: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    colorHex: { type: String, default: null }, // e.g. "#FF0000" — only for swatch display type
    sortOrder: { type: Number, default: 0 }, // for controlling display order
  },
  { timestamps: true }
);

// Pre validate hook removed because slugs are generated in the API routes

// Compound unique index: no duplicate values within the same variation type
VariationValueSchema.index({ variationType: 1, slug: 1 }, { unique: true });

export default mongoose.models.VariationValue ||
  mongoose.model('VariationValue', VariationValueSchema);
