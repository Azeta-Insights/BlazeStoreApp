import React, { useState, useRef, useEffect } from 'react';
import {
  User as UserIcon,
  Package,
  Heart,
  Ticket,
  MapPin,
  Settings,
  LogOut,
  LogIn,
  Crown,
  ShieldCheck,
  ChevronDown,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { User } from '../types';

interface UserProfileMenuProps {
  currentUser?: User | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onNavigateTab: (tab: string) => void;
  onOpenWishlist: () => void;
  onOpenAdmin?: () => void;
  isDarkMode: boolean;
  align?: 'left' | 'right';
  className?: string;
}

export const UserProfileMenu: React.FC<UserProfileMenuProps> = ({
  currentUser,
  onOpenAuth,
  onLogout,
  onNavigateTab,
  onOpenWishlist,
  onOpenAdmin,
  isDarkMode,
  align = 'right',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isOwner = currentUser?.roleType === 'owner';
  const isManager = currentUser?.roleType === 'manager';
  const isStaff = isOwner || isManager;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const userName = currentUser?.name || 'Guest';
  const displayName = currentUser ? currentUser.name.split(' ')[0] : 'Guest';
  const userEmail = currentUser?.email || 'Not signed in';
  const userRole = currentUser ? currentUser.role : 'Guest Visitor';

  return (
    <div className={`relative inline-block text-left ${className}`} ref={menuRef}>
      {/* Trigger Pill Button */}
      <button
        id="profile-pill-dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition shadow-xs hover:border-[#7C6FE0] ${
          currentUser
            ? isOwner
              ? 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'
              : isManager
              ? 'border-[#7C6FE0]/40 bg-[#7C6FE0]/10 text-[#7C6FE0]'
              : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
            : isDarkMode
            ? 'border-[#27272A] bg-[#1E1E22] text-[#94A3B8] hover:text-white'
            : 'border-[#CBD5E1] bg-white text-[#64748B] hover:text-[#0F172A]'
        }`}
        aria-expanded={isOpen}
        aria-haspopup="true"
        title={currentUser ? `Account: ${userName}` : 'Guest Visitor (Click to Sign In)'}
      >
        <div className="relative">
          {currentUser?.avatar ? (
            <img
              src={currentUser.avatar}
              alt={userName}
              referrerPolicy="no-referrer"
              className="h-6 w-6 rounded-full object-cover ring-1 ring-white/50 dark:ring-black/50"
            />
          ) : (
            <div className={`flex h-6 w-6 items-center justify-center rounded-full ${
              currentUser ? 'bg-[#7C6FE0] text-white text-[11px] font-extrabold' : 'bg-[#7C6FE0]/15 text-[#7C6FE0]'
            }`}>
              {currentUser ? displayName.charAt(0) : <UserIcon className="h-3.5 w-3.5" />}
            </div>
          )}
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-1 ring-white dark:ring-[#18181B] ${
              currentUser ? 'bg-[#10B981]' : 'bg-[#94A3B8]'
            }`}
          />
        </div>

        <span className="max-w-[80px] sm:max-w-[100px] truncate">
          {currentUser ? displayName : 'Guest'}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-[#64748B] transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#7C6FE0]' : ''
          }`}
        />
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div
          id="profile-dropdown-menu"
          className={`absolute ${
            align === 'right' ? 'right-0' : 'left-0'
          } mt-2 w-64 origin-top-right rounded-2xl border shadow-xl z-50 p-2 animate-fade-in ${
            isDarkMode
              ? 'bg-[#18181B] border-[#27272A] text-[#EDEDF2]'
              : 'bg-white border-[#EDEDF2] text-[#1F1F23]'
          }`}
        >
          {/* User Profile Header Card */}
          <div className="px-3 py-3 rounded-xl bg-[#FAF9FC] dark:bg-[#202024] border border-[#EDEDF2] dark:border-[#27272A] mb-2">
            <div className="flex items-center gap-2.5">
              <div className="relative shrink-0">
                {currentUser?.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt={userName}
                    referrerPolicy="no-referrer"
                    className="h-10 w-10 rounded-full object-cover ring-2 ring-[#7C6FE0]/30"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#7C6FE0]/15 text-[#7C6FE0] font-bold text-sm">
                    <UserIcon className="h-5 w-5" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className="font-extrabold text-xs text-[#0F172A] dark:text-white truncate block">
                    {userName}
                  </span>
                  {isOwner && <Crown className="h-3 w-3 text-amber-500 shrink-0" />}
                  {isManager && <ShieldCheck className="h-3 w-3 text-[#7C6FE0] shrink-0" />}
                </div>
                <span className="text-[10px] text-[#8A8A94] block truncate">{userEmail}</span>
                <span
                  className={`inline-block mt-0.5 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-full ${
                    isOwner
                      ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                      : isManager
                      ? 'bg-[#7C6FE0]/20 text-[#7C6FE0]'
                      : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {userRole}
                </span>
              </div>
            </div>
          </div>

          {/* Admin Switcher (If Staff) */}
          {isStaff && (
            <div className="mb-2">
              <button
                id="profile-dropdown-admin-btn"
                onClick={() => {
                  setIsOpen(false);
                  if (onOpenAdmin) onOpenAdmin();
                }}
                className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-bold transition ${
                  isOwner
                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25'
                    : 'bg-[#7C6FE0]/15 text-[#7C6FE0] hover:bg-[#7C6FE0]/25'
                }`}
              >
                <div className="flex items-center gap-2">
                  {isOwner ? <Crown className="h-4 w-4 text-amber-500" /> : <ShieldCheck className="h-4 w-4" />}
                  <span>{isOwner ? 'Executive Owner Portal' : 'Store Operations Portal'}</span>
                </div>
                <ExternalLink className="h-3.5 w-3.5 opacity-60" />
              </button>
            </div>
          )}

          {/* Nav List */}
          <div className="space-y-0.5 text-xs font-semibold">
            <button
              id="profile-dropdown-orders-link"
              onClick={() => {
                setIsOpen(false);
                onNavigateTab('orders');
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[#52525B] dark:text-[#A1A1AA] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[#1F1F23] dark:hover:text-white transition text-left"
            >
              <Package className="h-4 w-4 text-[#7C6FE0]" />
              <span>My Orders & Tracking</span>
            </button>

            <button
              id="profile-dropdown-wishlist-link"
              onClick={() => {
                setIsOpen(false);
                onOpenWishlist();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[#52525B] dark:text-[#A1A1AA] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[#1F1F23] dark:hover:text-white transition text-left"
            >
              <Heart className="h-4 w-4 text-[#FF4D4D]" />
              <span>Saved Wishlist</span>
            </button>

            <button
              id="profile-dropdown-coupons-link"
              onClick={() => {
                setIsOpen(false);
                onNavigateTab('coupons');
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[#52525B] dark:text-[#A1A1AA] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[#1F1F23] dark:hover:text-white transition text-left"
            >
              <Ticket className="h-4 w-4 text-[#10B981]" />
              <span>My Coupons & Offers</span>
            </button>

            <button
              id="profile-dropdown-addresses-link"
              onClick={() => {
                setIsOpen(false);
                onNavigateTab('addresses');
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[#52525B] dark:text-[#A1A1AA] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[#1F1F23] dark:hover:text-white transition text-left"
            >
              <MapPin className="h-4 w-4 text-[#F59E0B]" />
              <span>Shipping Addresses</span>
            </button>

            <button
              id="profile-dropdown-settings-link"
              onClick={() => {
                setIsOpen(false);
                onNavigateTab('settings');
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[#52525B] dark:text-[#A1A1AA] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[#1F1F23] dark:hover:text-white transition text-left"
            >
              <Settings className="h-4 w-4 text-[#8A8A94]" />
              <span>Account Settings</span>
            </button>
          </div>

          <div className="my-1.5 border-t border-[#EDEDF2] dark:border-[#27272A]" />

          {/* Sign In or Sign Out Action */}
          {currentUser ? (
            <button
              id="profile-dropdown-signout-btn"
              onClick={() => {
                setIsOpen(false);
                onLogout();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-500/10 font-bold text-xs transition text-left"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out ({displayName})</span>
            </button>
          ) : (
            <button
              id="profile-dropdown-signin-btn"
              onClick={() => {
                setIsOpen(false);
                onOpenAuth();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[#7C6FE0] hover:bg-[#7C6FE0]/10 font-bold text-xs transition text-left"
            >
              <LogIn className="h-4 w-4" />
              <span>Log In / Create Account</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
