"use client"

import { useState, useEffect } from "react"
import { Star, MessageSquare, Trash2, CheckCircle, XCircle } from "lucide-react"
import { getOptimizedCloudinaryUrl } from "@/lib/utils"

interface Review {
  _id: string
  productId: {
    _id: string
    title: string
    images: { url: string }[]
  }
  userId: string
  userName: string
  rating: number
  comment: string
  status: 'pending' | 'published'
  createdAt: string
}

export default function ReviewsClient() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchReviews()
  }, [])

  const fetchReviews = async () => {
    try {
      setIsLoading(true)
      const res = await fetch("/api/admin/reviews")
      if (!res.ok) throw new Error("Failed to fetch reviews")
      const data = await res.json()
      setReviews(data.reviews || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateStatus = async (id: string, productId: string, newStatus: 'pending' | 'published') => {
    try {
      const res = await fetch("/api/admin/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, productId, status: newStatus }),
      })
      if (!res.ok) throw new Error("Failed to update review status")
      
      setReviews(reviews.map(r => r._id === id ? { ...r, status: newStatus } : r))
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleDelete = async (id: string, productId: string) => {
    if (!confirm("Are you sure you want to delete this review?")) return

    try {
      const res = await fetch(`/api/admin/reviews?id=${id}&productId=${productId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to delete review")
      
      setReviews(reviews.filter(r => r._id !== id))
    } catch (err: any) {
      alert(err.message)
    }
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        size={14}
        className={i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}
      />
    ))
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          Error loading reviews: {error}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage customer reviews across all your products.
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-medium">
              <tr>
                <th className="px-6 py-4">Product & User</th>
                <th className="px-6 py-4">Rating & Review</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {reviews.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No reviews found.
                  </td>
                </tr>
              ) : (
                reviews.map((review) => (
                  <tr key={review._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded border border-gray-200 bg-gray-100 overflow-hidden shrink-0">
                          {review.productId?.images?.[0]?.url ? (
                            <img src={getOptimizedCloudinaryUrl(review.productId.images[0].url, { width: 96 })} alt={review.productId.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400"><MessageSquare size={16} /></div>
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium text-gray-900 truncate max-w-[200px]">{review.productId?.title || 'Unknown Product'}</span>
                          <span className="text-xs text-gray-500 mt-0.5">by <span className="font-medium">{review.userName}</span></span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex gap-0.5">{renderStars(review.rating)}</div>
                        <p className="text-gray-700 line-clamp-2" title={review.comment}>{review.comment}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          review.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {review.status === 'published' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                          {review.status === 'published' ? 'Published' : 'Pending'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleUpdateStatus(review._id, review.productId._id, review.status === 'published' ? 'pending' : 'published')}
                          className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors"
                        >
                          {review.status === 'published' ? 'Unpublish' : 'Publish'}
                        </button>
                        <button
                          onClick={() => handleDelete(review._id, review.productId._id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Review"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
