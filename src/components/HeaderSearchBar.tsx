import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Flame, ChevronRight, Star, Tag } from 'lucide-react';
import { Product } from '../types';

interface HeaderSearchBarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  products: Product[];
  onSelectProduct: (p: Product) => void;
  onViewAllResults: (query: string) => void;
  isDarkMode: boolean;
}

export const HeaderSearchBar: React.FC<HeaderSearchBarProps> = ({
  searchQuery,
  setSearchQuery,
  products,
  onSelectProduct,
  onViewAllResults,
  isDarkMode,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filter matching products in real-time
  const matchingProducts = React.useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase().trim();
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query) ||
          (p.description && p.description.toLowerCase().includes(query))
      )
      .slice(0, 6);
  }, [products, searchQuery]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (e.target.value.trim().length > 0) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    setSearchQuery('');
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Enter') {
      setIsOpen(false);
      onViewAllResults(searchQuery);
    }
  };

  return (
    <div className="relative flex-1 max-w-2xl" ref={containerRef}>
      {/* Search Input Box */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B] dark:text-[#94A3B8] pointer-events-none" />
        <input
          type="text"
          id="main-search-input"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={() => {
            if (searchQuery.trim().length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search products, brands, categories (e.g. Cardigan, Cashmere, Tech)..."
          className={`w-full rounded-full border py-2.5 pl-11 pr-10 text-xs sm:text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-[#7C6FE0]/30 ${
            isDarkMode
              ? 'bg-[#1E1E22] border-[#27272A] text-[#F8FAFC] placeholder:text-[#94A3B8]'
              : 'bg-white border-[#CBD5E1] text-[#0F172A] placeholder:text-[#64748B] shadow-xs'
          }`}
        />
        {searchQuery && (
          <button
            id="search-clear-btn"
            onClick={handleClear}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] p-1 transition"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Real-time Match Dropdown */}
      {isOpen && searchQuery.trim().length > 0 && (
        <div
          id="search-autocomplete-dropdown"
          className={`absolute left-0 right-0 top-full mt-2 rounded-2xl border shadow-2xl z-50 overflow-hidden animate-fade-in ${
            isDarkMode
              ? 'bg-[#18181B] border-[#27272A] text-[#EDEDF2]'
              : 'bg-white border-[#EDEDF2] text-[#1F1F23]'
          }`}
        >
          {matchingProducts.length > 0 ? (
            <div>
              <div className="px-4 py-2.5 border-b border-[#EDEDF2] dark:border-[#27272A] bg-[#FAF9FC] dark:bg-[#202024] flex items-center justify-between text-[11px] font-bold text-[#8A8A94]">
                <span>Matching Products ({matchingProducts.length})</span>
                <span className="text-[#7C6FE0]">Click to view details</span>
              </div>

              <div className="divide-y divide-[#EDEDF2] dark:divide-[#27272A] max-h-[320px] overflow-y-auto scrollbar-thin">
                {matchingProducts.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setIsOpen(false);
                      onSelectProduct(p);
                    }}
                    className="w-full flex items-center gap-3.5 p-3 hover:bg-[#7C6FE0]/10 dark:hover:bg-[#7C6FE0]/15 transition text-left group"
                  >
                    <img
                      src={p.image}
                      alt={p.name}
                      referrerPolicy="no-referrer"
                      className="h-12 w-12 rounded-xl object-cover shrink-0 border border-[#EDEDF2] dark:border-[#27272A]"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-[#0F172A] dark:text-white truncate block group-hover:text-[#7C6FE0] transition">
                          {p.name}
                        </span>
                        {p.isHot && (
                          <span className="shrink-0 rounded-full bg-[#FF4D4D] px-1.5 py-0.2 text-[9px] font-bold text-white uppercase">
                            Hot
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-[#8A8A94] mt-0.5">
                        <span className="truncate">{p.category}</span>
                        <span>•</span>
                        <div className="flex items-center gap-0.5 text-amber-500 font-bold">
                          <Star className="h-2.5 w-2.5 fill-amber-500" />
                          <span>{p.rating}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-black text-xs text-[#7C6FE0] block">
                        ${p.price.toFixed(2)}
                      </span>
                      {p.originalPrice && p.originalPrice > p.price && (
                        <span className="text-[10px] text-[#8A8A94] line-through block">
                          ${p.originalPrice.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <div className="p-2 border-t border-[#EDEDF2] dark:border-[#27272A] bg-[#FAF9FC] dark:bg-[#202024]">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onViewAllResults(searchQuery);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-[#7C6FE0] hover:bg-[#7C6FE0]/10 transition"
                >
                  <span>View all results for "{searchQuery}"</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-xs space-y-1 text-[#8A8A94]">
              <p className="font-bold text-[#1F1F23] dark:text-white">No products found for "{searchQuery}"</p>
              <p className="text-[11px]">Try searching for fashion, cardigan, headphones, or audio accessories.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
