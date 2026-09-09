import mongoose from 'mongoose';
import BlogPost from '../models/BlogPost';

const MONGODB_URI = 'mongodb://localhost:27017/flexwear';

const posts = [
  {
    title: "The Anatomy of Modern Minimalist Style",
    slug: "anatomy-of-modern-minimalist-style",
    excerpt: "Exploring the intersection of technical performance and high-fashion aesthetics in the modern wardrobe.",
    content: `
# The Anatomy of Modern Minimalist Style

Minimalism in fashion is often misunderstood as simply 'wearing less.' In reality, it is a disciplined approach to curation, where every piece serves a specific purpose—both aesthetically and functionally.

## The Foundation
A minimalist wardrobe begins with high-quality basics. These are the versatile building blocks that can be mixed and matched across seasons. Our 'Tech-Cotton' series is a prime example of this philosophy.

## Technical Superiority
Why settle for generic fabrics? We believe that the clothes you wear should adapt to your environment. From moisture-wicking properties to antimicrobial properties, technical fabrics are no longer reserved for the gym.

## The Editorial Shift
The transition from street-ready to boardroom-chic is a subtle one. By focusing on silhouette and texture over logos and loud colors, you create a timeless look that commands respect through its understated elegance.
    `,
    author: { name: "ALEX RILEY", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=200&h=200&fit=crop" },
    featuredImage: { 
      url: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1200&h=800&fit=crop",
      alt: "Minimalist fashion aesthetic"
    },
    category: "Style Guide",
    tags: ["Minimalism", "Technical", "AW24"],
    readingTime: "4 min read",
    isPublished: true
  },
  {
    title: "Behind the Seams: The Tech-Wear Revolution",
    slug: "behind-the-seams-tech-wear-revolution",
    excerpt: "A deep dive into the laboratory where our signature performance fabrics are engineered.",
    content: `
# Behind the Seams: The Tech-Wear Revolution

The future of fashion isn't just about what you see; it's about what you don't. At FLEXWEAR, we spend thousands of hours in the laboratory before a single stitch is made.

## Engineering Performance
Our proprietary 'Aero-Weave' technology is designed to regulate body temperature in extreme conditions. Whether you're navigating the urban jungle or a high-altitude hike, the fabric breathes with you.

## Sustainable Innovation
Performance shouldn't come at the cost of the planet. All our technical components are now 80% derived from recycled ocean plastics, maintaining their structural integrity while reducing our carbon footprint.

## Future Outlook
We are currently exploring biocompatible fibers that can monitor heart rate and hydration levels. The line between technology and apparel is blurring, and we are at the forefront of that convergence.
    `,
    author: { name: "SARA CHEN", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=200&h=200&fit=crop" },
    featuredImage: { 
      url: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=1200&h=800&fit=crop",
      alt: "Fabric engineering lab"
    },
    category: "Innovation",
    tags: ["Technology", "Sustainability", "Future"],
    readingTime: "6 min read",
    isPublished: true
  },
  {
    title: "Paris Fashion Week: A New Direction",
    slug: "paris-fashion-week-new-direction",
    excerpt: "Insights from the front row as we debuted our 'Cyber-Classic' collection in the heart of Paris.",
    content: `
# Paris Fashion Week: A New Direction

The atmosphere was electric at the Palais de Tokyo as we unveiled the 'Cyber-Classic' FW24 collection. This season marks a departure from traditional street-wear towards a more structured, architectural approach to clothing.

## The 'Cyber-Classic' Aesthetic
By combining 19th-century tailoring techniques with 21st-century bonded seams, we created a silhouette that feels both historical and futuristic.

## Critical Reception
Vogue described the collection as 'a masterclass in restrained futurism.' The feedback reinforces our belief that the market is ready for apparel that challenges the status quo.

## What's Next?
The collection will be available exclusively through our 'Early Access Registry' starting next month. Stay tuned for the official drop manifest.
    `,
    author: { name: "MARCUS VOGUE", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&h=200&fit=crop" },
    featuredImage: { 
      url: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=1200&h=800&fit=crop",
      alt: "Runway show in Paris"
    },
    category: "Brand",
    tags: ["PFW", "FW24", "Editorial"],
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
