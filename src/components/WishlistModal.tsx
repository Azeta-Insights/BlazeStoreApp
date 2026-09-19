import React from 'react';
import { X, Heart, ShoppingBag, Trash2 } from 'lucide-react';
import { Product } from '../types';
import { formatNaira } from '../lib/currency';

interface WishlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  wishlist: Product[];
  onRemoveFromWishlist: (product: Product) => void;
  onMoveToCart: (product: Product) => void;
  isDarkMode: boolean;
}

export const WishlistModal: React.FC<WishlistModalProps> = ({
  isOpen,
  onClose,
  wishlist,
  onRemoveFromWishlist,
  onMoveToCart,
  isDarkMode,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        id="wishlist-backdrop"
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
      />

      <div
        id="wishlist-modal-content"
        className={`relative z-10 w-full max-w-lg overflow-hidden rounded-2xl p-5 shadow-2xl transition-all ${
          isDarkMode ? 'bg-[#18181B] text-white border border-[#27272A]' : 'bg-white text-[#1F1F23]'
        }`}
      >
        <div className="flex items-center justify-between border-b border-[#EDEDF2] dark:border-[#27272A] pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FF4D4D]/15 text-[#FF4D4D]">
              <Heart className="h-4 w-4 fill-current" />
            </div>
            <div>
              <h3 className="font-bold text-base">My Wishlist</h3>
              <span className="text-[11px] text-[#8A8A94]">
                {wishlist.length} saved {wishlist.length === 1 ? 'item' : 'items'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#8A8A94] hover:bg-[#F7F7FA] dark:hover:bg-[#27272A]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3 max-h-96 overflow-y-auto">
          {wishlist.length === 0 ? (
            <div className="py-10 text-center text-[#8A8A94] text-xs">
              Your wishlist is empty. Tap the heart icon on any product to save it here!
            </div>
          ) : (
            wishlist.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-[#EDEDF2] dark:border-[#27272A] p-2.5 bg-[#FAF9FC] dark:bg-[#27272A]"
              >
                <img
                  src={item.image}
                  alt={item.name}
                  referrerPolicy="no-referrer"
                  className="h-14 w-14 rounded-lg object-cover bg-white"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold truncate leading-tight">{item.name}</h4>
                  <span className="text-[11px] font-bold text-[#7C6FE0] block mt-0.5">
                    {formatNaira(item.price)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      onMoveToCart(item);
                      onRemoveFromWishlist(item);
                    }}
                    className="flex items-center gap-1 rounded-lg bg-[#7C6FE0] px-2.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#6D60D6] transition"
                  >
                    <ShoppingBag className="h-3 w-3" />
                    <span>Move to Cart</span>
                  </button>
                  <button
                    onClick={() => onRemoveFromWishlist(item)}
                    className="p-1.5 text-[#8A8A94] hover:text-[#FF4D4D] rounded-lg transition"
                    title="Remove from wishlist"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
