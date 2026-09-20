import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  SlidersHorizontal,
  Menu,
  ShoppingBag,
  Heart,
  Bell,
  ArrowRight,
  Sparkles,
  ChevronRight,
  Filter,
  Check,
  X,
  Database,
  User as UserIcon,
  LogIn,
  UserCheck,
  Shuffle,
  Compass,
  LogOut,
  LayoutDashboard,
  ShieldCheck,
  Crown,
  ShieldAlert
} from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { CartSidebar } from './components/CartSidebar';
import { HeroBanner } from './components/HeroBanner';
import { CategoryNav } from './components/CategoryNav';
import { PromoTiles } from './components/PromoTiles';
import { ProductCard } from './components/ProductCard';
import { TrustBadges } from './components/TrustBadges';
import { QuickViewModal } from './components/QuickViewModal';
import { CheckoutModal } from './components/CheckoutModal';
import { NotificationsModal } from './components/NotificationsModal';
import { WishlistModal } from './components/WishlistModal';
import { AuthModal } from './components/AuthModal';
import { OwnerDashboard } from './components/admin/OwnerDashboard';
import { ManagerDashboard } from './components/admin/ManagerDashboard';
import { SupportModal } from './components/SupportModal';
import { UserProfileMenu } from './components/UserProfileMenu';
import { HeaderSearchBar } from './components/HeaderSearchBar';
import { StoreViews } from './components/StoreViews';
import { AnnouncementBar } from './components/AnnouncementBar';
import { OrderTrackingModal } from './components/OrderTrackingModal';
import { InvoiceModal } from './components/InvoiceModal';
import { AddressBookModal } from './components/AddressBookModal';
import { Product, CartItem, NotificationItem, User, AnnouncementConfig, Order } from './types';
import { api, DbStatus, saveLocalInventoryCache, getCachedProducts } from './services/api';
import { auth } from './lib/firebase';
import { onAuthStateChanged, onIdTokenChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { getRoleForEmail, subscribeProductsFromFirestore } from './services/firestoreService';
import { matchProductCategory } from './utils/categoryMatcher';

export default function App() {
  // Page Routing: 'store' | 'owner_dashboard' | 'manager_dashboard'
  const [currentPage, setCurrentPage] = useState<'store' | 'owner_dashboard' | 'manager_dashboard'>('store');

  // Navigation & View state
  const [activeTab, setActiveTab] = useState<string>('home');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Persisted Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('blazestore_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  // Database & Backend Status
  const [dbStatus, setDbStatus] = useState<DbStatus | null>(null);

  // User Authentication State: initialized from persistent browser storage
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('blazestore_user') : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.email) return parsed;
      }
    } catch {}
    return null;
  });
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);

  // Mobile Drawers & Desktop Collapsible Panels state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState<boolean>(false);
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState<boolean>(false);
  const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState<boolean>(false);

  // Modals state
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState<boolean>(false);
  const [isSupportOpen, setIsSupportOpen] = useState<boolean>(false);
  const [isTrackingOpen, setIsTrackingOpen] = useState<boolean>(false);
  const [trackingOrderId, setTrackingOrderId] = useState<string>('');
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);
  const [isAddressBookOpen, setIsAddressBookOpen] = useState<boolean>(false);

  // Announcement bar config
  const [announcementConfig, setAnnouncementConfig] = useState<AnnouncementConfig>({
    enabled: true,
    text: '⚡ Summer Mega Sale: Use code SUMMER50 for 50% OFF your entire cart! Free delivery on orders over $50.',
    linkText: 'Copy SUMMER50',
    linkAction: 'coupon:SUMMER50',
    badge: 'FLASH DEAL',
  });

  // Products from Store API / Firestore
  const [dealsProducts, setDealsProducts] = useState<Product[]>([]);
  const [recProducts, setRecProducts] = useState<Product[]>([]);

  // Cart, Wishlist & Notifications state (synced with browser localStorage & Firestore)
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('blazestore_cart');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const [wishlist, setWishlist] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('blazestore_wishlist');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  };

  // Synchronize Dark Mode Class on document root & localStorage
  useEffect(() => {
    try {
      localStorage.setItem('blazestore_theme', isDarkMode ? 'dark' : 'light');
    } catch {
      // Ignore localStorage issues
    }
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Persist visitor cart to localStorage immediately whenever changed
  useEffect(() => {
    try {
      localStorage.setItem('blazestore_cart', JSON.stringify(cart));
    } catch {}
  }, [cart]);

  // Persist visitor wishlist to localStorage immediately whenever changed
  useEffect(() => {
    try {
      localStorage.setItem('blazestore_wishlist', JSON.stringify(wishlist));
    } catch {}
  }, [wishlist]);

  // Combined product list
  const allProducts = useMemo(() => {
    const map = new Map<string, Product>();
    [...dealsProducts, ...recProducts].forEach((p) => {
      if (!map.has(p.id)) map.set(p.id, p);
    });
    return Array.from(map.values());
  }, [dealsProducts, recProducts]);

  // Product state loader & sync function
  const refreshStoreProducts = async () => {
    try {
      const bootstrap = await api.getBootstrap();
      if (bootstrap) {
        if (bootstrap.dbStatus) setDbStatus(bootstrap.dbStatus);
        const allProds = bootstrap.products || [...(bootstrap.deals || []), ...(bootstrap.recommended || [])];
        let deals: Product[] = [];
        let rec: Product[] = [];

        if (allProds && allProds.length > 0) {
          deals = (bootstrap.deals && bootstrap.deals.length > 0)
            ? bootstrap.deals
            : allProds.filter((p) => p.isDeal || p.isHot || (p.discountPercentage && p.discountPercentage >= 15));
          rec = (bootstrap.recommended && bootstrap.recommended.length > 0)
            ? bootstrap.recommended
            : allProds.filter((p) => !deals.some((d) => d.id === p.id));

          if (deals.length === 0 && allProds.length > 0) {
            const mid = Math.ceil(allProds.length / 2);
            deals = allProds.slice(0, mid);
            rec = allProds.slice(mid);
          }
          setDealsProducts(deals);
          setRecProducts(rec);
          saveLocalInventoryCache(allProds);
        } else {
          // If server returned 0 items temporarily, preserve local cached items if available
          const cached = getCachedProducts();
          if (cached && cached.length > 0) {
            const cDeals = cached.filter((p) => p.isDeal || p.isHot || (p.discountPercentage && p.discountPercentage >= 15));
            const cRec = cached.filter((p) => !cDeals.some((d) => d.id === p.id));
            setDealsProducts(cDeals.length > 0 ? cDeals : cached.slice(0, Math.ceil(cached.length / 2)));
            setRecProducts(cRec.length > 0 ? cRec : cached.slice(Math.ceil(cached.length / 2)));
          }
        }

        if (bootstrap.announcement) setAnnouncementConfig(bootstrap.announcement);
        if (bootstrap.notifications && bootstrap.notifications.length > 0) setNotifications(bootstrap.notifications);
        if (bootstrap.currentUser) setCurrentUser(bootstrap.currentUser);
      }
    } catch (err) {
      console.warn('Store product sync:', err);
    }
  };

  // Re-sync catalog when switching back to storefront or on inventory updates
  useEffect(() => {
    if (currentPage === 'store') {
      refreshStoreProducts();
    }
  }, [currentPage]);

  // Live Firestore subscription for real-time storefront synchronization
  useEffect(() => {
    const unsubscribe = subscribeProductsFromFirestore(
      (items) => {
        if (items && items.length > 0) {
          const deals = items.filter(
            (p) => p.isDeal || p.isHot || (p.discountPercentage && p.discountPercentage >= 15)
          );
          const rec = items.filter((p) => !deals.some((d) => d.id === p.id));
          setDealsProducts(deals.length > 0 ? deals : items.slice(0, Math.ceil(items.length / 2)));
          setRecProducts(rec.length > 0 ? rec : items.slice(Math.ceil(items.length / 2)));
          saveLocalInventoryCache(items);
        }
      },
      (err) => {
        console.warn('Real-time products sync active with server API fallback:', err?.message || err);
        refreshStoreProducts();
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Listen to custom global product update events dispatched by CSV import or inventory edits
  useEffect(() => {
    const handleProductsUpdated = (e?: any) => {
      if (e?.detail?.products && Array.isArray(e.detail.products) && e.detail.products.length > 0) {
        const prods: Product[] = e.detail.products;
        const deals = prods.filter(
          (p) => p.isDeal || p.isHot || (p.discountPercentage && p.discountPercentage >= 15)
        );
        const rec = prods.filter((p) => !deals.some((d) => d.id === p.id));
        setDealsProducts(deals.length > 0 ? deals : prods.slice(0, Math.ceil(prods.length / 2)));
        setRecProducts(rec.length > 0 ? rec : prods.slice(Math.ceil(prods.length / 2)));
        saveLocalInventoryCache(prods);
      }
      refreshStoreProducts();
    };
    window.addEventListener('blazestore:products_updated', handleProductsUpdated);
    return () => {
      window.removeEventListener('blazestore:products_updated', handleProductsUpdated);
    };
  }, []);

  // Consolidated Initial Bootstrap Data Load
  useEffect(() => {
    async function initData() {
      // 1. Instantaneous offline/cache hydration from localStorage
      try {
        const cached = localStorage.getItem('blazestore_bootstrap_cache');
        if (cached) {
          const parsed = JSON.parse(cached)?.data;
          if (parsed) {
            if (parsed.dbStatus) setDbStatus(parsed.dbStatus);
            if (Array.isArray(parsed.deals) && parsed.deals.length > 0) {
              setDealsProducts(parsed.deals);
            }
            if (Array.isArray(parsed.recommended) && parsed.recommended.length > 0) {
              setRecProducts(parsed.recommended);
            }
            if (parsed.announcement) setAnnouncementConfig(parsed.announcement);
          }
        }
      } catch {}

      // 2. Fetch fresh consolidated bootstrap data
      await refreshStoreProducts();
    }

    initData();

    // 3. Inspect URL for Paystack callback redirect (reference / trxref / paystack_ref)
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const paystackRef = urlParams.get('reference') || urlParams.get('trxref') || urlParams.get('paystack_ref');
      if (paystackRef) {
        // Clean URL to prevent re-triggering
        window.history.replaceState({}, document.title, window.location.pathname);
        (async () => {
          showToast('⏳ Verifying Paystack transaction status...');
          try {
            const verifyRes = await api.verifyPaystack(paystackRef);
            if (verifyRes && verifyRes.paid) {
              // Retrieve pending order if stored before redirect
              try {
                const rawPending = localStorage.getItem('blazestore_pending_order');
                if (rawPending) {
                  const pending = JSON.parse(rawPending);
                  await api.placeOrder({
                    orderId: `NG-${Date.now().toString().slice(-6)}`,
                    customer: {
                      name: pending.customer?.name || 'Customer',
                      email: pending.customer?.email || verifyRes.customer?.email || '',
                      phone: pending.customer?.phone || '',
                      address: pending.customer?.address || '',
                      city: pending.customer?.city || '',
                      state: pending.customer?.state || '',
                      country: 'Nigeria',
                    },
                    currency: 'NGN',
                    currencySymbol: '₦',
                    items: pending.items || [],
                    subtotal: pending.total || (verifyRes.amount ? verifyRes.amount / 100 : 0),
                    discount: 0,
                    shipping: 0,
                    total: pending.total || (verifyRes.amount ? verifyRes.amount / 100 : 0),
                    paymentMethod: 'Paystack Gateway',
                    paymentStatus: 'paid',
                    paymentReference: paystackRef,
                    paystackData: verifyRes,
                    userId: currentUser?.id || 'guest',
                  });
                  localStorage.removeItem('blazestore_pending_order');
                }
              } catch (pendingErr) {
                console.warn('Pending order sync error:', pendingErr);
              }

              setCart([]);
              localStorage.removeItem('blazestore_cart');
              showToast(`🎉 Real-Time Paystack Payment Verified! (Ref: ${paystackRef})`);
            } else {
              showToast(`ℹ️ Paystack status: ${verifyRes?.gatewayResponse || verifyRes?.error || 'Verification incomplete'}`);
            }
          } catch (e) {
            console.warn('Paystack redirect verify error:', e);
          }
        })();
      }
    } catch {}
  }, []);

  // Firebase Auth State & Token Refresh Listener to sync user and tokens across refreshes
  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (fbUser) => {
      if (fbUser && !fbUser.isAnonymous) {
        try {
          const token = await fbUser.getIdToken();
          localStorage.setItem('blazestore_jwt_token', token);
        } catch {}

        const { role, roleType } = getRoleForEmail(fbUser.email || '');
        const roleTitle = roleType === 'owner' ? 'Store Owner' : roleType === 'manager' ? 'Store Manager' : role;

        setCurrentUser((prev) => {
          const updated: User = {
            id: fbUser.uid,
            name: fbUser.displayName || prev?.name || (fbUser.email ? fbUser.email.split('@')[0] : 'User'),
            email: fbUser.email || prev?.email || '',
            phone: fbUser.phoneNumber || prev?.phone || '',
            role: roleTitle,
            roleType: roleType,
            createdAt: prev?.createdAt || new Date().toISOString(),
            totalOrders: prev?.totalOrders || 0,
            totalSpent: prev?.totalSpent || 0,
          };
          try {
            localStorage.setItem('blazestore_user', JSON.stringify(updated));
          } catch {}
          return updated;
        });
      }
    });

    return () => unsubscribe();
  }, []);

  // Auth Success Handler: user stays on Storefront with quick admin badges enabled
  const handleAuthSuccess = async (user: User, isNewRegistration: boolean) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('blazestore_user', JSON.stringify(user));
    } catch {}

    if (isNewRegistration) {
      showToast(`Welcome to BlazeStore, ${user.name}! 🎉`);
    } else {
      showToast(`Welcome back, ${user.name}! ${user.roleType === 'owner' ? '👑 (Owner Hub Available)' : user.roleType === 'manager' ? '🛡️ (Manager Hub Available)' : ''}`);
    }
    // Refresh notifications & db stats
    const notifs = await api.getNotifications();
    if (notifs) setNotifications(notifs);
    const status = await api.getDbStatus();
    if (status) setDbStatus(status);
    await refreshStoreProducts();
  };

  // Logout Handler: clear auth session without affecting store inventory or dashboard data
  const handleLogout = async () => {
    try {
      localStorage.removeItem('blazestore_user');
      localStorage.removeItem('blazestore_jwt_token');
      await firebaseSignOut(auth).catch(() => {});
      await api.logout().catch(() => {});
    } catch {}
    setCurrentUser(null);
    setCurrentPage('store');
    showToast('Signed out. You are now browsing as a guest visitor.');
  };

  // Randomize / Shuffle catalog for guest visitors
  const handleShuffleProducts = () => {
    const shuffle = (array: Product[]) => {
      const copy = [...array];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    };
    setDealsProducts((prev) => shuffle(prev));
    setRecProducts((prev) => shuffle(prev));
    showToast('🎲 Showcase randomized! Browsing random discovery feed.');
  };

  // Cart Handlers
  const handleAddToCart = async (product: Product, selectedColor?: string, quantity: number = 1) => {
    const newItem: Partial<CartItem> = {
      productId: product.id,
      name: product.name,
      price: product.price,
      originalPrice: product.originalPrice,
      image: product.image,
      variant: selectedColor
        ? `${selectedColor} / Standard`
        : product.variant || 'Standard Edition',
      color: selectedColor,
      quantity: quantity,
    };

    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.productId === product.id && (!selectedColor || item.color === selectedColor)
      );
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity,
        };
        return updated;
      }
      return [
        {
          id: `cart-${Date.now()}-${product.id}`,
          productId: product.id,
          name: product.name,
          price: product.price,
          originalPrice: product.originalPrice,
          image: product.image,
          variant: newItem.variant || 'Standard Edition',
          color: selectedColor,
          quantity: quantity,
        },
        ...prev,
      ];
    });

    showToast(`Added "${product.name}" to cart`);

    try {
      const updatedCart = await api.addToCart(newItem);
      if (updatedCart) setCart(updatedCart);
    } catch (e) {
      console.warn('Cart sync warning:', e);
    }
  };

  const handleUpdateQuantity = async (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );

    try {
      const updatedCart = await api.updateCartQuantity(id, delta);
      if (updatedCart) setCart(updatedCart);
    } catch (e) {
      console.warn('Quantity update sync warning:', e);
    }
  };

  const handleRemoveFromCart = async (id: string) => {
    const item = cart.find((i) => i.id === id);
    setCart((prev) => prev.filter((i) => i.id !== id));
    if (item) showToast(`Removed "${item.name}" from cart`);

    try {
      const updatedCart = await api.removeFromCart(id);
      if (updatedCart) setCart(updatedCart);
    } catch (e) {
      console.warn('Remove item sync warning:', e);
    }
  };

  const handleClearCart = async () => {
    setCart([]);
    try {
      await api.clearCart();
    } catch (e) {
      console.warn('Clear cart sync warning:', e);
    }
  };

  // Wishlist Handlers
  const isWishlisted = (productId: string) => wishlist.some((item) => item.id === productId);

  const handleToggleWishlist = async (product: Product) => {
    const isCurrentlySaved = isWishlisted(product.id);
    if (isCurrentlySaved) {
      setWishlist((prev) => prev.filter((item) => item.id !== product.id));
      showToast(`Removed "${product.name}" from wishlist`);
    } else {
      setWishlist((prev) => [product, ...prev]);
      showToast(`Saved "${product.name}" to wishlist ❤️`);
    }

    try {
      const updatedWishlist = await api.toggleWishlist(product);
      if (updatedWishlist) setWishlist(updatedWishlist);
    } catch (e) {
      console.warn('Wishlist sync warning:', e);
    }
  };

  // Place Order Handler
  const handlePlaceOrder = async (orderData: any) => {
    try {
      const order = await api.placeOrder({
        ...orderData,
        userId: currentUser?.id || 'guest-visitor',
        userEmail: currentUser?.email || orderData.email || 'guest@blazestore.com',
      });
      showToast('Order placed successfully! 🎉');
      const notifs = await api.getNotifications();
      if (notifs) setNotifications(notifs);
      return order;
    } catch (e) {
      console.warn('Order place sync error:', e);
      return { orderId: `BZ-${Math.floor(1000 + Math.random() * 9000)}` };
    }
  };

  // Mark all notifications read
  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    showToast('All notifications marked as read');
    try {
      const updated = await api.markNotificationsRead();
      if (updated) setNotifications(updated);
    } catch (e) {
      console.warn('Notifications read sync warning:', e);
    }
  };

  // Refresh DB Status Handler
  const handleRefreshDbStatus = async () => {
    try {
      const status = await api.getDbStatus();
      setDbStatus(status);
      if (status.connected) {
        showToast('Store online & connected 🟢');
      } else {
        showToast('Store system connected');
      }
    } catch (e) {
      console.warn('Status refresh error:', e);
    }
  };

  // Filtered Products Calculation
  const filteredBestDeals = useMemo(() => {
    return dealsProducts.filter((p) => {
      const matchSearch =
        !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = matchProductCategory(p.category, selectedCategory);
      return matchSearch && matchCat;
    });
  }, [dealsProducts, searchQuery, selectedCategory]);

  const filteredRecommended = useMemo(() => {
    return recProducts.filter((p) => {
      const matchSearch =
        !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = matchProductCategory(p.category, selectedCategory);
      return matchSearch && matchCat;
    });
  }, [recProducts, searchQuery, selectedCategory]);

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;
  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const isOwner = currentUser?.roleType === 'owner';
  const isManager = currentUser?.roleType === 'manager';
  const isStaff = isOwner || isManager;

  // --- ROLE-BASED ACCESS CONTROL & PAGE DISPATCH ---

  // 1. STORE OWNER DASHBOARD VIEW
  if (currentPage === 'owner_dashboard') {
    // Security check: Only Owner has access to Owner Dashboard
    if (!isOwner) {
      return (
        <div className={`min-h-screen flex items-center justify-center p-4 font-sans ${isDarkMode ? 'bg-[#0E0E11] text-white' : 'bg-[#F7F7FA] text-[#1F1F23]'}`}>
          <div className="max-w-md w-full rounded-3xl border border-red-500/30 bg-white dark:bg-[#18181B] p-8 text-center shadow-2xl space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-black">Access Restricted</h2>
            <p className="text-xs text-[#8A8A94] leading-relaxed">
              The <strong>Store Owner Dashboard</strong> requires Super Admin credentials. You are currently signed in as <strong>{currentUser?.name || 'Guest'}</strong> ({currentUser?.role || 'Visitor'}).
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setCurrentPage('store')}
                className="flex-1 rounded-xl bg-[#7C6FE0] py-2.5 text-xs font-bold text-white shadow-md hover:opacity-90 transition"
              >
                Return to Storefront
              </button>
              {isManager && (
                <button
                  onClick={() => setCurrentPage('manager_dashboard')}
                  className="flex-1 rounded-xl border border-[#7C6FE0] py-2.5 text-xs font-bold text-[#7C6FE0] hover:bg-[#7C6FE0]/10 transition"
                >
                  Go to Manager Hub
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <OwnerDashboard
        currentUser={currentUser}
        onBackToStore={() => setCurrentPage('store')}
        onSwitchToManagerDashboard={() => setCurrentPage('manager_dashboard')}
        onLogout={handleLogout}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
      />
    );
  }

  // 2. STORE MANAGER DASHBOARD VIEW
  if (currentPage === 'manager_dashboard') {
    // Security check: Owner and Manager have access to Manager Dashboard
    if (!isStaff) {
      return (
        <div className={`min-h-screen flex items-center justify-center p-4 font-sans ${isDarkMode ? 'bg-[#0E0E11] text-white' : 'bg-[#F7F7FA] text-[#1F1F23]'}`}>
          <div className="max-w-md w-full rounded-3xl border border-red-500/30 bg-white dark:bg-[#18181B] p-8 text-center shadow-2xl space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-black">Staff Credentials Required</h2>
            <p className="text-xs text-[#8A8A94] leading-relaxed">
              The <strong>Store Manager Portal</strong> is reserved for operations management. Please sign in with an authorized Manager or Owner account.
            </p>
            <div className="pt-2">
              <button
                onClick={() => setCurrentPage('store')}
                className="w-full rounded-xl bg-[#7C6FE0] py-2.5 text-xs font-bold text-white shadow-md hover:opacity-90 transition"
              >
                Return to Storefront
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <ManagerDashboard
        currentUser={currentUser}
        onBackToStore={() => setCurrentPage('store')}
        onLogout={handleLogout}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
      />
    );
  }

  // 3. STOREFRONT VIEW (For Customers & Guests, with accessible portals for Staff)
  return (
    <div
      className={`min-h-screen font-sans ${
        isDarkMode ? 'bg-[#121214] text-[#EDEDF2]' : 'bg-[#F7F7FA] text-[#1F1F23]'
      }`}
    >
      {/* Toast Popup Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2 rounded-xl bg-[#1F1F23] dark:bg-white px-4 py-2.5 text-xs font-semibold text-white dark:text-[#1F1F23] shadow-xl animate-fade-in">
          <Check className="h-4 w-4 text-[#4CAF50]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. LEFT SIDEBAR */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'wishlist') setIsWishlistOpen(true);
        }}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        wishlistCount={wishlist.length}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        isCollapsed={isLeftSidebarCollapsed}
        onToggleCollapse={() => setIsLeftSidebarCollapsed((prev) => !prev)}
        onOpenPromo={() => {
          setSelectedCategory('all');
          setActiveTab('deals');
          showToast('Showing Summer Mega Deals 🔥');
        }}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenAdmin={() => {
          if (isOwner) setCurrentPage('owner_dashboard');
          else if (isManager) setCurrentPage('manager_dashboard');
          else setIsAuthOpen(true);
        }}
        onOpenSupport={() => setIsSupportOpen(true)}
        currentUser={currentUser}
        dbStatus={
          dbStatus
            ? {
                connected: dbStatus.connected,
                isUsingFallback: dbStatus.isUsingFallback,
                database: dbStatus.database,
              }
            : undefined
        }
      />

      {/* 2. CENTER MAIN CONTENT */}
      <div className={`flex flex-col min-h-screen transition-all duration-300 ${
        isLeftSidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-[240px]'
      } ${
        isRightSidebarCollapsed ? '2xl:pr-0' : '2xl:pr-[310px]'
      }`}>
        {/* Sitewide Promotional Announcement Bar */}
        <AnnouncementBar
          config={announcementConfig}
          onApplyCoupon={(code) => showToast(`🎟️ Copied ${code} to clipboard!`)}
          onNavigateToDeals={() => {
            setActiveTab('deals');
            setSelectedCategory('all');
          }}
        />

        {/* Mobile Header Bar (< lg) */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#EDEDF2] dark:border-[#27272A] bg-white/95 dark:bg-[#18181B]/95 px-4 py-3 backdrop-blur-md lg:hidden">
          <div className="flex items-center gap-3">
            <button
              id="mobile-menu-btn"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-1.5 rounded-lg text-[#52525B] dark:text-[#A1A1AA] hover:bg-[#F7F7FA] dark:hover:bg-[#27272A]"
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7C6FE0] text-white">
                <ShoppingBag className="h-4 w-4" />
              </div>
              <span className="font-extrabold tracking-tight text-base bg-gradient-to-r from-[#1F1F23] to-[#7C6FE0] bg-clip-text text-transparent dark:from-white dark:to-[#A78BFA]">
                BlazeStore
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile Admin Portal Quick Switcher for Staff */}
            {isStaff && (
              <button
                id="mobile-admin-btn"
                onClick={() => {
                  if (isOwner) setCurrentPage('owner_dashboard');
                  else setCurrentPage('manager_dashboard');
                }}
                className={`p-1.5 rounded-lg text-xs font-bold ${
                  isOwner ? 'bg-amber-500/15 text-amber-600' : 'bg-[#7C6FE0]/15 text-[#7C6FE0]'
                }`}
                title={isOwner ? 'Owner Dashboard' : 'Manager Dashboard'}
              >
                {isOwner ? <Crown className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
              </button>
            )}

            {/* Mobile Sign In / User Button */}
            <button
              id="mobile-sign-in-btn"
              onClick={() => setIsAuthOpen(true)}
              className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-bold transition ${
                currentUser
                  ? isOwner
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-600'
                    : isManager
                    ? 'border-[#7C6FE0]/30 bg-[#7C6FE0]/10 text-[#7C6FE0]'
                    : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
                  : 'border-[#EDEDF2] dark:border-[#27272A] bg-[#FAF9FC] dark:bg-[#202024] text-[#1F1F23] dark:text-white'
              }`}
              aria-label="Sign In or Register"
            >
              <UserIcon className="h-3.5 w-3.5" />
              <span className="max-w-[70px] truncate">
                {currentUser ? currentUser.name.split(' ')[0] : 'Sign In'}
              </span>
            </button>

            <button
              id="mobile-wishlist-btn"
              onClick={() => setIsWishlistOpen(true)}
              className="relative p-2 rounded-lg text-[#52525B] dark:text-[#A1A1AA]"
              aria-label="Wishlist"
            >
              <Heart className="h-5 w-5" />
              {wishlist.length > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#FF4D4D] text-[10px] font-bold text-white">
                  {wishlist.length}
                </span>
              )}
            </button>
            <button
              id="mobile-cart-btn"
              onClick={() => setIsMobileCartOpen(true)}
              className="relative flex items-center gap-1.5 rounded-xl bg-[#7C6FE0] px-3 py-1.5 text-xs font-bold text-white shadow-xs"
              aria-label="Open cart"
            >
              <ShoppingBag className="h-4 w-4" />
              <span>{totalCartCount}</span>
            </button>
          </div>
        </header>

        {/* Main Body Area */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto w-full space-y-6">
          {/* Top Search Bar Row + Category Filter Chips */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Real-Time Live Header Search Bar */}
            <HeaderSearchBar
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              products={allProducts}
              onSelectProduct={(p) => setQuickViewProduct(p)}
              onViewAllResults={(q) => {
                setSearchQuery(q);
                setActiveTab('all-products');
              }}
              isDarkMode={isDarkMode}
            />

            {/* Quick Department Filter Chips & Role Context Actions */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              <button
                id="filter-all-btn"
                onClick={() => {
                  setSelectedCategory('all');
                  setActiveTab(activeTab === 'all-products' ? 'home' : 'all-products');
                }}
                className={`rounded-full px-4 py-2 text-xs font-bold transition whitespace-nowrap ${
                  activeTab === 'all-products' || (activeTab === 'home' && selectedCategory === 'all' && !searchQuery)
                    ? 'bg-[#7C6FE0] text-white shadow-xs'
                    : isDarkMode
                    ? 'bg-[#1E1E22] text-[#E2E8F0] hover:text-white border border-[#27272A]'
                    : 'bg-white text-[#1E293B] hover:text-[#0F172A] border border-[#CBD5E1]'
                }`}
              >
                All Products
              </button>

              <button
                id="filter-hot-deals-btn"
                onClick={() => {
                  setSelectedCategory('all');
                  setActiveTab(activeTab === 'deals' ? 'home' : 'deals');
                }}
                className={`flex items-center gap-1 rounded-full px-3.5 py-2 text-xs font-bold transition whitespace-nowrap ${
                  activeTab === 'deals'
                    ? 'bg-[#FF4D4D] text-white shadow-xs'
                    : isDarkMode
                    ? 'bg-[#1E1E22] text-[#FF4D4D] border border-[#27272A]'
                    : 'bg-[#FEE2E2] text-[#DC2626] border border-transparent'
                }`}
              >
                <span>🔥 Hot Deals</span>
              </button>

              <button
                id="filter-new-arrivals-btn"
                onClick={() => {
                  setSelectedCategory('all');
                  setActiveTab(activeTab === 'new-arrivals' ? 'home' : 'new-arrivals');
                }}
                className={`flex items-center gap-1 rounded-full px-3.5 py-2 text-xs font-bold transition whitespace-nowrap ${
                  activeTab === 'new-arrivals'
                    ? 'bg-[#7C6FE0] text-white shadow-xs'
                    : isDarkMode
                    ? 'bg-[#1E1E22] text-[#E2E8F0] hover:text-white border border-[#27272A]'
                    : 'bg-white text-[#1E293B] hover:text-[#0F172A] border border-[#CBD5E1]'
                }`}
              >
                <span>✨ New Arrivals</span>
              </button>

              {/* Quick Drawer Cart & Wishlist Trigger for screens under 1440px */}
              <button
                id="header-drawer-wishlist-btn"
                onClick={() => setIsWishlistOpen(true)}
                className="2xl:hidden relative flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition whitespace-nowrap border border-[#CBD5E1] dark:border-[#27272A] bg-white dark:bg-[#1E1E22] text-[#1E293B] dark:text-[#E2E8F0] hover:bg-[#F1F5F9] dark:hover:bg-[#27272A]"
                title="View Wishlist"
              >
                <Heart className="h-3.5 w-3.5 text-[#FF4D4D]" />
                <span className="hidden sm:inline">Wishlist</span>
                {wishlist.length > 0 && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#FF4D4D] text-[10px] font-bold text-white">
                    {wishlist.length}
                  </span>
                )}
              </button>

              <button
                id="header-drawer-cart-btn"
                onClick={() => setIsMobileCartOpen(true)}
                className="2xl:hidden relative flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold text-white bg-[#7C6FE0] hover:bg-[#6D60D6] shadow-xs transition whitespace-nowrap active:scale-95"
                title="Open Cart Drawer"
              >
                <ShoppingBag className="h-3.5 w-3.5" />
                <span>Cart ({totalCartCount})</span>
              </button>

              {/* Staff Portal Switcher: ONLY for logged-in Owner or Manager */}
              {isOwner && (
                <button
                  id="landing-owner-dashboard-btn"
                  onClick={() => setCurrentPage('owner_dashboard')}
                  className="flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-3.5 py-2 text-xs font-bold text-amber-700 dark:text-amber-400 hover:bg-amber-500/25 transition whitespace-nowrap"
                  title="Open Owner Dashboard"
                >
                  <Crown className="h-3.5 w-3.5 text-amber-500" />
                  <span>Owner Hub</span>
                </button>
              )}

              {isManager && (
                <button
                  id="landing-manager-dashboard-btn"
                  onClick={() => setCurrentPage('manager_dashboard')}
                  className="flex items-center gap-1.5 rounded-full bg-[#7C6FE0]/15 border border-[#7C6FE0]/30 px-3.5 py-2 text-xs font-bold text-[#7C6FE0] hover:bg-[#7C6FE0]/25 transition whitespace-nowrap"
                  title="Open Manager Dashboard"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-[#7C6FE0]" />
                  <span>Manager Hub</span>
                </button>
              )}
            </div>
          </div>

          {/* Conditional View Rendering: StoreViews for custom tabs, or Standard Home Layout */}
          {activeTab !== 'home' ? (
            <StoreViews
              activeTab={activeTab}
              setActiveTab={(tab) => {
                setActiveTab(tab);
                if (tab === 'wishlist') setIsWishlistOpen(true);
              }}
              onNavigateTab={(tab) => {
                setActiveTab(tab);
                if (tab === 'wishlist') setIsWishlistOpen(true);
              }}
              selectedCategory={selectedCategory}
              setSelectedCategory={(catId) => {
                setSelectedCategory(catId);
                setActiveTab('categories');
              }}
              onSelectCategory={(catId) => {
                setSelectedCategory(catId);
                setActiveTab('categories');
              }}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              allProducts={allProducts}
              products={allProducts}
              dealsProducts={dealsProducts}
              recommendedProducts={recProducts}
              recProducts={recProducts}
              onAddToCart={handleAddToCart}
              onToggleWishlist={handleToggleWishlist}
              onQuickView={(p) => setQuickViewProduct(p)}
              wishlist={wishlist}
              isWishlisted={(id) => isWishlisted(id)}
              currentUser={currentUser}
              onOpenAuth={() => setIsAuthOpen(true)}
              onOpenSupport={() => setIsSupportOpen(true)}
              onShowToast={showToast}
              isDarkMode={isDarkMode}
            />
          ) : (
            <>
              {/* Visitor Mode Banner (Shown if browsing as guest) */}
              {!currentUser && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl bg-[#EEF2FF] dark:bg-[#1E1E2E] border-2 border-[#C7D2FE] dark:border-[#4338CA]/40 p-4 text-xs shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#7C6FE0] text-white shadow-xs">
                      <Compass className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="font-extrabold text-sm text-[#0F172A] dark:text-[#F8FAFC]">
                        Guest Shopper Mode
                      </span>
                      <p className="text-xs font-semibold text-[#334155] dark:text-[#CBD5E1] mt-0.5">
                        You are browsing the store as a guest. Log in or sign up to save your cart, wishlist and orders.
                      </p>
                    </div>
                  </div>

                  <div className="self-end sm:self-auto">
                    <button
                      id="guest-banner-auth-btn"
                      onClick={() => setIsAuthOpen(true)}
                      className="rounded-xl bg-[#7C6FE0] px-4 py-2 font-bold text-white shadow-sm hover:bg-[#6D60D6] transition whitespace-nowrap active:scale-98"
                    >
                      Log In / Sign Up
                    </button>
                  </div>
                </div>
              )}

              {/* Hero Banner with Carousel */}
              <HeroBanner
                onShopNow={() => {
                  const el = document.getElementById('best-deals-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
              />

              {/* 6 Category Icons in Circles */}
              <CategoryNav
                selectedCategory={selectedCategory}
                onSelectCategory={(catId) => {
                  setSelectedCategory(catId);
                  setActiveTab('categories');
                }}
                isDarkMode={isDarkMode}
                products={allProducts}
              />

              {/* 3 Promo Tiles */}
              <PromoTiles
                onTileClick={(filter) => {
                  if (filter === 'deals') {
                    setActiveTab('deals');
                    setSelectedCategory('all');
                  } else if (filter === 'new-arrivals') {
                    setActiveTab('new-arrivals');
                    setSelectedCategory('all');
                  } else {
                    showToast('Free Express Shipping is active on all orders over $50!');
                  }
                }}
              />

              {/* SECTION 1: "Best Deals for You" */}
              <section id="best-deals-section" className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="flex h-2.5 w-2.5 rounded-full bg-[#FF4D4D] animate-ping" />
                      <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
                        Best Deals for You
                      </h2>
                    </div>
                    <p className="text-xs font-semibold text-[#475569] dark:text-[#94A3B8] mt-0.5">
                      Limited-time markdowns & top rated seasonal discounts
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleShuffleProducts}
                      className="hidden sm:flex items-center gap-1 text-xs font-semibold text-[#64748B] hover:text-[#7C6FE0] dark:text-[#94A3B8] dark:hover:text-[#A78BFA] transition px-2 py-1"
                      title="Randomize products"
                    >
                      <Shuffle className="h-3 w-3" />
                      <span>Randomize</span>
                    </button>

                    <button
                      id="deals-view-all-btn"
                      onClick={() => {
                        setSelectedCategory('all');
                        setActiveTab('deals');
                      }}
                      className="group flex items-center gap-1 text-xs font-bold text-[#7C6FE0] hover:text-[#6D60D6] transition"
                    >
                      <span>View All Deals</span>
                      <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </button>
                  </div>
                </div>

                {filteredBestDeals.length === 0 ? (
                  <div className="rounded-2xl border border-[#EDEDF2] dark:border-[#27272A] bg-white dark:bg-[#1E1E22] p-8 text-center">
                    <p className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">No deals match your search.</p>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory('all');
                      }}
                      className="mt-2 text-xs font-bold text-[#7C6FE0] underline"
                    >
                      Clear search filters
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {filteredBestDeals.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        isWishlisted={isWishlisted(product.id)}
                        onToggleWishlist={handleToggleWishlist}
                        onAddToCart={handleAddToCart}
                        onQuickView={(p) => setQuickViewProduct(p)}
                        showAddButton={true}
                        showColorSwatches={true}
                        isDarkMode={isDarkMode}
                      />
                    ))}
                  </div>
                )}
              </section>

              {/* SECTION 2: "Recommended for You" */}
              <section id="recommended-section" className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-[#7C6FE0]" />
                      <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
                        Recommended for You
                      </h2>
                    </div>
                    <p className="text-xs font-semibold text-[#475569] dark:text-[#94A3B8] mt-0.5">
                      Curated picks tailored for your everyday lifestyle
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      id="recommended-view-all-btn"
                      onClick={() => {
                        setSelectedCategory('all');
                        setActiveTab('all-products');
                      }}
                      className="group flex items-center gap-1 text-xs font-bold text-[#7C6FE0] hover:text-[#6D60D6] transition"
                    >
                      <span>Explore All</span>
                      <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </button>
                  </div>
                </div>

                {filteredRecommended.length === 0 ? (
                  <div className="rounded-2xl border border-[#EDEDF2] dark:border-[#27272A] bg-white dark:bg-[#1E1E22] p-8 text-center">
                    <p className="text-sm font-semibold">No recommended items match your search.</p>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory('all');
                      }}
                      className="mt-2 text-xs font-bold text-[#7C6FE0] underline"
                    >
                      Reset filters
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {filteredRecommended.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        isWishlisted={isWishlisted(product.id)}
                        onToggleWishlist={handleToggleWishlist}
                        onAddToCart={handleAddToCart}
                        onQuickView={(p) => setQuickViewProduct(p)}
                        showAddButton={true}
                        showColorSwatches={true}
                        isDarkMode={isDarkMode}
                      />
                    ))}
                  </div>
                )}
              </section>

              {/* Trust-Badge Strip */}
              <TrustBadges isDarkMode={isDarkMode} />
            </>
          )}

          {/* Footer */}
          <footer className="pt-6 pb-10 border-t border-[#CBD5E1] dark:border-[#27272A] flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-semibold text-[#475569] dark:text-[#94A3B8]">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#10B981]" />
                <span>BlazeStore © 2025 • Verified Storefront</span>
              </div>
              <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
              <a
                href="tel:+2348078753111"
                className="hover:text-[#00C3F7] transition font-bold text-slate-700 dark:text-slate-300"
              >
                Support: +234 807 875 3111
              </a>
              <a
                href="https://wa.me/2348078753111?text=Hello%20BlazeStore!%20I%20have%20an%20inquiry."
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-600 dark:text-emerald-400 hover:underline font-bold"
              >
                WhatsApp Direct
              </a>
            </div>
            <div className="flex items-center gap-4">
              {isOwner && (
                <button
                  onClick={() => setCurrentPage('owner_dashboard')}
                  className="font-bold text-amber-700 dark:text-amber-400 hover:underline"
                >
                  Store Owner Dashboard
                </button>
              )}
              {isManager && (
                <button
                  onClick={() => setCurrentPage('manager_dashboard')}
                  className="font-bold text-[#7C6FE0] hover:underline"
                >
                  Store Manager Dashboard
                </button>
              )}
              <a href="#privacy" className="hover:text-[#7C6FE0] transition text-[#475569] dark:text-[#94A3B8]">
                Privacy Policy
              </a>
              <a href="#terms" className="hover:text-[#7C6FE0] transition text-[#475569] dark:text-[#94A3B8]">
                Terms of Service
              </a>
            </div>
          </footer>
        </main>
      </div>

      {/* Floating Bottom Cart Drawer Trigger (for screens under 1440px or mobile) */}
      <button
        id="floating-cart-drawer-trigger"
        onClick={() => setIsMobileCartOpen(true)}
        className="2xl:hidden fixed bottom-6 right-6 z-40 flex items-center gap-2.5 rounded-full bg-[#7C6FE0] text-white px-4 py-3 font-bold text-xs shadow-2xl shadow-[#7C6FE0]/40 hover:bg-[#6D60D6] transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
        title="Open Cart Drawer"
        aria-label="Open Shopping Cart"
      >
        <ShoppingBag className="h-4 w-4" />
        <span>Cart ({totalCartCount})</span>
      </button>

      {/* Floating Desktop Cart Expand Button (when right panel is manually collapsed on wide 1440px+ displays) */}
      {isRightSidebarCollapsed && (
        <button
          id="expand-cart-floating-btn"
          onClick={() => setIsRightSidebarCollapsed(false)}
          className="hidden 2xl:flex fixed top-20 right-6 z-40 items-center gap-2.5 rounded-full bg-[#7C6FE0] text-white px-4 py-2.5 font-bold text-xs shadow-xl shadow-[#7C6FE0]/30 hover:bg-[#6D60D6] transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
          title="Expand Cart Panel"
        >
          <ShoppingBag className="h-4 w-4" />
          <span>Cart ({totalCartCount})</span>
        </button>
      )}

      {/* 3. RIGHT SIDEBAR (Cart, Profile, Quick Add, Promo, Club) */}
      <CartSidebar
        cart={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveFromCart={handleRemoveFromCart}
        onAddToCart={handleAddToCart}
        onOpenWishlist={() => setIsWishlistOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenCheckout={() => setIsCheckoutOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenAdmin={() => {
          if (isOwner) setCurrentPage('owner_dashboard');
          else if (isManager) setCurrentPage('manager_dashboard');
          else setIsAuthOpen(true);
        }}
        onLogout={handleLogout}
        onNavigateTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'wishlist') setIsWishlistOpen(true);
        }}
        currentUser={currentUser}
        unreadNotificationCount={unreadNotificationsCount}
        wishlistCount={wishlist.length}
        isDarkMode={isDarkMode}
        isOpenMobile={isMobileCartOpen}
        onCloseMobile={() => setIsMobileCartOpen(false)}
        recommendedProducts={recProducts}
        isCollapsed={isRightSidebarCollapsed}
        onToggleCollapse={() => setIsRightSidebarCollapsed((prev) => !prev)}
      />

      {/* Interactive Modals */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        currentUser={currentUser}
        onAuthSuccess={handleAuthSuccess}
        onLogout={handleLogout}
        isDarkMode={isDarkMode}
      />

      <SupportModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
        isDarkMode={isDarkMode}
        currentUser={currentUser}
      />

      <QuickViewModal
        product={quickViewProduct}
        allProducts={allProducts}
        isOpen={!!quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
        onAddToCart={handleAddToCart}
        isWishlisted={quickViewProduct ? isWishlisted(quickViewProduct.id) : false}
        onToggleWishlist={handleToggleWishlist}
        isDarkMode={isDarkMode}
        onShowToast={showToast}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cart={cart}
        currentUser={currentUser}
        onClearCart={handleClearCart}
        onPlaceOrder={handlePlaceOrder}
        isDarkMode={isDarkMode}
        onShowToast={showToast}
        onNavigateTab={(tab) => setActiveTab(tab)}
      />


      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onMarkAllRead={handleMarkAllRead}
        isDarkMode={isDarkMode}
      />

      <WishlistModal
        isOpen={isWishlistOpen}
        onClose={() => setIsWishlistOpen(false)}
        wishlist={wishlist}
        onRemoveFromWishlist={handleToggleWishlist}
        onMoveToCart={(product) => handleAddToCart(product)}
        isDarkMode={isDarkMode}
      />

      <OrderTrackingModal
        isOpen={isTrackingOpen}
        onClose={() => setIsTrackingOpen(false)}
        initialOrderId={trackingOrderId}
        onShowToast={showToast}
      />

      <InvoiceModal
        order={invoiceOrder}
        isOpen={!!invoiceOrder}
        onClose={() => setInvoiceOrder(null)}
      />

      <AddressBookModal
        isOpen={isAddressBookOpen}
        onClose={() => setIsAddressBookOpen(false)}
        userId={currentUser?.id}
        onShowToast={showToast}
      />
    </div>
  );
}
