import mongoose from 'mongoose';

/**
 * VariationType
 * Represents a named category of product variation, e.g. "Color", "Size", "Pieces".
 * Admins can create/manage these from /admin/variations.
 * displayType controls how the selector renders on the storefront:
 *   - "swatch"   → color circles (used for Color)
 *   - "button"   → pill-style buttons (used for Size, Pieces, etc.)
 *   - "dropdown" → <select> element
 */
const VariationTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    displayType: {
      type: String,
      enum: ['swatch', 'button', 'dropdown'],
      default: 'button',
    },
  },
  { timestamps: true }
);

export default mongoose.models.VariationType ||
  mongoose.model('VariationType', VariationTypeSchema);
