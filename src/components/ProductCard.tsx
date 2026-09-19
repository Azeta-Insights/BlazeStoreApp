import React, { useState } from 'react';
import { Heart, Star, ShoppingBag, Plus, Check } from 'lucide-react';
import { Product } from '../types';
import { formatNaira } from '../lib/currency';

interface ProductCardProps {
  product: Product;
  isWishlisted: boolean;
  onToggleWishlist: (product: Product) => void;
  onAddToCart: (product: Product, selectedColor?: string) => void;
  onQuickView?: (product: Product) => void;
  showColorSwatches?: boolean;
  showAddButton?: boolean;
  isDarkMode?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isWishlisted,
  onToggleWishlist,
  onAddToCart,
  onQuickView,
  showColorSwatches = false,
  showAddButton = true,
  isDarkMode = false,
}) => {
  const [selectedColor, setSelectedColor] = useState<string>(
    product.selectedColor || (product.colors && product.colors[0]) || ''
  );
  const [isAddedRecently, setIsAddedRecently] = useState(false);

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart(product, selectedColor);
    setIsAddedRecently(true);
    setTimeout(() => setIsAddedRecently(false), 1200);
  };

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleWishlist(product);
  };

  return (
    <div
      id={`product-card-${product.id}`}
      onClick={() => onQuickView && onQuickView(product)}
      className={`group relative flex flex-col justify-between rounded-2xl p-3.5 transition-all duration-200 cursor-pointer ${
        isDarkMode
          ? 'bg-[#1E1E22] border border-[#27272A] hover:border-[#7C6FE0]/60 hover:shadow-lg'
          : 'bg-white border border-[#E2E8F0] hover:border-[#7C6FE0]/50 hover:shadow-md'
      }`}
    >
      <div>
        {/* Product Image Container */}
        <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-[#F1F5F9] dark:bg-[#27272A]">
          {/* Discount / Hot Badge */}
          {product.badge && (
            <div className="absolute top-2.5 left-2.5 z-10">
              <span className="inline-flex items-center rounded-lg bg-[#FF4D4D] px-2 py-0.5 text-[11px] font-extrabold text-white shadow-xs">
                {product.badge}
              </span>
            </div>
          )}

          {/* Wishlist Heart Button */}
          <button
            id={`wishlist-btn-${product.id}`}
            onClick={handleWishlistClick}
            className={`absolute top-2.5 right-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md transition-transform duration-200 active:scale-90 ${
              isWishlisted
                ? 'bg-[#FF4D4D] text-white shadow-sm'
                : 'bg-white/90 text-[#475569] hover:text-[#FF4D4D] hover:bg-white shadow-xs'
            }`}
            title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
            aria-label="Wishlist toggle"
          >
            <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-current' : ''}`} />
          </button>

          {/* Image */}
          <img
            src={product.image}
            alt={product.name}
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />

          {/* Quick View overlay on hover (desktop) */}
          <div className="absolute inset-x-0 bottom-2 px-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100 hidden sm:block">
            <span className="flex w-full items-center justify-center rounded-lg bg-black/70 py-1.5 text-[11px] font-bold text-white backdrop-blur-xs">
              Quick Details
            </span>
          </div>
        </div>

        {/* Product Info */}
        <div className="pt-3 space-y-1">
          {/* Category */}
          <span className="text-[11px] font-bold text-[#475569] dark:text-[#94A3B8] block uppercase tracking-wider">
            {product.category}
          </span>

          {/* Name */}
          <h4
            className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC] line-clamp-1 group-hover:text-[#7C6FE0] transition-colors"
            title={product.name}
          >
            {product.name}
          </h4>

          {/* Rating */}
          <div className="flex items-center gap-1 text-[11px]">
            <div className="flex items-center text-[#F59E0B]">
              <Star className="h-3.5 w-3.5 fill-current" />
            </div>
            <span className="font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
              {product.rating !== undefined ? product.rating : 4.8}
            </span>
            <span className="font-medium text-[#475569] dark:text-[#94A3B8]">
              ({product.reviewCount !== undefined ? product.reviewCount : 12})
            </span>
          </div>

          {/* Color Swatches if enabled */}
          {showColorSwatches && product.colors && product.colors.length > 0 && (
            <div className="flex items-center gap-1.5 pt-1" onClick={(e) => e.stopPropagation()}>
              {product.colors.map((hex, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedColor(hex)}
                  className={`h-4 w-4 rounded-full border transition-all ${
                    selectedColor === hex
                      ? 'ring-2 ring-[#7C6FE0] ring-offset-1 scale-110'
                      : 'border-black/20 opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: hex }}
                  title={`Color: ${hex}`}
                  aria-label={`Select color ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pricing & Add To Cart Button */}
      <div className="pt-3 flex items-center justify-between border-t border-[#E2E8F0] dark:border-[#27272A] mt-2">
        <div className="flex flex-col">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-sm sm:text-base font-extrabold text-[#7C6FE0]">
              {formatNaira(product.price)}
            </span>
            {product.originalPrice && (
              <span className="text-xs text-[#64748B] dark:text-[#94A3B8] line-through font-semibold">
                {formatNaira(product.originalPrice)}
              </span>
            )}
          </div>
        </div>

        {/* Circular Add to Cart Button */}
        {showAddButton && (
          <button
            id={`add-cart-btn-${product.id}`}
            onClick={handleAddClick}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 ${
              isAddedRecently
                ? 'bg-[#4CAF50] text-white scale-110'
                : 'bg-[#7C6FE0]/15 text-[#7C6FE0] hover:bg-[#7C6FE0] hover:text-white shadow-xs'
            }`}
            title="Add to cart"
            aria-label="Add to cart"
          >
            {isAddedRecently ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  );
};
