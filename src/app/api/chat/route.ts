import { streamText, tool, zodSchema, convertToModelMessages, isStepCount } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import connectToDatabase from '@/lib/db';
import Product from '@/models/Product';
import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/ratelimit';
import { escapeRegex } from '@/lib/regex-utils';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

/** Maximum length for a search query string to prevent ReDoS and injection */
const MAX_QUERY_LENGTH = 100;
/** Maximum number of previous messages to retain in context */
const MAX_HISTORY_MESSAGES = 10;

// Configure OpenRouter as an OpenAI-compatible provider
const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY || '',
  headers: {
    'HTTP-Referer': 'https://labonnadhara.shop',
    'X-Title': 'Labonnadhara AI Assistant',
  },
});

export async function POST(req: Request) {
  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json({ error: 'OpenRouter API Key not configured' }, { status: 500 });
  }

  try {
    // 1. Upstash Rate Limiting (10 requests / 1 minute per IP)
    const ip = getClientIp(req);
    const rateLimit = await checkRateLimit(ip, 'chat');
    if (rateLimit.isLimited) {
      return NextResponse.json(
        { error: 'Too many chat requests. Please slow down and try again in a minute.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.max(1, Math.ceil((rateLimit.reset - Date.now()) / 1000))),
          },
        }
      );
    }

    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Valid messages array is required' }, { status: 400 });
    }

    // 2. Cap message history — take the most recent MAX_HISTORY_MESSAGES only.
    //    Pass the original UIMessage objects directly so convertToModelMessages
    //    receives the 'parts' field it requires.
    const trimmedMessages = messages.slice(-MAX_HISTORY_MESSAGES);

    // 3. Stream text with resource caps (maxOutputTokens: 500, tool iterations: 3)
    const result = streamText({
      model: openrouter(process.env.OPENROUTER_MODEL || 'google/gemini-flash-1.5'),
      maxOutputTokens: 500,
      system: `You are a helpful, friendly customer support AI for "Labonnadhara", a premium jewelry and lifestyle brand in Bangladesh.
      Made By Rimon Dutta.
Your goal is to help customers find products, check stock, and answer questions about our collections.
- Always use the 'searchProducts' tool when a user asks about product availability, prices, or catalog items.
- If a product is out of stock (inventory <= 0), politely inform the customer.
- Always provide the product link (e.g., [Product Name](/products/product-slug)) so they can click and view it.
- Format prices in BDT (৳).
- Be concise and friendly.
- Do not make up products or prices. ONLY rely on the information returned by the searchProducts tool.`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messages: await convertToModelMessages(trimmedMessages as any),
      stopWhen: isStepCount(3), // Cap tool iterations to 3 to prevent runaway token burning
      tools: {
        searchProducts: tool({
          description: 'Search for products in the Labonnadhara catalog by name, category, or keyword.',
          inputSchema: zodSchema(
            z.object({
              query: z
                .string()
                .max(MAX_QUERY_LENGTH, `Query must be at most ${MAX_QUERY_LENGTH} characters`)
                .describe('The search keyword (e.g., "necklace", "ring", "earrings").'),
            })
          ),
          execute: async ({ query }: { query: string }) => {
            await connectToDatabase();

            const safeQuery = query.trim().substring(0, MAX_QUERY_LENGTH);
            if (!safeQuery) {
              return { results: 'No products found for this query.' };
            }

            // 1. Authoritative MongoDB $text search using existing text index: { title: 'text', description: 'text' }
            let products = await Product.find({
              $text: { $search: safeQuery },
              isPublished: true,
            })
              .select('title slug price compareAtPrice inventory hasVariations variants badge')
              .limit(5)
              .lean();

            // 2. Fallback: if $text returns nothing (e.g. stop-words or short substring),
            // use escapeRegex to safely escape all meta-characters before doing a safe regex search.
            if (!products.length) {
              const safeRegexPattern = new RegExp(escapeRegex(safeQuery), 'i');

              products = await Product.find({
                title: { $regex: safeRegexPattern },
                isPublished: true,
              })
                .select('title slug price compareAtPrice inventory hasVariations variants badge')
                .limit(5)
                .lean();
            }

            if (!products.length) return { results: 'No products found for this query.' };

            interface ProductVariant {
              inventory?: number;
              stock?: number;
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
                  stock = p.variants.reduce((total: number, v: ProductVariant) => total + (v.stock || v.inventory || 0), 0);
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
