import mongoose from 'mongoose';

const BlogPostSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    excerpt: { type: String, required: true },
    content: { type: String, required: true }, // Markdown supported
    author: {
      name: { type: String, default: "FLEXWEAR EDITORIAL" },
      avatar: { type: String },
    },
    featuredImage: {
      url: { type: String, required: true },
      alt: { type: String },
    },
    category: { type: String, default: "Editorial" }, // e.g., 'Fashion', 'Style Guide', 'Brand'
    tags: [{ type: String }],
    readingTime: { type: String }, // e.g., '5 min read'
    isPublished: { type: Boolean, default: true },
    publishedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Performance: Compound index covering the blog listing query (isPublished + publishedAt sort)
BlogPostSchema.index({ isPublished: 1, publishedAt: -1 });

export default mongoose.models.BlogPost || mongoose.model('BlogPost', BlogPostSchema);
