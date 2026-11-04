import mongoose from 'mongoose';
import BlogPost from '../models/BlogPost';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/labonnadhara';

const posts = [
  {
    title: "The Anatomy of Modern Minimalist Style",
    slug: "anatomy-of-modern-minimalist-style",
    excerpt: "Exploring the intersection of technical performance and high-fashion aesthetics in the modern wardrobe.",
    content: `
# The Anatomy of Modern Minimalist Style

Minimalism in fashion is often misunderstood as simply 'wearing less.' In reality, it is a disciplined approach to curation, where every piece serves a specific purpose—both aesthetically and functionally.

## The Foundation
A minimalist wardrobe begins with high-quality basics. These are the versatile building blocks that can be mixed and matched across seasons. Our signature series is a prime example of this philosophy.

## Technical Superiority
Why settle for generic designs? We believe that what you wear should adapt to your lifestyle with enduring elegance and craftsmanship.

## The Editorial Shift
The transition from daytime elegance to evening glamour is a subtle one. By focusing on silhouette and texture, you create a timeless look that commands respect through understated elegance.
    `,
    author: { name: "ALEX RILEY", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=200&h=200&fit=crop" },
    featuredImage: { 
      url: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1200&h=800&fit=crop",
      alt: "Minimalist fashion aesthetic"
    },
    category: "Style Guide",
    tags: ["Minimalism", "Elegance", "Style"],
    readingTime: "4 min read",
    isPublished: true
  },
  {
    title: "Behind the Craft: The Labonnadhara Philosophy",
    slug: "behind-the-craft-labonnadhara-philosophy",
    excerpt: "A deep dive into our studio where each signature piece is meticulously designed.",
    content: `
# Behind the Craft: The Labonnadhara Philosophy

The soul of style isn't just about appearance; it's about craftsmanship and authenticity. At Labonnadhara, we dedicate countless hours to perfecting every nuance before a piece reaches your collection.

## Handcrafted Excellence
Our pieces are designed to celebrate your unique personality and moments that matter, blending timeless heritage with contemporary flair.

## Sustainable Elegance
True beauty lasts generations. We source ethically and design for permanence, keeping our environmental footprint low.
    `,
    author: { name: "SARA CHEN", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=200&h=200&fit=crop" },
    featuredImage: { 
      url: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=1200&h=800&fit=crop",
      alt: "Design studio and craftsmanship"
    },
    category: "Craftsmanship",
    tags: ["Craft", "Design", "Timeless"],
    readingTime: "5 min read",
    isPublished: true
  },
  {
    title: "Seasonal Showcase: A New Direction",
    slug: "seasonal-showcase-new-direction",
    excerpt: "Discover the inspiration behind our latest signature collection.",
    content: `
# Seasonal Showcase: A New Direction

This season marks a fresh artistic evolution towards intricate artistry and pure modern lines.

## The Signature Collection
By combining timeless artisanship with modern silhouettes, we present pieces that feel rooted in tradition yet distinctly contemporary.

## Available Now
The new season is now available online and in select boutiques.
    `,
    author: { name: "LABONNADHARA EDITORIAL", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&h=200&fit=crop" },
    featuredImage: { 
      url: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=1200&h=800&fit=crop",
      alt: "Seasonal collection showcase"
    },
    category: "Brand",
    tags: ["Editorial", "Collection", "Showcase"],
    readingTime: "3 min read",
    isPublished: true
  }
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Clear existing blogs
    await BlogPost.deleteMany({});
    console.log('Cleared existing blog posts');
    
    // Insert new posts
    await BlogPost.insertMany(posts);
    console.log('Successfully seeded blog posts');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

seed();
