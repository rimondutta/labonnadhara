import mongoose from 'mongoose';
import Product from '@/models/Product';
import Review from '@/models/Review';
import { invalidateProduct } from '@/lib/cache/invalidation';

export interface UnifiedReviewDTO {
  _id: string;
  rating: number;
  title: string;
  text: string;
  name: string;
  date: Date | string;
  status: 'pending' | 'published';
  isVerifiedPurchase?: boolean;
}

/**
 * Recalculates average rating and reviewCount from ALL published reviews
 * across both the dedicated Review collection and any legacy embedded Product.reviews.
 */
export async function recalculateProductRating(
  productId: string | mongoose.Types.ObjectId
): Promise<string | undefined> {
  const pid = typeof productId === 'string' ? new mongoose.Types.ObjectId(productId) : productId;

  const [product, collectionReviews] = await Promise.all([
    Product.findById(pid).select('slug reviews rating reviewCount'),
    Review.find({
      productId: pid,
      $or: [{ status: 'published' }, { status: { $exists: false } }],
    })
      .select('rating')
      .lean() as Promise<Array<{ rating: number }>>,
  ]);

  if (!product) return undefined;

  const legacyPublished = Array.isArray(product.reviews)
    ? (product.reviews as Array<{ status?: string; rating: number }>).filter(
        (r) => !r.status || r.status === 'published'
      )
    : [];

  const totalCount = collectionReviews.length + legacyPublished.length;
  const ratingSum =
    collectionReviews.reduce((s, r) => s + Number(r.rating || 0), 0) +
    legacyPublished.reduce((s, r) => s + Number(r.rating || 0), 0);

  product.rating = totalCount > 0 ? Number((ratingSum / totalCount).toFixed(1)) : 0;
  product.reviewCount = totalCount;
  await product.save();

  await invalidateProduct(pid.toString(), product.slug);
  return product.slug;
}

/**
 * Fetches published reviews from the dedicated Review collection combined with
 * any legacy embedded Product.reviews entries, newest first (capped at 50).
 */
export async function getMergedPublishedReviews(
  productId: string | mongoose.Types.ObjectId,
  legacyReviews: Array<{
    _id?: unknown;
    rating: number;
    title?: string;
    text?: string;
    name?: string;
    date?: Date | string;
    status?: string;
  }> = []
): Promise<UnifiedReviewDTO[]> {
  const collectionDocs = (await Review.find({
    productId,
    $or: [{ status: 'published' }, { status: { $exists: false } }],
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .select('_id rating title comment userName createdAt status isVerifiedPurchase')
    .lean()) as Array<{
    _id: mongoose.Types.ObjectId;
    rating: number;
    title?: string;
    comment: string;
    userName: string;
    createdAt: Date;
    status?: string;
    isVerifiedPurchase?: boolean;
  }>;

  const mappedCollection: UnifiedReviewDTO[] = collectionDocs.map((doc) => ({
    _id: doc._id.toString(),
    rating: doc.rating,
    title: doc.title || '',
    text: doc.comment,
    name: doc.userName,
    date: doc.createdAt,
    status: doc.status === 'pending' ? 'pending' : 'published',
    isVerifiedPurchase: Boolean(doc.isVerifiedPurchase),
  }));

  const mappedLegacy: UnifiedReviewDTO[] = (legacyReviews || [])
    .filter((r) => !r.status || r.status === 'published')
    .map((r) => ({
      _id: r._id ? String(r._id) : '',
      rating: r.rating,
      title: r.title || '',
      text: r.text || '',
      name: r.name || 'Customer',
      date: r.date || new Date(0),
      status: 'published',
    }));

  return [...mappedCollection, ...mappedLegacy]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 50);
}
