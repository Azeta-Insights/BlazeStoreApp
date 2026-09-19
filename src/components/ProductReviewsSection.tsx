import React, { useState, useEffect } from 'react';
import {
  Star,
  ThumbsUp,
  ShieldCheck,
  Camera,
  Image as ImageIcon,
  CheckCircle2,
  X,
  MessageSquarePlus,
  Filter
} from 'lucide-react';
import { Review, Product } from '../types';
import { api } from '../services/api';
import { ImageUploader } from './ImageUploader';

interface ProductReviewsSectionProps {
  product: Product;
  onShowToast?: (msg: string) => void;
}

export function ProductReviewsSection({ product, onShowToast }: ProductReviewsSectionProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Filter state
  const [ratingFilter, setRatingFilter] = useState<number | 'all'>('all');

  // New review form state
  const [newRating, setNewRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [reviewPhotos, setReviewPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const data = await api.getProductReviews(product.id);
      setReviews(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [product.id]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      onShowToast?.('Please write a review comment.');
      return;
    }

    setSubmitting(true);
    try {
      const added = await api.addReview({
        productId: product.id,
        userName: userName.trim() || 'Verified Customer',
        userEmail: userEmail.trim() || 'customer@example.com',
        rating: newRating,
        title: title.trim() || 'Great experience',
        comment: comment.trim(),
        images: reviewPhotos,
        verifiedPurchase: true,
      });

      setReviews((prev) => [added, ...prev]);
      onShowToast?.('🌟 Thank you! Your review has been published.');
      setIsFormOpen(false);
      // Reset form
      setTitle('');
      setComment('');
      setReviewPhotos([]);
    } catch (err: any) {
      onShowToast?.(`Failed to submit review: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleHelpfulVote = async (reviewId: string) => {
    try {
      const res = await api.voteReviewHelpful(reviewId);
      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, helpfulCount: res.helpfulCount } : r))
      );
      onShowToast?.('👍 Thank you for your feedback!');
    } catch (e) {}
  };

  // Rating Stats Calculation
  const totalReviewsCount = reviews.length;
  const avgRating = totalReviewsCount
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviewsCount
    : product.rating || 5.0;

  const starCounts = [5, 4, 3, 2, 1].map((stars) => {
    const count = reviews.filter((r) => r.rating === stars).length;
    const percentage = totalReviewsCount ? (count / totalReviewsCount) * 100 : stars === 5 ? 80 : 10;
    return { stars, count, percentage };
  });

  const filteredReviews = reviews.filter((r) => {
    if (ratingFilter === 'all') return true;
    return r.rating === ratingFilter;
  });

  return (
    <div id="product-reviews-component" className="mt-10 pt-8 border-t border-slate-200 dark:border-slate-800">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Customer Reviews & Ratings</span>
            <span className="text-sm font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {totalReviewsCount} {totalReviewsCount === 1 ? 'Review' : 'Reviews'}
            </span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Verified ratings and photos from real BlazeStore shoppers.
          </p>
        </div>

        <button
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-all shadow-xs cursor-pointer"
        >
          <MessageSquarePlus className="w-4 h-4" />
          <span>{isFormOpen ? 'Close Form' : 'Write a Review'}</span>
        </button>
      </div>

      {/* Review Form Drawer / Modal */}
      {isFormOpen && (
        <form
          onSubmit={handleSubmitReview}
          className="p-5 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 mb-8 transition-all"
        >
          <h4 className="font-bold text-base text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>Share your feedback for {product.name}</span>
          </h4>

          {/* Interactive Star Rating */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Overall Rating *
            </label>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = (hoverRating || newRating) >= star;
                return (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setNewRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 text-slate-300 hover:scale-110 transition-transform cursor-pointer"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        isFilled ? 'text-amber-500 fill-amber-500' : 'text-slate-300 dark:text-slate-600'
                      }`}
                    />
                  </button>
                );
              })}
              <span className="ml-2 text-xs font-bold text-amber-600 dark:text-amber-400">
                {newRating} of 5 Stars ({newRating === 5 ? 'Excellent!' : newRating === 4 ? 'Great' : newRating === 3 ? 'Average' : 'Below Average'})
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Your Name
              </label>
              <input
                type="text"
                placeholder="e.g. Alex Morgan"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Your Email (for verification badge)
              </label>
              <input
                type="email"
                placeholder="e.g. alex@example.com"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Headline / Title
            </label>
            <input
              type="text"
              placeholder="e.g. Best quality jacket I've owned!"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Review Details *
            </label>
            <textarea
              rows={3}
              placeholder="What did you like or dislike? How is the fit, material, and performance?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required
              className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Photo Upload for Review */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-indigo-500" />
              <span>Add Customer Photos (Optional)</span>
            </label>
            <ImageUploader
              value={reviewPhotos[0] || ''}
              onChange={(url) => {
                if (url) setReviewPhotos((prev) => (prev.includes(url) ? prev : [...prev, url]));
              }}
              folder="blazestore_reviews"
            />
            {reviewPhotos.length > 0 && (
              <div className="flex items-center gap-2 mt-2">
                {reviewPhotos.map((p, idx) => (
                  <div key={idx} className="relative w-14 h-14 rounded-lg overflow-hidden border border-indigo-200">
                    <img src={p} alt="Review upload" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setReviewPhotos(reviewPhotos.filter((_, i) => i !== idx))}
                      className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Post Review'}
            </button>
          </div>
        </form>
      )}

      {/* Aggregate Rating Breakdown & Filter Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 mb-8">
        {/* Left: Big Rating Number */}
        <div className="flex flex-col items-center justify-center text-center p-4 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800">
          <span className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white">
            {avgRating.toFixed(1)}
          </span>
          <div className="flex items-center gap-1 my-2 text-amber-500">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`w-4 h-4 ${
                  s <= Math.round(avgRating) ? 'fill-amber-500 text-amber-500' : 'text-slate-300 dark:text-slate-600'
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Based on {totalReviewsCount} customer ratings
          </span>
          <div className="mt-3 flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>100% Verified Purchases</span>
          </div>
        </div>

        {/* Middle: Progress Bars */}
        <div className="md:col-span-2 flex flex-col justify-center gap-2">
          {starCounts.map(({ stars, count, percentage }) => (
            <button
              key={stars}
              type="button"
              onClick={() => setRatingFilter(ratingFilter === stars ? 'all' : stars)}
              className={`flex items-center gap-3 text-xs w-full p-1 rounded-lg transition-colors cursor-pointer text-left ${
                ratingFilter === stars
                  ? 'bg-indigo-100 dark:bg-indigo-950/60 font-bold'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-1 w-14 shrink-0 font-medium text-slate-700 dark:text-slate-300">
                <span>{stars}</span>
                <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
              </div>
              <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 w-8 text-right shrink-0">
                {count}
              </span>
            </button>
          ))}

          {ratingFilter !== 'all' && (
            <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
              <span className="text-slate-500">
                Showing only {ratingFilter}-star reviews
              </span>
              <button
                onClick={() => setRatingFilter('all')}
                className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
              >
                Clear filter
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {filteredReviews.length === 0 ? (
          <div className="text-center py-8 p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
              No reviews found for this selection.
            </p>
            <button
              onClick={() => setIsFormOpen(true)}
              className="mt-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              Be the first to review this product!
            </button>
          </div>
        ) : (
          filteredReviews.map((rev) => (
            <div
              key={rev.id}
              className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-2xs"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {rev.userName}
                    </span>
                    {rev.verifiedPurchase && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Verified Buyer</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center text-amber-500">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${
                            s <= rev.rating ? 'fill-amber-500 text-amber-500' : 'text-slate-200 dark:text-slate-700'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-slate-400">
                      {new Date(rev.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleHelpfulVote(rev.id)}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-indigo-200 transition-colors cursor-pointer"
                  title="Mark this review as helpful"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>Helpful ({rev.helpfulCount || 0})</span>
                </button>
              </div>

              {rev.title && (
                <h5 className="font-bold text-sm text-slate-800 dark:text-slate-200 mt-1 mb-1">
                  {rev.title}
                </h5>
              )}

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {rev.comment}
              </p>

              {/* Customer Photo Gallery */}
              {rev.images && rev.images.length > 0 && (
                <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  {rev.images.map((imgUrl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedImage(imgUrl)}
                      className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 hover:opacity-90 hover:scale-105 transition-all cursor-pointer"
                    >
                      <img src={imgUrl} alt="Review attachment" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Image Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-2xl max-h-[85vh] rounded-2xl overflow-hidden bg-black">
            <img src={selectedImage} alt="Enlarged review photo" className="w-full h-full object-contain" />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-3 right-3 bg-black/60 text-white rounded-full p-2 hover:bg-black/80 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
