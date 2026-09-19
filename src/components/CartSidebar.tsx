import React, { useState } from 'react';
import {
  Heart,
  Bell,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  Sparkles,
  ShoppingBag,
  CheckCircle2,
  CreditCard,
  X,
  Tag,
  User as UserIcon,
  Crown,
  ShieldCheck,
  LayoutDashboard
} from 'lucide-react';
import { CartItem, Product, User } from '../types';
import { YOU_MIGHT_LIKE, RECENTLY_VIEWED } from '../data/mockData';
import { UserProfileMenu } from './UserProfileMenu';
import { formatNaira } from '../lib/currency';

interface CartSidebarProps {
  cart: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveFromCart: (id: string) => void;
  onAddToCart: (product: Product) => void;
  onOpenWishlist: () => void;
  onOpenNotifications: () => void;
  onOpenCheckout: () => void;
  onOpenAuth?: () => void;
  onOpenAdmin?: () => void;
  onLogout?: () => void;
  onNavigateTab?: (tab: string) => void;
  currentUser?: User | null;
  unreadNotificationCount: number;
  wishlistCount: number;
  isDarkMode: boolean;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const CartSidebar: React.FC<CartSidebarProps> = ({
  cart,
  onUpdateQuantity,
  onRemoveFromCart,
  onAddToCart,
  onOpenWishlist,
  onOpenNotifications,
  onOpenCheckout,
  onOpenAuth = () => {},
  onOpenAdmin,
  onLogout = () => {},
  onNavigateTab = () => {},
  currentUser,
  unreadNotificationCount,
  wishlistCount,
  isDarkMode,
  isOpenMobile = false,
  onCloseMobile,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; percent: number } | null>({
    code: 'BLAZE10',
    percent: 10,
  });
  const [promoError, setPromoError] = useState('');
  const [promoSuccess, setPromoSuccess] = useState('10% Welcome Promo Applied');

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountAmount = appliedPromo ? (subtotal * appliedPromo.percent) / 100 : 0;
  const shipping = subtotal >= 50000 || subtotal === 0 ? 0 : 2500;
  const total = Math.max(0, subtotal - discountAmount + shipping);
  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    setPromoError('');
    setPromoSuccess('');

    const clean = promoCode.trim().toUpperCase();
    if (!clean) return;

    if (clean === 'BLAZE20' || clean === 'SAVE20') {
      setAppliedPromo({ code: clean, percent: 20 });
      setPromoSuccess('20% Flash Discount applied!');
      setPromoCode('');
    } else if (clean === 'SUMMER50') {
      setAppliedPromo({ code: clean, percent: 50 });
      setPromoSuccess('50% Super Promo applied!');
      setPromoCode('');
    } else if (clean === 'BLAZE10') {
      setAppliedPromo({ code: clean, percent: 10 });
      setPromoSuccess('10% Discount applied!');
      setPromoCode('');
    } else {
      setPromoError('Invalid coupon code. Try BLAZE20 or BLAZE10');
    }
  };

  const isOwner = currentUser?.roleType === 'owner';
  const isManager = currentUser?.roleType === 'manager';
  const isStaff = isOwner || isManager;

  return (
    <>
      {/* Slide-over Drawer Backdrop on screens under 1440px */}
      {isOpenMobile && (
        <div
          id="cart-mobile-backdrop"
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs 2xl:hidden transition-opacity duration-300"
        />
      )}

      <aside
        id="cart-sidebar"
        className={`fixed inset-y-0 right-0 z-50 flex w-[310px] flex-col border-l border-[#EDEDF2] transition-transform duration-300 ease-in-out ${
          isDarkMode ? 'bg-[#18181B] text-[#EDEDF2] border-[#27272A]' : 'bg-white text-[#1F1F23]'
        } ${
          isOpenMobile
            ? 'translate-x-0 shadow-2xl'
            : isCollapsed
            ? 'translate-x-full'
            : 'translate-x-full 2xl:translate-x-0'
        }`}
      >
        {/* Top Header Row: Wishlist, Notification Bell, User Avatar & Name */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-[#EDEDF2]/60 dark:border-[#27272A]/60">
          <div className="flex items-center gap-1.5">
            {/* Desktop Wide Collapse Button */}
            {onToggleCollapse && (
              <button
                id="cart-desktop-collapse-btn"
                onClick={onToggleCollapse}
                className="hidden 2xl:flex p-1.5 rounded-lg text-[#8A8A94] hover:bg-[#F7F7FA] dark:hover:bg-[#27272A] hover:text-[#7C6FE0] transition"
                title="Collapse cart panel"
                aria-label="Collapse cart panel"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            )}

            {/* Wishlist Button */}
            <button
              id="header-wishlist-btn"
              onClick={onOpenWishlist}
              className="relative p-2 rounded-xl text-[#52525B] hover:bg-[#F7F7FA] dark:text-[#A1A1AA] dark:hover:bg-[#27272A] transition"
              title="View Wishlist"
            >
              <Heart className="h-5 w-5" />
              {wishlistCount > 0 && (
                <span className="absolute 0 top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#FF4D4D] text-[10px] font-bold text-white">
                  {wishlistCount}
                </span>
              )}
            </button>

            {/* Notification Bell */}
            <button
              id="header-notification-btn"
              onClick={onOpenNotifications}
              className="relative p-2 rounded-xl text-[#52525B] hover:bg-[#F7F7FA] dark:text-[#A1A1AA] dark:hover:bg-[#27272A] transition"
              title="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadNotificationCount > 0 && (
                <span className="absolute 0 top-1.5 right-1.5 flex h-2.5 w-2.5 rounded-full bg-[#FF4D4D] ring-2 ring-white dark:ring-[#18181B]" />
              )}
            </button>
          </div>

          {/* User Profile Dropdown */}
          <div className="flex items-center gap-1.5">
            <UserProfileMenu
              currentUser={currentUser}
              onOpenAuth={onOpenAuth}
              onLogout={onLogout}
              onNavigateTab={onNavigateTab}
              onOpenWishlist={onOpenWishlist}
              onOpenAdmin={onOpenAdmin}
              isDarkMode={isDarkMode}
              align="right"
            />

            {/* Close drawer on screens under 1440px */}
            {onCloseMobile && (
              <button
                id="cart-close-mobile-btn"
                onClick={onCloseMobile}
                className="p-1.5 rounded-lg text-[#8A8A94] hover:bg-[#F7F7FA] dark:hover:bg-[#27272A] 2xl:hidden ml-1"
                aria-label="Close cart drawer"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Admin Portal Access Bar (ONLY FOR OWNER & MANAGER) */}
        {isStaff && (
          <div className="px-5 pt-2">
            <button
              id="cart-admin-dashboard-btn"
              onClick={onOpenAdmin}
              className={`w-full flex items-center justify-between p-2 rounded-xl transition text-left border ${
                isOwner
                  ? 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30'
                  : 'bg-[#7C6FE0]/10 hover:bg-[#7C6FE0]/20 border-[#7C6FE0]/25'
              }`}
            >
              <div className="flex items-center gap-2">
                {isOwner ? (
                  <Crown className="h-3.5 w-3.5 text-amber-500" />
                ) : (
                  <ShieldCheck className="h-3.5 w-3.5 text-[#7C6FE0]" />
                )}
                <span className={`text-[11px] font-bold ${isOwner ? 'text-amber-600 dark:text-amber-400' : 'text-[#7C6FE0]'}`}>
                  {isOwner ? 'Owner Executive Portal' : 'Manager Operations Portal'}
                </span>
              </div>
              <ArrowRight className={`h-3.5 w-3.5 ${isOwner ? 'text-amber-500' : 'text-[#7C6FE0]'}`} />
            </button>
          </div>
        )}

        {/* Cart Title & Header */}
        <div className="flex items-center justify-between px-5 pt-3 pb-2">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-[#7C6FE0]" />
            <h3 className="font-bold text-base">My Cart</h3>
            <span className="rounded-full bg-[#7C6FE0]/15 px-2 py-0.5 text-xs font-bold text-[#7C6FE0]">
              {totalItemsCount}
            </span>
          </div>
          {cart.length > 0 && (
            <span className="text-[11px] font-medium text-[#4CAF50] bg-[#E3F2DD] px-2 py-0.5 rounded-md">
              Free Express Shipping
            </span>
          )}
        </div>

        {/* Scrollable Cart Content */}
        <div className="flex-1 overflow-y-auto px-5 py-2 space-y-4 scrollbar-thin">
          {/* Cart Item List */}
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F1F5F9] dark:bg-[#27272A] text-[#64748B] dark:text-[#94A3B8] mb-3">
                <ShoppingBag className="h-8 w-8" />
              </div>
              <p className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Your cart is empty</p>
              <p className="text-xs font-medium text-[#475569] dark:text-[#94A3B8] mt-1 max-w-[200px]">
                Explore our catalog to add items to your cart.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div
                  key={item.id}
                  id={`cart-item-${item.id}`}
                  className="flex gap-3 rounded-xl border border-[#CBD5E1] dark:border-[#27272A] p-2.5 bg-white dark:bg-[#212124] transition hover:border-[#7C6FE0]/60 shadow-xs"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    referrerPolicy="no-referrer"
                    className="h-16 w-16 flex-shrink-0 rounded-lg object-cover bg-[#F1F5F9]"
                  />
                  <div className="flex flex-1 flex-col justify-between">
                    <div className="flex items-start justify-between gap-1">
                      <div>
                        <h4 className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] line-clamp-1 leading-snug">
                          {item.name}
                        </h4>
                        <span className="text-[10px] font-semibold text-[#475569] dark:text-[#94A3B8] block">
                          {item.variant}
                        </span>
                      </div>
                      <button
                        id={`cart-remove-btn-${item.id}`}
                        onClick={() => onRemoveFromCart(item.id)}
                        className="text-[#64748B] hover:text-[#DC2626] dark:text-[#94A3B8] p-0.5 rounded transition"
                        title="Remove item"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs font-extrabold text-[#7C6FE0]">
                          {formatNaira(item.price * item.quantity)}
                        </span>
                        {item.originalPrice && (
                          <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] line-through font-medium">
                            {formatNaira(item.originalPrice * item.quantity)}
                          </span>
                        )}
                      </div>

                      {/* Quantity Stepper */}
                      <div className="flex items-center rounded-lg border border-[#CBD5E1] dark:border-[#27272A] bg-[#F8FAFC] dark:bg-[#18181B]">
                        <button
                          id={`qty-dec-${item.id}`}
                          onClick={() => onUpdateQuantity(item.id, -1)}
                          className="px-1.5 py-0.5 text-xs text-[#334155] dark:text-[#CBD5E1] hover:text-[#7C6FE0] transition"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="px-1.5 text-xs font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">{item.quantity}</span>
                        <button
                          id={`qty-inc-${item.id}`}
                          onClick={() => onUpdateQuantity(item.id, 1)}
                          className="px-1.5 py-0.5 text-xs text-[#334155] dark:text-[#CBD5E1] hover:text-[#7C6FE0] transition"
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Promo Code Input */}
          <div className="rounded-xl border border-[#CBD5E1] dark:border-[#27272A] p-3 bg-white dark:bg-[#1E1E22]">
            <form onSubmit={handleApplyPromo} className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#64748B] dark:text-[#94A3B8]" />
                <input
                  type="text"
                  id="promo-code-input"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="Promo code (e.g. BLAZE20)"
                  className="w-full rounded-lg bg-[#F1F5F9] dark:bg-[#27272A] pl-8 pr-2 py-1.5 text-xs font-bold uppercase placeholder:normal-case placeholder:text-[#64748B] dark:placeholder:text-[#94A3B8] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-1 focus:ring-[#7C6FE0]"
                />
              </div>
              <button
                type="submit"
                id="apply-promo-btn"
                className="rounded-lg bg-[#7C6FE0] px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#6D60D6] transition"
              >
                Apply
              </button>
            </form>
            {promoSuccess && (
              <div className="mt-1.5 flex items-center gap-1 text-[11px] font-bold text-[#16A34A]">
                <CheckCircle2 className="h-3 w-3" />
                <span>{promoSuccess}</span>
              </div>
            )}
            {promoError && (
              <p className="mt-1 text-[11px] font-bold text-[#DC2626]">{promoError}</p>
            )}
          </div>

          {/* Order Summary */}
          <div className="rounded-xl border border-[#CBD5E1] dark:border-[#27272A] p-3.5 space-y-2 text-xs bg-[#F8FAFC] dark:bg-[#1E1E22]">
            <div className="flex justify-between text-[#475569] dark:text-[#94A3B8] font-semibold">
              <span>Subtotal</span>
              <span className="font-extrabold text-[#0F172A] dark:text-white">
                {formatNaira(subtotal)}
              </span>
            </div>

            {appliedPromo && discountAmount > 0 && (
              <div className="flex justify-between text-[#DC2626] font-semibold">
                <span>Discount ({appliedPromo.percent}%)</span>
                <span className="font-extrabold">-{formatNaira(discountAmount)}</span>
              </div>
            )}

            <div className="flex justify-between text-[#475569] dark:text-[#94A3B8] font-semibold">
              <span>Delivery</span>
              <span className="font-extrabold text-[#16A34A]">
                {shipping === 0 ? 'FREE' : formatNaira(shipping)}
              </span>
            </div>

            <div className="border-t border-[#CBD5E1] dark:border-[#27272A] pt-2 flex justify-between text-sm font-black text-[#0F172A] dark:text-white">
              <span>Total (NGN)</span>
              <span className="text-[#7C6FE0] font-black">{formatNaira(total)}</span>
            </div>

            {/* Full-width Checkout Button */}
            <button
              id="cart-checkout-btn"
              onClick={onOpenCheckout}
              disabled={cart.length === 0}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#A78BFA] to-[#7C6FE0] py-2.5 text-xs font-bold text-white shadow-md shadow-[#7C6FE0]/30 transition hover:opacity-95 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            {/* Payment Method Badges */}
            <div className="flex items-center justify-center gap-1.5 pt-2 text-[10px] text-[#475569] dark:text-[#94A3B8] flex-wrap">
              <span className="rounded bg-white dark:bg-[#27272A] px-1.5 py-0.5 font-bold border border-[#CBD5E1] dark:border-[#333]">
                VERVE
              </span>
              <span className="rounded bg-white dark:bg-[#27272A] px-1.5 py-0.5 font-bold border border-[#CBD5E1] dark:border-[#333]">
                VISA
              </span>
              <span className="rounded bg-white dark:bg-[#27272A] px-1.5 py-0.5 font-bold border border-[#CBD5E1] dark:border-[#333]">
                MASTERCARD
              </span>
              <span className="rounded bg-white dark:bg-[#27272A] px-1.5 py-0.5 font-bold border border-[#CBD5E1] dark:border-[#333]">
                BANK TRANSFER
              </span>
              <span className="rounded bg-white dark:bg-[#27272A] px-1.5 py-0.5 font-bold border border-[#CBD5E1] dark:border-[#333]">
                USSD
              </span>
            </div>
          </div>

          {/* You Might Also Like */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8]">
                You might also like
              </h4>
            </div>
            <div className="space-y-2">
              {YOU_MIGHT_LIKE.map((prod) => (
                <div
                  key={prod.id}
                  className="flex items-center justify-between gap-2.5 rounded-xl border border-[#CBD5E1] dark:border-[#27272A] p-2 bg-white dark:bg-[#1E1E22] transition hover:border-[#7C6FE0]/40 shadow-xs"
                >
                  <img
                    src={prod.image}
                    alt={prod.name}
                    referrerPolicy="no-referrer"
                    className="h-10 w-10 rounded-lg object-cover bg-[#F1F5F9]"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] truncate leading-tight">{prod.name}</p>
                    <p className="text-[11px] font-extrabold text-[#7C6FE0]">
                      {formatNaira(prod.price)}
                    </p>
                  </div>
                  <button
                    id={`add-mini-item-${prod.id}`}
                    onClick={() => onAddToCart(prod)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#7C6FE0]/15 text-[#7C6FE0] hover:bg-[#7C6FE0] hover:text-white transition"
                    title="Quick add to cart"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Recently Viewed */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-2">
              Recently Viewed
            </h4>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {RECENTLY_VIEWED.map((item) => (
                <div
                  key={item.id}
                  className="group relative flex-shrink-0 cursor-pointer"
                  title={`${item.name} - $${item.price}`}
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    referrerPolicy="no-referrer"
                    className="h-12 w-12 rounded-full object-cover border-2 border-white dark:border-[#27272A] ring-1 ring-[#CBD5E1] dark:ring-[#333] transition group-hover:scale-105"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Join BlazeStore Club Card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#A78BFA] to-[#7C6FE0] p-4 text-white shadow-md">
            <div className="relative z-10 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <Sparkles className="h-4 w-4 text-yellow-300" />
                <span>Join BlazeStore Club</span>
              </div>
              <p className="text-[11px] text-white/90 leading-tight">
                Get 5% cashback on all orders, free express delivery & member-only drops.
              </p>
              <button
                id="join-club-btn"
                onClick={onOpenAuth}
                className="w-full rounded-xl bg-white py-1.5 text-center text-xs font-bold text-[#7C6FE0] shadow-sm transition hover:bg-white/95"
              >
                {currentUser ? 'View Club Membership' : 'Join Now & Sign Up'}
              </button>
            </div>
            <div className="absolute -right-4 -bottom-4 h-20 w-20 rounded-full bg-white/10 blur-xs pointer-events-none" />
          </div>
        </div>
      </aside>
    </>
  );
};
