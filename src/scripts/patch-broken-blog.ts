import mongoose from "mongoose";
import * as dotenv from "dotenv";
import BlogPost from "../models/BlogPost";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/eco";

async function patch() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    const brokenUrl = "https://images.unsplash.com/photo-1441984904996-e0b6ba687e12?q=80&w=1200&h=800&fit=crop";
    const newUrl = "https://images.unsplash.com/photo-1539109132314-34a75adad142?q=80&w=1200&h=800&fit=crop";

    const result = await BlogPost.updateMany(
      { "featuredImage.url": brokenUrl },
      { $set: { "featuredImage.url": newUrl } }
    );

    console.log(`Patch completed. Modified ${result.modifiedCount} documents.`);
    process.exit(0);
  } catch (error) {
    console.error("Patch failed:", error);
    process.exit(1);
  }
}

patch();
