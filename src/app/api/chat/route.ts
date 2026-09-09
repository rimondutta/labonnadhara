import { streamText, tool, zodSchema, convertToModelMessages, isStepCount } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import connectToDatabase from '@/lib/db';
import Product from '@/models/Product';
import { NextResponse } from 'next/server';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// Configure OpenRouter as an OpenAI-compatible provider
const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY || '',
  headers: {
    'HTTP-Referer': 'https://toyhourse.vercel.app',
    'X-Title': 'Toy Hourse AI Assistant',
  },
});

export async function POST(req: Request) {
  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json({ error: 'OpenRouter API Key not configured' }, { status: 500 });
  }

  try {
    const { messages } = await req.json();

    const result = streamText({
      model: openrouter(process.env.OPENROUTER_MODEL || 'google/gemini-flash-1.5'),
      system: `You are a helpful, friendly customer support AI for "Toy Hourse", a premium toy and gear store in Bangladesh.
      Made By Rimon Dutta
Your goal is to help customers find products, check stock, and answer questions about toys.
- Always use the 'searchProducts' tool when a user asks about product availability, prices, or if we have a specific toy.
- If a product is out of stock (inventory <= 0), politely inform the customer.
- Always provide the product link (e.g., [Product Name](/products/product-slug)) so they can click and buy it.
- Format prices in BDT (৳).
- Be concise and friendly. Use emojis occasionally (🧸, 🚗, ✨).
- Do not make up products or prices. ONLY rely on the information returned by the searchProducts tool.`,
      messages: await convertToModelMessages(messages),
      stopWhen: isStepCount(5),
      tools: {
        searchProducts: tool({
          description: 'Search for products in the Toy Hourse catalog by name, category, or keyword.',
          inputSchema: zodSchema(
            z.object({
              query: z.string().describe('The search keyword (e.g., "car", "lego", "doll").'),
            })
          ),
          execute: async ({ query }: { query: string }) => {
            await connectToDatabase();
            const products = await Product.find({
              $or: [
                { title: { $regex: query, $options: 'i' } },
                { tags: { $regex: query, $options: 'i' } },
              ],
              isPublished: true,
            })
              .select('title slug price compareAtPrice inventory hasVariations variants badge')
              .limit(5)
              .lean();

            if (!products.length) return { results: 'No products found for this query.' };

            interface ProductVariant {
              inventory?: number;
              price: number;
            }

            interface ProductType {
              title: string;
              slug: string;
              price: number;
              compareAtPrice?: number;
              inventory: number;
              hasVariations: boolean;
              variants?: ProductVariant[];
              badge?: string;
            }

            return {
              results: (products as ProductType[]).map((p) => {
                let stock = p.inventory;
                let price = p.price;

                if (p.hasVariations && p.variants && p.variants.length > 0) {
                  stock = p.variants.reduce((total: number, v: ProductVariant) => total + (v.inventory || 0), 0);
                  price = p.variants[0].price;
                }

                return {
                  name: p.title,
                  price,
                  originalPrice: p.compareAtPrice,
                  stock,
                  inStock: stock > 0,
                  link: `/products/${p.slug}`,
                  badge: p.badge,
                };
              }),
            };
          },
        }),
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('AI Chat Error:', error);
    return NextResponse.json({ error: 'Failed to process chat request' }, { status: 500 });
  }
}
