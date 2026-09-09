const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });

const ProductSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: String,
  price: { type: Number, required: true },
  compareAtPrice: Number,
  images: [{ url: String, alt: String }],
  isPublished: { type: Boolean, default: true },
  badge: String,
  ageRange: String,
  rating: Number,
  reviewCount: Number,
});

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("Please define the MONGODB_URI environment variable inside .env");
  process.exit(1);
}

const DUMMY_PRODUCTS = [
  {
    title: "Premium Leather High-Top Sneakers",
    slug: "premium-leather-high-top",
    description: "Sleek, minimalist high-top sneakers crafted from premium Italian leather.",
    price: 180,
    compareAtPrice: 220,
    images: [{ url: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?q=80&w=800", alt: "Sneakers" }],
    badge: "New Release",
    ageRange: "Adult",
    rating: 4.9,
    reviewCount: 42,
  },

];

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected.');

    for (const product of DUMMY_PRODUCTS) {
      await Product.findOneAndUpdate({ slug: product.slug }, product, { upsert: true, new: true });
      console.log(`Seeded: ${product.title}`);
    }

    console.log('Seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

seed();
