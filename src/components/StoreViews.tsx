import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Flame,
  LayoutGrid,
  Award,
  Bookmark,
  Layers,
  Package,
  Ticket,
  MapPin,
  Settings,
  ArrowRight,
  Filter,
  Check,
  ChevronRight,
  Copy,
  Clock,
  Truck,
  ShieldCheck,
  ExternalLink,
  Search,
  SlidersHorizontal,
  Plus,
  Trash2,
  DollarSign
} from 'lucide-react';
import { Product, Category, User, Order } from '../types';
import { ProductCard } from './ProductCard';
import { CATEGORIES } from '../data/mockData';

interface StoreViewsProps {
  activeTab: string;
  setActiveTab?: (tab: string) => void;
  onNavigateTab?: (tab: string) => void;
  products?: Product[];
  allProducts?: Product[];
  dealsProducts?: Product[];
  recommendedProducts?: Product[];
  recProducts?: Product[];
  selectedCategory?: string;
  setSelectedCategory?: (cat: string) => void;
  onSelectCategory?: (cat: string) => void;
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
  isWishlisted?: (id: string) => boolean;
  onToggleWishlist?: (p: Product) => void;
  onAddToCart?: (p: Product, color?: string, qty?: number) => void;
  onQuickView?: (p: Product) => void;
  currentUser?: User | null;
  onOpenAuth?: () => void;
  onOpenSupport?: () => void;
  onShowToast?: (msg: string) => void;
  isDarkMode?: boolean;
}

export const StoreViews: React.FC<StoreViewsProps> = ({
  activeTab,
  setActiveTab: propSetActiveTab,
  onNavigateTab,
  products = [],
  allProducts = [],
  dealsProducts = [],
  recommendedProducts = [],
  recProducts = [],
  selectedCategory = 'all',
  setSelectedCategory: propSetSelectedCategory,
  onSelectCategory,
  isWishlisted = (_id: string) => false,
  onToggleWishlist = (_p: Product) => {},
  onAddToCart = (_p: Product, _color?: string, _qty?: number) => {},
  onQuickView = (_p: Product) => {},
  currentUser,
  onOpenAuth = () => {},
  onOpenSupport = () => {},
  onShowToast = (_msg: string) => {},
  isDarkMode = false,
}) => {
  const setActiveTab = propSetActiveTab || onNavigateTab || (() => {});
  const setSelectedCategory = propSetSelectedCategory || onSelectCategory || (() => {});

  const [sortBy, setSortBy] = useState<'featured' | 'price-low' | 'price-high' | 'rating' | 'discount'>('featured');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [userAddresses, setUserAddresses] = useState([
    {
      id: 'addr-1',
      isDefault: true,
      label: 'Home Address',
      name: currentUser?.name || 'Alex Morgan',
      address: '742 Evergreen Terrace, Apt 4B',
      city: 'Springfield',
      zip: '97477',
      phone: '+1 (555) 019-2834',
    },
    {
      id: 'addr-2',
      isDefault: false,
      label: 'Office & Studio',
      name: currentUser?.name || 'Alex Morgan',
      address: '100 Silicon Blvd, Suite 800',
      city: 'San Francisco, CA',
      zip: '94107',
      phone: '+1 (555) 982-1144',
    },
  ]);

  const [newAddressModal, setNewAddressModal] = useState(false);
  const [newAddrForm, setNewAddrForm] = useState({
    label: 'Apartment',
    address: '',
    city: '',
    zip: '',
    phone: '',
  });

  // Coupons
  const coupons = [
    {
      code: 'SUMMER50',
      discount: '50% OFF',
      title: 'Summer Mega Fashion Clearance',
      description: 'Valid on select summer apparel and seasonal sunglasses.',
      minSpend: '$60.00',
      expires: 'Aug 31, 2026',
      badge: 'Hot Deal',
      bgGradient: 'from-amber-500/20 to-orange-500/20 border-amber-500/40 text-amber-600 dark:text-amber-400',
    },
    {
      code: 'SAVE20',
      discount: '20% OFF',
      title: 'Weekend VIP Storewide Promo',
      description: 'Applicable to entire cart including electronics and home accessories.',
      minSpend: '$40.00',
      expires: 'Sep 15, 2026',
      badge: 'VIP Only',
      bgGradient: 'from-purple-500/20 to-indigo-500/20 border-purple-500/40 text-purple-600 dark:text-purple-400',
    },
    {
      code: 'BLAZE10',
      discount: '10% OFF',
      title: 'Welcome First-Order Gift',
      description: 'Automatic welcome discount for new shoppers and registered accounts.',
      minSpend: 'No minimum',
      expires: 'Dec 31, 2026',
      badge: 'Storewide',
      bgGradient: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/40 text-emerald-600 dark:text-emerald-400',
    },
  ];

  // All combined unique products
  const allProductsList = useMemo(() => {
    const map = new Map<string, Product>();
    const sources = [allProducts, products, dealsProducts, recommendedProducts, recProducts];
    sources.forEach((sourceList) => {
      if (Array.isArray(sourceList)) {
        sourceList.forEach((p) => {
          if (p && p.id && !map.has(p.id)) map.set(p.id, p);
        });
      }
    });
    return Array.from(map.values());
  }, [allProducts, products, dealsProducts, recommendedProducts, recProducts]);

  // Filtered and Sorted Products
  const processedProducts = useMemo(() => {
    let list = [...allProductsList];

    // Filter by Tab
    if (activeTab === 'deals') {
      list = list.filter((p) => (p.discountPercentage && p.discountPercentage >= 20) || p.isHot);
    } else if (activeTab === 'new-arrivals') {
      list = list.slice(0, 8); // Top recent
    } else if (activeTab === 'best-sellers') {
      list = list.filter((p) => p.rating >= 4.7);
    }

    // Filter by Category
    if (selectedCategory !== 'all') {
      list = list.filter((p) => p.category.toLowerCase().includes(selectedCategory.toLowerCase()));
    }

    // In Stock filter
    if (inStockOnly) {
      list = list.filter((p) => p.inStock !== false);
    }

    // Sort
    if (sortBy === 'price-low') {
      list.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-high') {
      list.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'rating') {
      list.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'discount') {
      list.sort((a, b) => (b.discountPercentage || 0) - (a.discountPercentage || 0));
    }

    return list;
  }, [allProductsList, activeTab, selectedCategory, inStockOnly, sortBy]);

  const handleCopyCoupon = (code: string) => {
    navigator.clipboard?.writeText(code);
    onShowToast(`Coupon code "${code}" copied! Apply it in your cart 🎉`);
  };

  const handleAddAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddrForm.address || !newAddrForm.city || !newAddrForm.zip) return;
    const newAddr = {
      id: `addr-${Date.now()}`,
      isDefault: userAddresses.length === 0,
      label: newAddrForm.label || 'Saved Address',
      name: currentUser?.name || 'Alex Morgan',
      address: newAddrForm.address,
      city: newAddrForm.city,
      zip: newAddrForm.zip,
      phone: newAddrForm.phone || '+1 (555) 000-0000',
    };
    setUserAddresses([...userAddresses, newAddr]);
    setNewAddressModal(false);
    setNewAddrForm({ label: 'Apartment', address: '', city: '', zip: '', phone: '' });
    onShowToast('New delivery address saved! 📍');
  };

  const handleDeleteAddress = (id: string) => {
    setUserAddresses((prev) => prev.filter((a) => a.id !== id));
    onShowToast('Address removed.');
  };

  const handleSetDefaultAddress = (id: string) => {
    setUserAddresses((prev) =>
      prev.map((a) => ({ ...a, isDefault: a.id === id }))
    );
    onShowToast('Default delivery address updated!');
  };

  // 1. CATEGORIES VIEW
  if (activeTab === 'categories') {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EDEDF2] dark:border-[#27272A] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 text-[#7C6FE0]" />
              <h2 className="text-xl font-black">Browse by Categories</h2>
            </div>
            <p className="text-xs text-[#8A8A94] mt-0.5">Explore our wide catalog by department and collection</p>
          </div>
          <button
            onClick={() => {
              setSelectedCategory('all');
              setActiveTab('all-products');
            }}
            className="flex items-center gap-1.5 text-xs font-bold text-[#7C6FE0] hover:underline"
          >
            <span>View All {allProductsList.length} Products</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Category Cards Matrix */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setActiveTab('all-products');
                  onShowToast(`Filtered by ${cat.name} department`);
                }}
                className={`flex flex-col items-center text-center p-4 rounded-2xl border transition group shadow-xs ${
                  isSelected
                    ? 'border-[#7C6FE0] bg-[#7C6FE0]/10'
                    : isDarkMode
                    ? 'border-[#27272A] bg-[#18181B] hover:border-[#7C6FE0]/50'
                    : 'border-[#EDEDF2] bg-white hover:border-[#7C6FE0]/50'
                }`}
              >
                <div
                  className="h-12 w-12 rounded-2xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110 shadow-xs"
                  style={{ backgroundColor: cat.colorBg, color: cat.colorIcon }}
                >
                  <LayoutGrid className="h-6 w-6" />
                </div>
                <span className="text-xs font-extrabold text-[#1F1F23] dark:text-white group-hover:text-[#7C6FE0] transition">
                  {cat.name}
                </span>
                <span className="text-[10px] text-[#8A8A94] font-medium mt-0.5">{cat.itemCount.toLocaleString()} items</span>
              </button>
            );
          })}
        </div>

        {/* Selected Category Featured Items */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold">
              {selectedCategory === 'all' ? 'Popular Items Across All Departments' : `Top Picks in "${selectedCategory}"`}
            </h3>
            <span className="text-xs font-bold text-[#8A8A94]">
              {processedProducts.length} items available
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {processedProducts.slice(0, 8).map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isWishlisted={isWishlisted(product.id)}
                onToggleWishlist={onToggleWishlist}
                onAddToCart={onAddToCart}
                onQuickView={onQuickView}
                showAddButton={true}
                showColorSwatches={true}
                isDarkMode={isDarkMode}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 2. HOT DEALS VIEW
  if (activeTab === 'deals') {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Deals Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#FF4D4D] via-[#F97316] to-[#7C6FE0] p-6 sm:p-8 text-white shadow-xl">
          <div className="relative z-10 max-w-xl space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-black uppercase tracking-wider backdrop-blur-md">
              <Flame className="h-4 w-4 text-amber-300" />
              Limited-Time Super Flash Deals
            </span>
            <h2 className="text-2xl sm:text-3xl font-black leading-tight">Save Up to 50% on Premium Catalog</h2>
            <p className="text-xs sm:text-sm text-white/90 font-medium">
              Handpicked discounts refreshed daily. Guaranteed lowest online price with instant checkout.
            </p>
          </div>
        </div>

        {/* Controls & Filter bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#18181B] p-4 rounded-2xl border border-[#EDEDF2] dark:border-[#27272A]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#8A8A94]">Filter Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs font-bold rounded-xl border border-[#CBD5E1] dark:border-[#27272A] bg-transparent p-2 focus:outline-none focus:ring-2 focus:ring-[#7C6FE0]/30"
            >
              <option value="all">All Departments</option>
              <option value="fashion">Fashion & Apparel</option>
              <option value="electronics">Electronics & Tech</option>
              <option value="beauty">Beauty & Wellness</option>
              <option value="home">Home & Living</option>
              <option value="sports">Sports & Gear</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#8A8A94]">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs font-bold rounded-xl border border-[#CBD5E1] dark:border-[#27272A] bg-transparent p-2 focus:outline-none focus:ring-2 focus:ring-[#7C6FE0]/30"
            >
              <option value="discount">Biggest Discount %</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Top Customer Rating</option>
            </select>
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {processedProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              isWishlisted={isWishlisted(product.id)}
              onToggleWishlist={onToggleWishlist}
              onAddToCart={onAddToCart}
              onQuickView={onQuickView}
              showAddButton={true}
              showColorSwatches={true}
              isDarkMode={isDarkMode}
            />
          ))}
        </div>
      </div>
    );
  }

  // 3. NEW ARRIVALS VIEW
  if (activeTab === 'new-arrivals') {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EDEDF2] dark:border-[#27272A] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#7C6FE0]" />
              <h2 className="text-xl font-black">New Arrivals & Fresh Releases</h2>
            </div>
            <p className="text-xs text-[#8A8A94] mt-0.5">Discover the newest drops, seasonal wardrobe and lifestyle essentials</p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#7C6FE0]/15 text-[#7C6FE0]">
            Freshly Added This Week
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {processedProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              isWishlisted={isWishlisted(product.id)}
              onToggleWishlist={onToggleWishlist}
              onAddToCart={onAddToCart}
              onQuickView={onQuickView}
              showAddButton={true}
              showColorSwatches={true}
              isDarkMode={isDarkMode}
            />
          ))}
        </div>
      </div>
    );
  }

  // 4. ALL PRODUCTS VIEW
  if (activeTab === 'all-products') {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EDEDF2] dark:border-[#27272A] pb-4">
          <div>
            <h2 className="text-xl font-black">All Catalog Products</h2>
            <p className="text-xs text-[#8A8A94] mt-0.5">Explore our comprehensive catalogue of premium verified products</p>
          </div>

          {/* Quick Category Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {['all', 'fashion', 'electronics', 'beauty', 'home', 'sports'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition whitespace-nowrap capitalize ${
                  selectedCategory === cat
                    ? 'bg-[#7C6FE0] text-white shadow-xs'
                    : 'bg-black/5 dark:bg-white/5 text-[#8A8A94] hover:text-[#1F1F23] dark:hover:text-white'
                }`}
              >
                {cat === 'all' ? 'All Departments' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#18181B] p-4 rounded-2xl border border-[#EDEDF2] dark:border-[#27272A] text-xs">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 font-bold cursor-pointer">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="rounded accent-[#7C6FE0]"
              />
              <span>In-Stock Items Only</span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-[#8A8A94]">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="font-bold rounded-xl border border-[#CBD5E1] dark:border-[#27272A] bg-transparent p-2 focus:outline-none focus:ring-2 focus:ring-[#7C6FE0]/30"
            >
              <option value="featured">Featured & Best Picks</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Top Rated</option>
              <option value="discount">Biggest Discount %</option>
            </select>
          </div>
        </div>

        {/* Product Grid */}
        {processedProducts.length === 0 ? (
          <div className="text-center py-12 rounded-3xl border border-[#EDEDF2] dark:border-[#27272A] bg-white dark:bg-[#18181B] space-y-2">
            <p className="font-bold text-sm">No products found matching your current filter.</p>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setInStockOnly(false);
              }}
              className="text-xs font-bold text-[#7C6FE0] underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {processedProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isWishlisted={isWishlisted(product.id)}
                onToggleWishlist={onToggleWishlist}
                onAddToCart={onAddToCart}
                onQuickView={onQuickView}
                showAddButton={true}
                showColorSwatches={true}
                isDarkMode={isDarkMode}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // 5. BEST SELLERS VIEW
  if (activeTab === 'best-sellers') {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between border-b border-[#EDEDF2] dark:border-[#27272A] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-black">Top Rated & Best Sellers</h2>
              <p className="text-xs text-[#8A8A94]">The most purchased and highly reviewed products by our community</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {processedProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              isWishlisted={isWishlisted(product.id)}
              onToggleWishlist={onToggleWishlist}
              onAddToCart={onAddToCart}
              onQuickView={onQuickView}
              showAddButton={true}
              showColorSwatches={true}
              isDarkMode={isDarkMode}
            />
          ))}
        </div>
      </div>
    );
  }

  // 6. BRANDS VIEW
  if (activeTab === 'brands') {
    const brands = [
      { name: 'Nike Sportswear', items: 340, desc: 'Performance athletic gear & lifestyle shoes' },
      { name: 'Apple Inc.', items: 120, desc: 'Cutting-edge consumer tech & audio accessories' },
      { name: 'Zara Premium', items: 560, desc: 'Contemporary urban fashion & runway tailored looks' },
      { name: 'Sony Electronics', items: 85, desc: 'Audiophile grade headphones & 4K smart visuals' },
      { name: 'Dyson Home', items: 45, desc: 'Air purification & revolutionary hair care tech' },
      { name: "Levi's Heritage", items: 210, desc: 'Iconic denim, jackets & timeless casual wear' },
    ];

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="border-b border-[#EDEDF2] dark:border-[#27272A] pb-4">
          <h2 className="text-xl font-black">Featured Brands & Designers</h2>
          <p className="text-xs text-[#8A8A94] mt-0.5">Shop 100% authentic collections from world-renowned partner brands</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {brands.map((b, i) => (
            <div
              key={i}
              className="p-5 rounded-2xl border border-[#EDEDF2] dark:border-[#27272A] bg-white dark:bg-[#18181B] hover:border-[#7C6FE0] transition group shadow-xs space-y-3 cursor-pointer"
              onClick={() => {
                setActiveTab('all-products');
                onShowToast(`Browsing ${b.name} showcase`);
              }}
            >
              <div className="flex items-center justify-between">
                <h4 className="font-black text-sm group-hover:text-[#7C6FE0] transition">{b.name}</h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#7C6FE0]/15 text-[#7C6FE0]">
                  {b.items} items
                </span>
              </div>
              <p className="text-xs text-[#8A8A94] leading-relaxed">{b.desc}</p>
              <div className="flex items-center gap-1 text-xs font-bold text-[#7C6FE0]">
                <span>Explore Catalog</span>
                <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 7. COLLECTIONS VIEW
  if (activeTab === 'collections') {
    const collections = [
      {
        title: 'Minimalist Wardrobe Essentials',
        count: '48 items',
        gradient: 'from-amber-600/80 to-amber-900/90',
        image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&auto=format&fit=crop&q=80',
        desc: 'Timeless earth tones, breathable organic cotton, and versatile layering.',
      },
      {
        title: 'Modern Smart Workspace',
        count: '32 items',
        gradient: 'from-indigo-600/80 to-purple-900/90',
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80',
        desc: 'Sleek wireless headphones, ergonomic desk pads, and charging stations.',
      },
      {
        title: 'Summer Getaway & Resort',
        count: '64 items',
        gradient: 'from-rose-600/80 to-orange-900/90',
        image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&auto=format&fit=crop&q=80',
        desc: 'Lightweight linen, UV-protected sunglasses, and beach tote bags.',
      },
    ];

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="border-b border-[#EDEDF2] dark:border-[#27272A] pb-4">
          <h2 className="text-xl font-black">Curated Lookbooks & Collections</h2>
          <p className="text-xs text-[#8A8A94] mt-0.5">Expertly styled edits designed for specific seasons and lifestyles</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {collections.map((col, i) => (
            <div
              key={i}
              onClick={() => {
                setActiveTab('all-products');
                onShowToast(`Opened collection: ${col.title}`);
              }}
              className="relative overflow-hidden rounded-3xl group cursor-pointer shadow-md min-h-[300px] flex flex-col justify-end p-6 text-white"
            >
              <img
                src={col.image}
                alt={col.title}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className={`absolute inset-0 bg-gradient-to-t ${col.gradient}`} />
              <div className="relative z-10 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded-full backdrop-blur-xs">
                  {col.count}
                </span>
                <h3 className="text-lg font-black leading-tight">{col.title}</h3>
                <p className="text-xs text-white/90 leading-snug">{col.desc}</p>
                <div className="pt-2 flex items-center gap-1 text-xs font-bold text-white underline underline-offset-4">
                  <span>Shop This Collection</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 8. MY ORDERS VIEW
  if (activeTab === 'orders') {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EDEDF2] dark:border-[#27272A] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-[#7C6FE0]" />
              <h2 className="text-xl font-black">My Orders & Shipments</h2>
            </div>
            <p className="text-xs text-[#8A8A94] mt-0.5">Track active deliveries, download invoice receipts, or request returns</p>
          </div>
          <button
            onClick={() => setActiveTab('all-products')}
            className="rounded-xl bg-[#7C6FE0] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#6D60D6] transition"
          >
            Continue Shopping
          </button>
        </div>

        {/* Demo Active Orders */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#EDEDF2] dark:border-[#27272A] bg-white dark:bg-[#18181B] p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EDEDF2] dark:border-[#27272A] pb-3 text-xs">
              <div>
                <span className="font-bold text-[#8A8A94]">Order ID:</span>{' '}
                <span className="font-mono font-bold text-[#7C6FE0]">#BZ-882194</span>
                <span className="ml-3 text-[11px] text-[#8A8A94]">Placed on Aug 18, 2026</span>
              </div>
              <span className="inline-flex items-center gap-1.5 font-bold text-xs px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <Truck className="h-3.5 w-3.5" /> Out for Delivery
              </span>
            </div>

            <div className="flex items-center gap-4">
              <img
                src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&auto=format&fit=crop&q=80"
                alt="Headphones"
                className="h-16 w-16 rounded-xl object-cover"
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-xs truncate">Studio Wireless Pro ANC Headphones</h4>
                <p className="text-[11px] text-[#8A8A94]">Space Black • Qty 1</p>
                <p className="font-black text-xs text-[#7C6FE0] mt-1">$149.99</p>
              </div>
              <div className="text-right">
                <button
                  onClick={() => onShowToast('Carrier tracking: USPS #9400111899564478129 (Expected Today by 5 PM)')}
                  className="rounded-xl border border-[#CBD5E1] dark:border-[#27272A] px-3 py-1.5 text-xs font-bold hover:border-[#7C6FE0] transition"
                >
                  Track Package
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#EDEDF2] dark:border-[#27272A] bg-white dark:bg-[#18181B] p-5 shadow-xs space-y-4 opacity-90">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EDEDF2] dark:border-[#27272A] pb-3 text-xs">
              <div>
                <span className="font-bold text-[#8A8A94]">Order ID:</span>{' '}
                <span className="font-mono font-bold text-[#7C6FE0]">#BZ-774012</span>
                <span className="ml-3 text-[11px] text-[#8A8A94]">Delivered on Aug 10, 2026</span>
              </div>
              <span className="inline-flex items-center gap-1.5 font-bold text-xs px-3 py-1 rounded-full bg-blue-500/15 text-blue-600">
                <Check className="h-3.5 w-3.5" /> Delivered & Verified
              </span>
            </div>

            <div className="flex items-center gap-4">
              <img
                src="https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=200&auto=format&fit=crop&q=80"
                alt="Tee"
                className="h-16 w-16 rounded-xl object-cover"
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-xs truncate">Heavyweight Organic Cotton Boxy Tee</h4>
                <p className="text-[11px] text-[#8A8A94]">Sage Green / Size L • Qty 2</p>
                <p className="font-black text-xs text-[#7C6FE0] mt-1">$68.00</p>
              </div>
              <div className="text-right">
                <button
                  onClick={() => onShowToast('Invoice PDF downloaded successfully! 📄')}
                  className="rounded-xl border border-[#CBD5E1] dark:border-[#27272A] px-3 py-1.5 text-xs font-bold hover:border-[#7C6FE0] transition"
                >
                  Download Receipt
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 9. COUPONS VIEW
  if (activeTab === 'coupons') {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="border-b border-[#EDEDF2] dark:border-[#27272A] pb-4">
          <div className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-[#7C6FE0]" />
            <h2 className="text-xl font-black">Coupons & Exclusive Discounts</h2>
          </div>
          <p className="text-xs text-[#8A8A94] mt-0.5">Click any code to instantly copy and apply at checkout</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {coupons.map((c, i) => (
            <div
              key={i}
              className="rounded-3xl border border-[#EDEDF2] dark:border-[#27272A] bg-white dark:bg-[#18181B] p-5 shadow-xs flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${c.bgGradient}`}>
                    {c.badge}
                  </span>
                  <span className="text-[11px] font-bold text-[#8A8A94]">{c.expires}</span>
                </div>
                <h3 className="text-2xl font-black text-[#1F1F23] dark:text-white">{c.discount}</h3>
                <h4 className="font-bold text-xs text-[#1F1F23] dark:text-white">{c.title}</h4>
                <p className="text-xs text-[#8A8A94] leading-relaxed">{c.description}</p>
                <div className="text-[11px] font-semibold text-[#7C6FE0]">Min. Spend: {c.minSpend}</div>
              </div>

              <div className="pt-2 border-t border-[#EDEDF2] dark:border-[#27272A] flex items-center justify-between">
                <span className="font-mono font-extrabold text-sm text-[#7C6FE0]">{c.code}</span>
                <button
                  onClick={() => handleCopyCoupon(c.code)}
                  className="flex items-center gap-1.5 rounded-xl bg-[#7C6FE0] px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#6D60D6] transition active:scale-95"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy Code</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 10. ADDRESSES VIEW
  if (activeTab === 'addresses') {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EDEDF2] dark:border-[#27272A] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-[#7C6FE0]" />
              <h2 className="text-xl font-black">Saved Delivery Addresses</h2>
            </div>
            <p className="text-xs text-[#8A8A94] mt-0.5">Manage your home, studio, and gift delivery locations</p>
          </div>
          <button
            onClick={() => setNewAddressModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-[#7C6FE0] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#6D60D6] transition"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Address</span>
          </button>
        </div>

        {/* Address Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {userAddresses.map((addr) => (
            <div
              key={addr.id}
              className={`rounded-2xl border p-5 transition space-y-3 ${
                addr.isDefault
                  ? 'border-[#7C6FE0] bg-[#7C6FE0]/5 shadow-xs'
                  : 'border-[#EDEDF2] dark:border-[#27272A] bg-white dark:bg-[#18181B]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="font-extrabold text-xs">{addr.label}</h4>
                  {addr.isDefault && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#7C6FE0] text-white">
                      Default
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!addr.isDefault && (
                    <button
                      onClick={() => handleSetDefaultAddress(addr.id)}
                      className="text-[11px] font-bold text-[#7C6FE0] hover:underline"
                    >
                      Make Default
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteAddress(addr.id)}
                    className="p-1 rounded-lg text-red-500 hover:bg-red-500/10 transition"
                    title="Remove address"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="text-xs text-[#52525B] dark:text-[#A1A1AA] space-y-1">
                <p className="font-bold text-[#1F1F23] dark:text-white">{addr.name}</p>
                <p>{addr.address}</p>
                <p>{addr.city} {addr.zip}</p>
                <p className="text-[11px] text-[#8A8A94]">{addr.phone}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Add Address Modal */}
        {newAddressModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-3xl border border-[#EDEDF2] dark:border-[#27272A] bg-white dark:bg-[#18181B] p-6 space-y-4 shadow-2xl">
              <h3 className="font-black text-base">Add New Shipping Address</h3>
              <form onSubmit={handleAddAddress} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-[#8A8A94] block mb-1">Address Label</label>
                  <input
                    type="text"
                    required
                    value={newAddrForm.label}
                    onChange={(e) => setNewAddrForm({ ...newAddrForm, label: e.target.value })}
                    placeholder="e.g. Home, Vacation Villa, Office"
                    className="w-full rounded-xl border border-[#CBD5E1] dark:border-[#27272A] bg-white dark:bg-[#202024] p-2.5 font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#8A8A94] block mb-1">Street Address *</label>
                  <input
                    type="text"
                    required
                    value={newAddrForm.address}
                    onChange={(e) => setNewAddrForm({ ...newAddrForm, address: e.target.value })}
                    placeholder="123 Main St, Apt 4B"
                    className="w-full rounded-xl border border-[#CBD5E1] dark:border-[#27272A] bg-white dark:bg-[#202024] p-2.5 font-semibold"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-[#8A8A94] block mb-1">City, State *</label>
                    <input
                      type="text"
                      required
                      value={newAddrForm.city}
                      onChange={(e) => setNewAddrForm({ ...newAddrForm, city: e.target.value })}
                      placeholder="Seattle, WA"
                      className="w-full rounded-xl border border-[#CBD5E1] dark:border-[#27272A] bg-white dark:bg-[#202024] p-2.5 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-[#8A8A94] block mb-1">ZIP / Postal Code *</label>
                    <input
                      type="text"
                      required
                      value={newAddrForm.zip}
                      onChange={(e) => setNewAddrForm({ ...newAddrForm, zip: e.target.value })}
                      placeholder="98101"
                      className="w-full rounded-xl border border-[#CBD5E1] dark:border-[#27272A] bg-white dark:bg-[#202024] p-2.5 font-semibold"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setNewAddressModal(false)}
                    className="flex-1 rounded-xl border border-[#CBD5E1] dark:border-[#27272A] py-2.5 font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-xl bg-[#7C6FE0] py-2.5 font-bold text-xs text-white"
                  >
                    Save Address
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 11. ACCOUNT SETTINGS VIEW
  if (activeTab === 'settings') {
    return (
      <div className="space-y-6 animate-fade-in max-w-2xl">
        <div className="border-b border-[#EDEDF2] dark:border-[#27272A] pb-4">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-[#7C6FE0]" />
            <h2 className="text-xl font-black">Account Settings & Preferences</h2>
          </div>
          <p className="text-xs text-[#8A8A94] mt-0.5">Manage your profile, email notifications, and security</p>
        </div>

        <div className="rounded-3xl border border-[#EDEDF2] dark:border-[#27272A] bg-white dark:bg-[#18181B] p-6 shadow-xs space-y-5">
          <div>
            <h3 className="font-black text-sm mb-1">Profile Details</h3>
            <p className="text-xs text-[#8A8A94]">Your account identity across orders and customer support</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-[#8A8A94] block mb-1">Full Name</label>
              <input
                type="text"
                defaultValue={currentUser?.name || 'Alex Morgan'}
                className="w-full rounded-xl border border-[#CBD5E1] dark:border-[#27272A] bg-white dark:bg-[#202024] p-2.5 font-semibold"
              />
            </div>
            <div>
              <label className="font-bold text-[#8A8A94] block mb-1">Email Address</label>
              <input
                type="email"
                defaultValue={currentUser?.email || 'alex.morgan@example.com'}
                className="w-full rounded-xl border border-[#CBD5E1] dark:border-[#27272A] bg-white dark:bg-[#202024] p-2.5 font-semibold"
              />
            </div>
          </div>

          <div className="border-t border-[#EDEDF2] dark:border-[#27272A] pt-4 space-y-3">
            <h4 className="font-black text-xs">Notification Preferences</h4>
            <div className="space-y-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded accent-[#7C6FE0]" />
                <span>Receive shipment dispatch and carrier tracking SMS updates</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded accent-[#7C6FE0]" />
                <span>Exclusive seasonal deals, VIP coupon codes & drops</span>
              </label>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => onShowToast('Profile settings saved successfully! ✅')}
              className="rounded-xl bg-[#7C6FE0] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#6D60D6] transition"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
