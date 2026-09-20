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
  wishlist?: Product[];
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
  wishlist = [],
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
  const [selectedCollection, setSelectedCollection] = useState<string>('all');
  const [userAddresses, setUserAddresses] = useState<any[]>([]);

  const [newAddressModal, setNewAddressModal] = useState(false);
  const [newAddrForm, setNewAddrForm] = useState({
    label: 'Home',
    address: '',
    city: '',
    zip: '',
    phone: '',
  });

  // All combined unique products (MUST be declared BEFORE dynamicBrands / dynamicCollections)
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

  // Dynamic Brands extracted from real product inventory
  const dynamicBrands = useMemo(() => {
    const map = new Map<string, { name: string; count: number; sampleImage?: string }>();
    allProductsList.forEach((p) => {
      if (p.brand && p.brand.trim() !== '') {
        const bName = p.brand.trim();
        const existing = map.get(bName);
        if (existing) {
          existing.count += 1;
        } else {
          map.set(bName, { name: bName, count: 1, sampleImage: p.image });
        }
      }
    });
    return Array.from(map.values());
  }, [allProductsList]);

  // Dynamic Collections extracted from real product inventory
  const dynamicCollections = useMemo(() => {
    const map = new Map<string, { title: string; count: number; image: string }>();
    allProductsList.forEach((p) => {
      if (p.collection && p.collection.trim() !== '') {
        const cTitle = p.collection.trim();
        const existing = map.get(cTitle);
        if (existing) {
          existing.count += 1;
        } else {
          map.set(cTitle, {
            title: cTitle,
            count: 1,
            image: p.image || 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&auto=format&fit=crop&q=80',
          });
        }
      }
    });
    return Array.from(map.values());
  }, [allProductsList]);

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

  // Filtered and Sorted Products
  const processedProducts = useMemo(() => {
    let list = [...allProductsList];

    // Filter by Tab
    if (activeTab === 'deals') {
      const filtered = list.filter((p) => 
        (p.discountPercentage && p.discountPercentage >= 10) || 
        p.isHot || 
        p.isDeal || 
        (p.originalPrice && p.originalPrice > p.price) ||
        (p.badge && (p.badge.toLowerCase().includes('off') || p.badge.toLowerCase().includes('deal') || p.badge.toLowerCase().includes('sale')))
      );
      list = filtered.length > 0 ? filtered : [...allProductsList];
    } else if (activeTab === 'new-arrivals') {
      const filtered = list.filter((p) => p.isNewArrival || (p.badge && p.badge.toLowerCase().includes('new')));
      list = filtered.length > 0 ? filtered : list.slice(0, 12);
    } else if (activeTab === 'best-sellers') {
      const filtered = list.filter((p) => p.isBestSeller || p.rating >= 4.0 || (p.reviewCount && p.reviewCount > 0));
      list = filtered.length > 0 ? filtered : [...allProductsList].sort((a, b) => b.rating - a.rating);
    }

    // Filter by Brand
    if (selectedBrand && selectedBrand !== 'all') {
      list = list.filter((p) => p.brand && p.brand.trim().toLowerCase() === selectedBrand.trim().toLowerCase());
    }

    // Filter by Collection
    if (selectedCollection && selectedCollection !== 'all') {
      list = list.filter((p) => p.collection && p.collection.trim().toLowerCase() === selectedCollection.trim().toLowerCase());
    }

    // Filter by Category
    if (selectedCategory !== 'all') {
      const catSearch = selectedCategory.toLowerCase().replace(/-/g, ' ');
      list = list.filter((p) => {
        const pCat = (p.category || '').toLowerCase();
        if (selectedCategory === 'phones-tablets' || selectedCategory === 'electronics') {
          return pCat.includes('phone') || pCat.includes('tablet') || pCat.includes('electronic') || pCat.includes('mobile');
        }
        if (selectedCategory === 'appliances') {
          return pCat.includes('appliance') || pCat.includes('home') || pCat.includes('kitchen');
        }
        if (selectedCategory === 'kids-baby') {
          return pCat.includes('kid') || pCat.includes('baby') || pCat.includes('child') || pCat.includes('toy');
        }
        if (selectedCategory === 'fashion') {
          return pCat.includes('fashion') || pCat.includes('cloth') || pCat.includes('apparel');
        }
        if (selectedCategory === 'beauty') {
          return pCat.includes('beauty') || pCat.includes('skin') || pCat.includes('cosmetic');
        }
        if (selectedCategory === 'sneakers' || selectedCategory === 'sports') {
          return pCat.includes('sneaker') || pCat.includes('shoe') || pCat.includes('sport') || pCat.includes('footwear');
        }
        if (selectedCategory === 'television') {
          return pCat.includes('tv') || pCat.includes('television') || pCat.includes('screen');
        }
        if (selectedCategory === 'home-office') {
          return pCat.includes('office') || pCat.includes('desk') || pCat.includes('furniture');
        }
        if (selectedCategory === 'supermarket') {
          return pCat.includes('supermarket') || pCat.includes('grocery') || pCat.includes('food') || pCat.includes('pantry');
        }
        if (selectedCategory === 'mobile-accessories') {
          return pCat.includes('accessory') || pCat.includes('accessories') || pCat.includes('charger') || pCat.includes('headphone');
        }
        if (selectedCategory === 'computing') {
          return pCat.includes('comput') || pCat.includes('laptop') || pCat.includes('pc');
        }
        if (selectedCategory === 'sillage-and-olfactory') {
          return pCat.includes('sillage') || pCat.includes('olfactory') || pCat.includes('perfume') || pCat.includes('fragrance') || pCat.includes('brand');
        }
        return pCat.includes(selectedCategory.toLowerCase()) || pCat.includes(catSearch);
      });
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
  }, [allProductsList, activeTab, selectedCategory, selectedBrand, selectedCollection, inStockOnly, sortBy]);

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
      name: currentUser?.name || 'Customer',
      address: newAddrForm.address,
      city: newAddrForm.city,
      zip: newAddrForm.zip,
      phone: newAddrForm.phone || '',
    };
    setUserAddresses([...userAddresses, newAddr]);
    setNewAddressModal(false);
    setNewAddrForm({ label: 'Home', address: '', city: '', zip: '', phone: '' });
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3.5">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            const nameLower = cat.name.toLowerCase();
            const idLower = cat.id.toLowerCase();
            const catCount = allProductsList.filter((p) => {
              const pCat = (p.category || '').toLowerCase();
              if (idLower === 'sillage-and-olfactory') {
                return pCat.includes('sillage') || pCat.includes('olfactory') || pCat.includes('perfume') || pCat.includes('layering');
              }
              return pCat === nameLower || pCat.includes(idLower) || (idLower === 'home' && pCat.includes('home'));
            }).length;

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
                  className={`relative h-20 w-20 rounded-full p-1 mb-3 transition-transform duration-300 group-hover:scale-110 shadow-md ring-2 ${
                    isSelected ? 'ring-[#7C6FE0]' : 'ring-black/10 dark:ring-white/10 group-hover:ring-[#7C6FE0]/50'
                  }`}
                  style={{
                    background: `linear-gradient(135deg, ${cat.colorBg} 0%, #7C6FE0 100%)`,
                  }}
                >
                  <div className="h-full w-full rounded-full overflow-hidden bg-white dark:bg-[#1E1E22] flex items-center justify-center relative">
                    {cat.image ? (
                      <img
                        src={cat.image}
                        alt={cat.name}
                        className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-110"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : null}
                    <div className="absolute inset-0 flex items-center justify-center -z-10 text-[#7C6FE0]">
                      <LayoutGrid className="h-7 w-7" />
                    </div>
                  </div>
                </div>
                <span className="text-xs font-extrabold text-[#1F1F23] dark:text-white group-hover:text-[#7C6FE0] transition">
                  {cat.name}
                </span>
                <span className="text-[10px] text-[#8A8A94] font-medium mt-0.5">{catCount.toLocaleString()} items</span>
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
              <option value="all">All Departments ({allProductsList.length})</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
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
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none max-w-full">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-[#7C6FE0] text-white shadow-xs'
                  : 'bg-black/5 dark:bg-white/5 text-[#8A8A94] hover:text-[#1F1F23] dark:hover:text-white'
              }`}
            >
              All Departments
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-[#7C6FE0] text-white shadow-xs'
                    : 'bg-black/5 dark:bg-white/5 text-[#8A8A94] hover:text-[#1F1F23] dark:hover:text-white'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#18181B] p-4 rounded-2xl border border-[#EDEDF2] dark:border-[#27272A] text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-1.5 font-bold cursor-pointer">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="rounded accent-[#7C6FE0]"
              />
              <span>In-Stock Items Only</span>
            </label>

            {selectedBrand !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#7C6FE0]/15 text-[#7C6FE0] font-bold">
                Brand: {selectedBrand}
                <button onClick={() => setSelectedBrand('all')} className="ml-1 hover:text-red-500 font-extrabold">×</button>
              </span>
            )}

            {selectedCollection !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold">
                Collection: {selectedCollection}
                <button onClick={() => setSelectedCollection('all')} className="ml-1 hover:text-red-500 font-extrabold">×</button>
              </span>
            )}
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
                setSelectedBrand('all');
                setSelectedCollection('all');
                setInStockOnly(false);
              }}
              className="text-xs font-bold text-[#7C6FE0] underline"
            >
              Clear all filters
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
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="border-b border-[#EDEDF2] dark:border-[#27272A] pb-4">
          <h2 className="text-xl font-black">Featured Brands & Designers</h2>
          <p className="text-xs text-[#8A8A94] mt-0.5">Shop authentic collections from leading global partner brands</p>
        </div>

        {dynamicBrands.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#CBD5E1] dark:border-[#27272A] bg-white/50 dark:bg-[#18181B]/50 p-10 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#7C6FE0]/15 text-[#7C6FE0]">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="font-extrabold text-sm">No Featured Brands Available</h3>
            <p className="text-xs text-[#8A8A94] max-w-md mx-auto leading-relaxed">
              Discover top products and authentic labels across all departments in our main store catalog.
            </p>
            <button
              onClick={() => setActiveTab('all-products')}
              className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-[#7C6FE0] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#6D60D6] transition"
            >
              <span>Explore All Products</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {dynamicBrands.map((b, i) => (
              <div
                key={i}
                className="p-5 rounded-2xl border border-[#EDEDF2] dark:border-[#27272A] bg-white dark:bg-[#18181B] hover:border-[#7C6FE0] transition group shadow-xs space-y-3 cursor-pointer"
                onClick={() => {
                  setSelectedBrand(b.name);
                  setActiveTab('all-products');
                  onShowToast(`Filtering products by brand: ${b.name}`);
                }}
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-sm group-hover:text-[#7C6FE0] transition">{b.name}</h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#7C6FE0]/15 text-[#7C6FE0]">
                    {b.count} {b.count === 1 ? 'item' : 'items'}
                  </span>
                </div>
                <p className="text-xs text-[#8A8A94] leading-relaxed">Official authentic catalog products from {b.name}.</p>
                <div className="flex items-center gap-1 text-xs font-bold text-[#7C6FE0]">
                  <span>Explore Catalog</span>
                  <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 7. COLLECTIONS VIEW
  if (activeTab === 'collections') {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="border-b border-[#EDEDF2] dark:border-[#27272A] pb-4">
          <h2 className="text-xl font-black">Curated Lookbooks & Collections</h2>
          <p className="text-xs text-[#8A8A94] mt-0.5">Explore expertly styled edits and seasonal lookbooks</p>
        </div>

        {dynamicCollections.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#CBD5E1] dark:border-[#27272A] bg-white/50 dark:bg-[#18181B]/50 p-10 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#7C6FE0]/15 text-[#7C6FE0]">
              <Layers className="h-6 w-6" />
            </div>
            <h3 className="font-extrabold text-sm">No Featured Collections Available</h3>
            <p className="text-xs text-[#8A8A94] max-w-md mx-auto leading-relaxed">
              Browse curated lookbooks, seasonal apparel, and lifestyle edits across our catalog.
            </p>
            <button
              onClick={() => setActiveTab('all-products')}
              className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-[#7C6FE0] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#6D60D6] transition"
            >
              <span>Explore All Products</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {dynamicCollections.map((col, i) => (
              <div
                key={i}
                onClick={() => {
                  setSelectedCollection(col.title);
                  setActiveTab('all-products');
                  onShowToast(`Opened collection: ${col.title}`);
                }}
                className="relative overflow-hidden rounded-3xl group cursor-pointer shadow-md min-h-[260px] flex flex-col justify-end p-6 text-white"
              >
                <img
                  src={col.image}
                  alt={col.title}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                <div className="relative z-10 space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded-full backdrop-blur-xs">
                    {col.count} {col.count === 1 ? 'item' : 'items'}
                  </span>
                  <h3 className="text-lg font-black leading-tight">{col.title}</h3>
                  <div className="pt-2 flex items-center gap-1 text-xs font-bold text-white underline underline-offset-4">
                    <span>Shop This Collection</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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

        <div className="rounded-3xl border border-dashed border-[#CBD5E1] dark:border-[#27272A] bg-white/50 dark:bg-[#18181B]/50 p-12 text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#7C6FE0]/15 text-[#7C6FE0]">
            <Package className="h-7 w-7" />
          </div>
          <h3 className="font-extrabold text-base">No Orders Placed Yet</h3>
          <p className="text-xs text-[#8A8A94] max-w-md mx-auto leading-relaxed">
            When you complete purchases, your real-time shipping status, carrier tracking details, and invoice receipts will appear here automatically.
          </p>
          <button
            onClick={() => setActiveTab('all-products')}
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[#7C6FE0] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#6D60D6] transition"
          >
            <span>Start Shopping</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
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
        {userAddresses.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#CBD5E1] dark:border-[#27272A] bg-white/50 dark:bg-[#18181B]/50 p-10 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#7C6FE0]/15 text-[#7C6FE0]">
              <MapPin className="h-6 w-6" />
            </div>
            <h3 className="font-extrabold text-sm">No Saved Delivery Addresses</h3>
            <p className="text-xs text-[#8A8A94] max-w-md mx-auto leading-relaxed">
              You haven't saved any delivery locations yet. Add your home, office, or secondary shipping address for instant checkout.
            </p>
            <button
              onClick={() => setNewAddressModal(true)}
              className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-[#7C6FE0] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#6D60D6] transition"
            >
              <Plus className="h-4 w-4" />
              <span>Add First Address</span>
            </button>
          </div>
        ) : (
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
                  {addr.phone && <p className="text-[11px] text-[#8A8A94]">{addr.phone}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

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
                defaultValue={currentUser?.name || ''}
                placeholder="Enter your full name"
                className="w-full rounded-xl border border-[#CBD5E1] dark:border-[#27272A] bg-white dark:bg-[#202024] p-2.5 font-semibold"
              />
            </div>
            <div>
              <label className="font-bold text-[#8A8A94] block mb-1">Email Address</label>
              <input
                type="email"
                defaultValue={currentUser?.email || ''}
                placeholder="Enter your email address"
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

  // 12. WISHLIST VIEW
  if (activeTab === 'wishlist') {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EDEDF2] dark:border-[#27272A] pb-4">
          <div>
            <h2 className="text-xl font-black">My Saved Wishlist</h2>
            <p className="text-xs text-[#8A8A94] mt-0.5">Quickly access items you saved for later purchase</p>
          </div>
          <button
            onClick={() => setActiveTab('all-products')}
            className="rounded-xl bg-[#7C6FE0] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#6D60D6] transition"
          >
            Explore Catalog
          </button>
        </div>

        {wishlist.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#CBD5E1] dark:border-[#27272A] bg-white/50 dark:bg-[#18181B]/50 p-12 text-center space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-500">
              <Sparkles className="h-7 w-7" />
            </div>
            <h3 className="font-extrabold text-base">Your Wishlist is Empty</h3>
            <p className="text-xs text-[#8A8A94] max-w-md mx-auto leading-relaxed">
              Tap the heart icon on any product in our store to save items here for fast access later!
            </p>
            <button
              onClick={() => setActiveTab('all-products')}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[#7C6FE0] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#6D60D6] transition"
            >
              <span>Browse Catalog Items</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {wishlist.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isWishlisted={true}
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

  // DEFAULT FALLBACK CATALOG VIEW (Never return null to prevent blank white screens)
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EDEDF2] dark:border-[#27272A] pb-4">
        <div>
          <h2 className="text-xl font-black">All Catalog Products</h2>
          <p className="text-xs text-[#8A8A94] mt-0.5">Explore our store catalog</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {allProductsList.map((product) => (
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
};
