import React, { useState } from 'react';
import { X, Star, ShoppingBag, Heart, ShieldCheck, Truck, RotateCcw, Check, Sparkles, MessageSquare } from 'lucide-react';
import { Product } from '../types';
import { FrequentlyBoughtTogether } from './FrequentlyBoughtTogether';
import { ProductReviewsSection } from './ProductReviewsSection';
import { formatNaira } from '../lib/currency';

interface QuickViewModalProps {
  product: Product | null;
  allProducts?: Product[];
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, selectedColor?: string, quantity?: number) => void;
  isWishlisted: boolean;
  onToggleWishlist: (product: Product) => void;
  isDarkMode: boolean;
  onShowToast?: (msg: string) => void;
}

export const QuickViewModal: React.FC<QuickViewModalProps> = ({
  product,
  allProducts = [],
  isOpen,
  onClose,
  onAddToCart,
  isWishlisted,
  onToggleWishlist,
  isDarkMode,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'bundle' | 'reviews'>('details');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  if (!isOpen || !product) return null;

  const activeColor = selectedColor || (product.colors && product.colors[0]) || '';

  const handleAdd = () => {
    onAddToCart(product, activeColor, quantity);
    setJustAdded(true);
    setTimeout(() => {
      setJustAdded(false);
      onClose();
    }, 900);
  };

  const handleAddBundleToCart = (bundleItems: Product[]) => {
    bundleItems.forEach((p) => {
      onAddToCart(p, p.colors?.[0] || '', 1);
    });
    onShowToast?.(`🎉 Added all ${bundleItems.length} items with bundle discount to your cart!`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        id="quickview-backdrop"
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
      />

      {/* Modal Card */}
      <div
        id="quickview-modal-content"
        className={`relative z-10 w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl transition-all my-6 ${
          isDarkMode ? 'bg-[#18181B] text-white border border-[#27272A]' : 'bg-white text-[#1F1F23]'
        }`}
      >
        {/* Top Header & Navigation Tabs */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-3.5 bg-white/95 dark:bg-[#18181B]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'details'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Product Overview
            </button>
            <button
              onClick={() => setActiveTab('bundle')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                activeTab === 'bundle'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Bundle & Save (10%)</span>
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                activeTab === 'reviews'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Reviews</span>
            </button>
          </div>

          <button
            id="quickview-close-btn"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab 1: Product Overview */}
        {activeTab === 'details' && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Product Image */}
              <div className="relative bg-slate-100 dark:bg-slate-800/60 p-6 flex items-center justify-center rounded-2xl">
                {product.badge && (
                  <span className="absolute top-4 left-4 rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-bold text-white shadow-xs">
                    {product.badge}
                  </span>
                )}
                <img
                  src={product.image}
                  alt={product.name}
                  referrerPolicy="no-referrer"
                  className="max-h-72 w-full object-contain rounded-xl"
                />
              </div>

              {/* Details Column */}
              <div className="flex flex-col justify-between space-y-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    {product.category}
                  </span>
                  <h3 className="text-lg sm:text-xl font-bold mt-1 text-slate-900 dark:text-white leading-snug">
                    {product.name}
                  </h3>

                  {/* Rating */}
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() => setActiveTab('reviews')}
                      className="flex items-center gap-1.5 text-amber-500 hover:opacity-80 transition cursor-pointer"
                    >
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3.5 w-3.5 ${
                              i < Math.floor(product.rating ?? 5) ? 'fill-amber-500 text-amber-500' : 'text-slate-300 dark:text-slate-600'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                        {product.rating !== undefined ? product.rating : 4.8}
                      </span>
                      <span className="text-xs font-medium text-slate-500 underline">
                        ({product.reviewCount !== undefined ? product.reviewCount : 12} reviews)
                      </span>
                    </button>
                  </div>

                  {/* Price */}
                  <div className="mt-3 flex items-baseline gap-2 flex-wrap">
                    <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                      {formatNaira(product.price ?? 0)}
                    </span>
                    {product.originalPrice != null && (
                      <span className="text-sm text-slate-400 line-through font-semibold">
                        {formatNaira(Number(product.originalPrice))}
                      </span>
                    )}
                    {product.discountPercentage && (
                      <span className="text-xs font-extrabold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded">
                        Save {product.discountPercentage}%
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="mt-3 text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                    {product.description ||
                      'Crafted with premium materials for unmatched comfort, longevity, and modern aesthetics.'}
                  </p>

                  {/* Color Options */}
                  {product.colors && product.colors.length > 0 && (
                    <div className="mt-4">
                      <span className="text-xs font-bold text-slate-900 dark:text-white block mb-1.5">
                        Select Color:
                      </span>
                      <div className="flex items-center gap-2">
                        {product.colors.map((hex, idx) => (
                          <button
                            key={idx}
                            onClick={() => setSelectedColor(hex)}
                            className={`h-6 w-6 rounded-full border-2 transition-all ${
                              activeColor === hex
                                ? 'border-indigo-600 ring-2 ring-indigo-600/40 scale-110'
                                : 'border-white dark:border-slate-800 opacity-80 hover:opacity-100'
                            }`}
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center gap-3">
                    {/* Quantity Controls */}
                    <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 p-1 bg-slate-100 dark:bg-slate-800">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="px-2.5 py-1 text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600"
                      >
                        -
                      </button>
                      <span className="px-3 text-xs font-extrabold text-slate-900 dark:text-white">{quantity}</span>
                      <button
                        onClick={() => setQuantity(quantity + 1)}
                        className="px-2.5 py-1 text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600"
                      >
                        +
                      </button>
                    </div>

                    {/* Add To Cart */}
                    <button
                      id="modal-add-cart-btn"
                      onClick={handleAdd}
                      className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold text-white shadow-md transition cursor-pointer ${
                        justAdded
                          ? 'bg-emerald-600'
                          : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'
                      }`}
                    >
                      {justAdded ? (
                        <>
                          <Check className="h-4 w-4" />
                          <span>Added to Cart!</span>
                        </>
                      ) : (
                        <>
                          <ShoppingBag className="h-4 w-4" />
                          <span>Add to Cart • {formatNaira(product.price * quantity)}</span>
                        </>
                      )}
                    </button>

                    {/* Wishlist Button */}
                    <button
                      onClick={() => onToggleWishlist(product)}
                      className={`p-2.5 rounded-xl border transition cursor-pointer ${
                        isWishlisted
                          ? 'bg-rose-500 text-white border-transparent'
                          : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                      title="Wishlist"
                    >
                      <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-current' : ''}`} />
                    </button>
                  </div>

                  {/* Guarantees */}
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 pt-1 flex-wrap gap-2">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> 100% Authentic
                    </span>
                    <span className="flex items-center gap-1">
                      <Truck className="h-3.5 w-3.5 text-indigo-600" /> Fast Delivery in Nigeria
                    </span>
                    <span className="flex items-center gap-1">
                      <RotateCcw className="h-3.5 w-3.5 text-sky-600" /> 7-Day Money Back
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* In-view Cross Sells */}
            {allProducts.length > 0 && (
              <FrequentlyBoughtTogether
                mainProduct={product}
                allProducts={allProducts}
                onAddBundleToCart={handleAddBundleToCart}
              />
            )}
          </div>
        )}

        {/* Tab 2: Frequently Bought Together Bundle */}
        {activeTab === 'bundle' && (
          <div className="p-6">
            <FrequentlyBoughtTogether
              mainProduct={product}
              allProducts={allProducts}
              onAddBundleToCart={handleAddBundleToCart}
            />
          </div>
        )}

        {/* Tab 3: Customer Reviews */}
        {activeTab === 'reviews' && (
          <div className="p-6">
            <ProductReviewsSection product={product} onShowToast={onShowToast} />
          </div>
        )}
      </div>
    </div>
  );
};

