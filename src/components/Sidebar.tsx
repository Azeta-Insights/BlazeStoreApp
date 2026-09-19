import React from 'react';
import {
  ShoppingBag,
  Home,
  LayoutGrid,
  Flame,
  Sparkles,
  Award,
  Bookmark,
  Layers,
  Package,
  Heart,
  Ticket,
  MapPin,
  Settings,
  HelpCircle,
  Sun,
  Moon,
  ArrowRight,
  Database,
  User as UserIcon,
  LogIn,
  ShieldCheck,
  Crown,
  LayoutDashboard,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isDarkMode: boolean;
  setIsDarkMode: (dark: boolean) => void;
  wishlistCount: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  onOpenPromo?: () => void;
  onOpenAuth?: () => void;
  onOpenAdmin?: () => void;
  onOpenSupport?: () => void;
  currentUser?: User | null;
  dbStatus?: { connected: boolean; isUsingFallback: boolean; database: string };
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isDarkMode,
  setIsDarkMode,
  wishlistCount,
  isOpenMobile = false,
  onCloseMobile,
  onOpenPromo,
  onOpenAuth,
  onOpenAdmin,
  onOpenSupport,
  currentUser,
  dbStatus,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const mainNavItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'categories', label: 'Categories', icon: LayoutGrid },
    { id: 'deals', label: 'Deals', icon: Flame, isHot: true },
    { id: 'new-arrivals', label: 'New Arrivals', icon: Sparkles },
    { id: 'best-sellers', label: 'Best Sellers', icon: Award },
    { id: 'brands', label: 'Brands', icon: Bookmark },
    { id: 'collections', label: 'Collections', icon: Layers },
  ];

  const userNavItems: { id: string; label: string; icon: any; count?: number; badge?: string }[] = [
    { id: 'orders', label: 'My Orders', icon: Package },
    { id: 'wishlist', label: 'Wishlist', icon: Heart, count: wishlistCount },
    { id: 'coupons', label: 'Coupons', icon: Ticket },
    { id: 'addresses', label: 'Addresses', icon: MapPin },
    { id: 'settings', label: 'Account Settings', icon: Settings },
  ];

  const isOwner = currentUser?.roleType === 'owner';
  const isManager = currentUser?.roleType === 'manager';
  const isStaff = isOwner || isManager;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          id="sidebar-mobile-backdrop"
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity lg:hidden"
        />
      )}

      <aside
        id="main-sidebar"
        className={`fixed inset-y-0 left-0 z-50 flex flex-col justify-between border-r border-[#EDEDF2] transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-[72px]' : 'w-[240px]'
        } ${
          isDarkMode ? 'bg-[#18181B] text-[#EDEDF2] border-[#27272A]' : 'bg-white text-[#1F1F23]'
        } ${isOpenMobile ? 'translate-x-0 shadow-2xl !w-[240px]' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Top Header Logo & Collapse Toggle */}
        <div className={`flex items-center ${isCollapsed ? 'justify-center px-2 py-4' : 'justify-between px-5 py-5'} border-b border-[#EDEDF2]/60 dark:border-[#27272A]/60`}>
          <div
            className="flex items-center gap-3 cursor-pointer select-none"
            onClick={() => {
              if (isCollapsed && onToggleCollapse) {
                onToggleCollapse();
              } else {
                setActiveTab('home');
              }
            }}
            title={isCollapsed ? 'BlazeStore - Click to expand' : 'BlazeStore Home'}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#A78BFA] to-[#7C6FE0] text-white shadow-md shadow-[#7C6FE0]/25 shrink-0">
              <ShoppingBag className="h-5 w-5" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-[#1F1F23] to-[#7C6FE0] bg-clip-text text-transparent dark:from-white dark:to-[#A78BFA]">
                    BlazeStore
                  </span>
                </div>
                <span className="text-[10px] uppercase font-semibold tracking-wider text-[#8A8A94] block">
                  Premium Outlet
                </span>
              </div>
            )}
          </div>

          {/* Desktop Collapse Button */}
          {onToggleCollapse && !isCollapsed && (
            <button
              id="sidebar-desktop-collapse-btn"
              onClick={onToggleCollapse}
              className="hidden lg:flex p-1.5 rounded-lg text-[#8A8A94] hover:bg-[#F7F7FA] dark:hover:bg-[#27272A] hover:text-[#7C6FE0] transition"
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}

          {/* Close on mobile */}
          {onCloseMobile && (
            <button
              id="sidebar-close-btn"
              onClick={onCloseMobile}
              className="p-1.5 rounded-lg text-[#8A8A94] hover:bg-[#F7F7FA] lg:hidden"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Scrollable Navigation */}
        <div className={`flex-1 overflow-y-auto ${isCollapsed ? 'px-2 py-3' : 'px-4 py-4'} space-y-5 scrollbar-thin`}>
          {/* If collapsed, quick Expand button at top */}
          {isCollapsed && onToggleCollapse && (
            <div className="flex justify-center">
              <button
                id="sidebar-expand-pill-btn"
                onClick={onToggleCollapse}
                className="p-2 rounded-xl bg-[#7C6FE0]/10 text-[#7C6FE0] hover:bg-[#7C6FE0]/20 transition"
                title="Expand sidebar"
                aria-label="Expand sidebar"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Admin Dashboard Launch Button (ONLY rendered for Owner and Manager) */}
          {isStaff && (
            <div className="px-1">
              <button
                id="sidebar-admin-dashboard-btn"
                onClick={() => {
                  if (onOpenAdmin) onOpenAdmin();
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`w-full flex items-center ${
                  isCollapsed ? 'justify-center p-2.5' : 'justify-between p-3'
                } rounded-2xl border transition group text-left shadow-xs ${
                  isOwner
                    ? 'bg-amber-500/10 border-amber-500/30 hover:border-amber-500'
                    : 'bg-[#7C6FE0]/10 border-[#7C6FE0]/30 hover:border-[#7C6FE0]'
                }`}
                title={isCollapsed ? (isOwner ? 'Store Owner Dashboard' : 'Manager Operations Portal') : undefined}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`h-8 w-8 rounded-xl text-white flex items-center justify-center shadow-xs shrink-0 ${
                    isOwner ? 'bg-amber-500' : 'bg-[#7C6FE0]'
                  }`}>
                    {isOwner ? <Crown className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                  </div>
                  {!isCollapsed && (
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-black text-[#1F1F23] dark:text-white">
                          {isOwner ? 'Owner Dashboard' : 'Manager Dashboard'}
                        </span>
                        <span className="h-1.5 w-1.5 rounded-full bg-[#4CAF50] animate-pulse" />
                      </div>
                      <span className={`text-[10px] font-bold block truncate ${
                        isOwner ? 'text-amber-600 dark:text-amber-400' : 'text-[#7C6FE0]'
                      }`}>
                        {isOwner ? 'Executive Portal' : 'Operations Portal'}
                      </span>
                    </div>
                  )}
                </div>
                {!isCollapsed && (
                  <ArrowRight className={`h-4 w-4 group-hover:translate-x-0.5 transition-transform ${
                    isOwner ? 'text-amber-500' : 'text-[#7C6FE0]'
                  }`} />
                )}
              </button>
            </div>
          )}

          {/* Main Navigation */}
          <div>
            {!isCollapsed && (
              <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8]">
                Menu
              </div>
            )}
            <nav className="space-y-1">
              {mainNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`nav-item-${item.id}`}
                    onClick={() => {
                      setActiveTab(item.id);
                      if (onCloseMobile) onCloseMobile();
                    }}
                    title={isCollapsed ? item.label : undefined}
                    className={`flex w-full items-center ${
                      isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3.5 py-2.5'
                    } rounded-xl text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-[#7C6FE0] text-white shadow-sm shadow-[#7C6FE0]/30'
                        : isDarkMode
                        ? 'text-[#CBD5E1] hover:bg-[#27272A] hover:text-white'
                        : 'text-[#1E293B] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-[#64748B] dark:text-[#94A3B8]'}`} />
                      {!isCollapsed && <span>{item.label}</span>}
                    </div>
                    {!isCollapsed && item.isHot && (
                      <span className="rounded-full bg-[#FF4D4D] px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider animate-pulse">
                        Hot
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Account / Personal Navigation */}
          <div>
            {!isCollapsed && (
              <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8]">
                Account
              </div>
            )}
            <nav className="space-y-1">
              {userNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`nav-item-${item.id}`}
                    onClick={() => {
                      setActiveTab(item.id);
                      if (onCloseMobile) onCloseMobile();
                    }}
                    title={isCollapsed ? item.label : undefined}
                    className={`flex w-full items-center ${
                      isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3.5 py-2.5'
                    } rounded-xl text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-[#7C6FE0] text-white shadow-sm'
                        : isDarkMode
                        ? 'text-[#CBD5E1] hover:bg-[#27272A] hover:text-white'
                        : 'text-[#1E293B] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-[#64748B] dark:text-[#94A3B8]'}`} />
                      {!isCollapsed && <span>{item.label}</span>}
                    </div>
                    {!isCollapsed && item.count !== undefined && item.count > 0 && (
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#7C6FE0]/15 px-1.5 text-[11px] font-bold text-[#7C6FE0]">
                        {item.count}
                      </span>
                    )}
                    {!isCollapsed && item.badge && (
                      <span className="rounded-full bg-[#E3F2DD] px-2 py-0.5 text-[10px] font-bold text-[#2E7D32]">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Profile Button / Guest Placeholder */}
            <div className="mt-3">
              <button
                id="sidebar-sign-in-action-btn"
                onClick={onOpenAuth}
                title={
                  currentUser
                    ? `Logged in as ${currentUser.name} (${currentUser.role})`
                    : 'Guest - Click to Log In or Sign Up'
                }
                className={`w-full flex items-center ${
                  isCollapsed ? 'justify-center p-2' : 'justify-between p-2.5'
                } rounded-xl border border-[#CBD5E1] dark:border-[#27272A] bg-[#FAF9FC] dark:bg-[#202024] hover:border-[#7C6FE0] transition group text-left shadow-xs`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-8 w-8 rounded-full bg-[#7C6FE0]/15 flex items-center justify-center text-[#7C6FE0] font-bold text-xs shrink-0 overflow-hidden relative">
                    {currentUser?.avatar ? (
                      <img
                        src={currentUser.avatar}
                        alt={currentUser.name}
                        className="h-full w-full object-cover"
                      />
                    ) : currentUser ? (
                      <span>{currentUser.name.charAt(0).toUpperCase()}</span>
                    ) : (
                      <UserIcon className="h-4 w-4 text-[#64748B]" />
                    )}
                    <span
                      className={`absolute bottom-0 right-0 h-2 w-2 rounded-full ring-1 ring-white dark:ring-[#18181B] ${
                        currentUser ? 'bg-[#10B981]' : 'bg-[#94A3B8]'
                      }`}
                    />
                  </div>
                  {!isCollapsed && (
                    <div className="min-w-0 flex-1">
                      <span className="block text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] truncate">
                        {currentUser ? currentUser.name : 'Guest'}
                      </span>
                      <span className="block text-[10px] text-[#7C6FE0] font-bold truncate">
                        {currentUser ? currentUser.role : 'Click to Log In / Sign Up'}
                      </span>
                    </div>
                  )}
                </div>
                {!isCollapsed && (
                  <LogIn className="h-4 w-4 text-[#64748B] group-hover:text-[#7C6FE0] transition shrink-0" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className={`border-t border-[#CBD5E1] dark:border-[#27272A] ${isCollapsed ? 'p-2 space-y-2' : 'p-4 space-y-3'}`}>
          {/* Summer Sale Promo Card (Only when not collapsed) */}
          {!isCollapsed && (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#A78BFA] to-[#7C6FE0] p-4 text-white shadow-md">
              <div className="relative z-10">
                <span className="inline-block rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-xs">
                  Summer Sale
                </span>
                <h4 className="mt-1 text-sm font-bold leading-tight">Up to 50% Off</h4>
                <p className="mt-1 text-[11px] text-white/90 leading-snug">
                  Exclusive discounts on warm-weather fashion.
                </p>
                <button
                  id="sidebar-promo-btn"
                  onClick={() => {
                    if (onOpenPromo) onOpenPromo();
                    else setActiveTab('deals');
                  }}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-[#7C6FE0] shadow-sm transition hover:bg-white/90"
                >
                  <span>Shop Now</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              <div className="absolute -right-6 -bottom-6 h-24 w-24 rounded-full bg-white/10 blur-sm pointer-events-none" />
            </div>
          )}

          {/* Need Help Link */}
          {!isCollapsed ? (
            <button
              type="button"
              id="sidebar-help-link"
              onClick={() => {
                if (onOpenSupport) onOpenSupport();
                if (onCloseMobile) onCloseMobile();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-[#475569] dark:text-[#94A3B8] hover:text-[#7C6FE0] dark:hover:text-[#A78BFA] hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition text-left"
            >
              <HelpCircle className="h-4 w-4 shrink-0" />
              <span>Need Help? 24/7 Support</span>
            </button>
          ) : (
            <div className="flex justify-center">
              <button
                id="sidebar-help-collapsed-btn"
                onClick={() => {
                  if (onOpenSupport) onOpenSupport();
                  if (onCloseMobile) onCloseMobile();
                }}
                className="p-2 rounded-xl text-[#64748B] hover:text-[#7C6FE0] hover:bg-[#F1F5F9] dark:hover:bg-[#27272A] transition"
                title="Need Help? 24/7 Support Center"
              >
                <HelpCircle className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Light / Dark Mode Toggle */}
          {!isCollapsed ? (
            <div className="flex items-center justify-between rounded-xl bg-[#F1F5F9] dark:bg-[#27272A] p-1.5">
              <button
                id="theme-light-btn"
                onClick={() => setIsDarkMode(false)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition ${
                  !isDarkMode
                    ? 'bg-white text-[#0F172A] shadow-xs'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                <Sun className="h-3.5 w-3.5 text-[#F59E0B]" />
                <span>Light</span>
              </button>
              <button
                id="theme-dark-btn"
                onClick={() => setIsDarkMode(true)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition ${
                  isDarkMode
                    ? 'bg-[#18181B] text-[#F8FAFC] shadow-xs'
                    : 'text-[#64748B] hover:text-[#F8FAFC]'
                }`}
              >
                <Moon className="h-3.5 w-3.5 text-[#7C6FE0]" />
                <span>Dark</span>
              </button>
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                id="theme-toggle-collapsed-btn"
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 rounded-xl text-[#64748B] hover:text-[#7C6FE0] hover:bg-[#F1F5F9] dark:hover:bg-[#27272A] transition"
                title={`Switch to ${isDarkMode ? 'Light' : 'Dark'} mode`}
              >
                {isDarkMode ? <Sun className="h-4 w-4 text-[#F59E0B]" /> : <Moon className="h-4 w-4 text-[#7C6FE0]" />}
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
