import mongoose from 'mongoose';

const CategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a category name'],
      unique: true,
    },
    slug: {
      type: String,
      required: [true, 'Please provide a slug'],
      unique: true,
    },
    description: String,
    image: String,
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// High Performance: Index for querying active categories
CategorySchema.index({ isActive: 1 });

export default mongoose.models.Category || mongoose.model('Category', CategorySchema);
