"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Star, Loader2 } from "lucide-react";

interface ReviewFormProps {
  slug: string;
  onSuccess: () => void;
}

export default function ReviewForm({ slug, onSuccess }: ReviewFormProps) {
  const { data: session } = useSession();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!session) {
    return (
      <div className="p-12 border border-white/5 text-center space-y-8 bg-[#0d0d0d] relative">
        <div className="absolute top-0 left-0 bg-white text-black label-tiny px-2 py-0.5" style={{ fontSize: '7px' }}>AUTH_REQ</div>
        <p className="label-tiny text-[#555] pt-4">IDENTITY VERIFICATION REQUIRED FOR SUBMISSION.</p>
        <button 
          onClick={() => window.location.href = '/login'}
          className="btn-pill-primary mx-auto"
        >
          SIGN IN
        </button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setError("RATING_REQUIRED_FOR_ENTRY.");
      return;
    }
    if (comment.length < 10) {
      setError("COMMENT_LENGTH_INSUFFICIENT.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/store/products/${slug}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rating, comment }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Submission failed");
      }

      setRating(0);
      setComment("");
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-10 border border-white/5 bg-[#0d0d0d] relative">
      <div className="absolute top-0 left-0 bg-white text-black label-tiny px-2 py-0.5" style={{ fontSize: '7px' }}>ENTRY_FORM / 001</div>
      
      <h3 className="font-serif text-4xl text-white tracking-tight mb-12 mt-6">
        Share <span className="italic text-[#555]">Feedback.</span>
      </h3>

      <form onSubmit={handleSubmit} className="space-y-12">
        {/* Star Rating */}
        <div className="space-y-6">
          <label className="label-tiny text-[#333] block border-b border-white/5 pb-2">RATING_LEVEL: [{rating || hoverRating || '—'}]</label>
          <div className="flex gap-6">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
                className="transition-transform active:scale-90"
              >
                <Star
                  size={28}
                  className={`transition-all duration-500 ${
                    star <= (hoverRating || rating)
                      ? "fill-white text-white"
                      : "text-white/5 hover:text-white/20"
                  }`}
                  strokeWidth={1}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Comment */}
        <div className="space-y-6">
          <label className="label-tiny text-[#333] block border-b border-white/5 pb-2">NARRATIVE_LOG</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="DOCUMENT YOUR EXPERIENCE..."
            className="w-full h-48 bg-[#0a0a0a] border border-white/5 p-8 label-tiny text-white/60 focus:outline-none focus:border-white/20 transition-all placeholder:text-white/10"
          />
        </div>

        {error && (
          <p className="label-tiny text-red-500 bg-red-500/5 p-4 border border-red-500/20">
            ERR: {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-pill-primary w-full h-16 justify-center disabled:opacity-30"
        >
          {isSubmitting ? (
            <>PROCESSING... <Loader2 className="animate-spin ml-2" size={14} /></>
          ) : (
            <>COMMIT FEEDBACK</>
          )}
        </button>
      </form>
    </div>
  );
}
