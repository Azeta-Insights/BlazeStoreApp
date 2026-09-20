import React from 'react';
import {
  Shirt,
  Sparkles,
  Smartphone,
  Home,
  Activity,
  Grid,
  Droplets,
  Tv,
  Briefcase,
  ShoppingBag,
  Headphones,
  Laptop,
  LucideIcon
} from 'lucide-react';
import { CATEGORIES } from '../data/mockData';
import { Product } from '../types';

interface CategoryNavProps {
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
  isDarkMode: boolean;
  products?: Product[];
}

const iconMap: Record<string, LucideIcon> = {
  Shirt,
  Sparkles,
  Smartphone,
  Home,
  Activity,
  Grid,
  Droplets,
  Tv,
  Briefcase,
  ShoppingBag,
  Headphones,
  Laptop,
};

export const CategoryNav: React.FC<CategoryNavProps> = ({
  selectedCategory,
  onSelectCategory,
  isDarkMode,
  products = [],
}) => {
  const getItemCount = (catId: string, catName: string) => {
    if (!products || products.length === 0) return 0;
    if (catId === 'all') return products.length;
    const nameLower = catName.toLowerCase();
    const idLower = catId.toLowerCase();
    return products.filter((p) => {
      const pCat = (p.category || '').toLowerCase();
      if (idLower === 'phones-tablets' || idLower === 'electronics') {
        return pCat.includes('phone') || pCat.includes('tablet') || pCat.includes('electronic') || pCat.includes('mobile');
      }
      if (idLower === 'appliances') {
        return pCat.includes('appliance') || pCat.includes('home') || pCat.includes('kitchen');
      }
      if (idLower === 'kids-baby') {
        return pCat.includes('kid') || pCat.includes('baby') || pCat.includes('child') || pCat.includes('toy');
      }
      if (idLower === 'fashion') {
        return pCat.includes('fashion') || pCat.includes('cloth') || pCat.includes('apparel');
      }
      if (idLower === 'beauty') {
        return pCat.includes('beauty') || pCat.includes('skin') || pCat.includes('cosmetic');
      }
      if (idLower === 'sneakers' || idLower === 'sports') {
        return pCat.includes('sneaker') || pCat.includes('shoe') || pCat.includes('sport') || pCat.includes('footwear');
      }
      if (idLower === 'television') {
        return pCat.includes('tv') || pCat.includes('television') || pCat.includes('screen');
      }
      if (idLower === 'home-office') {
        return pCat.includes('office') || pCat.includes('desk') || pCat.includes('furniture');
      }
      if (idLower === 'supermarket') {
        return pCat.includes('supermarket') || pCat.includes('grocery') || pCat.includes('food') || pCat.includes('pantry');
      }
      if (idLower === 'mobile-accessories') {
        return pCat.includes('accessory') || pCat.includes('accessories') || pCat.includes('charger') || pCat.includes('headphone');
      }
      if (idLower === 'computing') {
        return pCat.includes('comput') || pCat.includes('laptop') || pCat.includes('pc');
      }
      if (idLower === 'sillage-and-olfactory') {
        return pCat.includes('sillage') || pCat.includes('olfactory') || pCat.includes('perfume') || pCat.includes('fragrance') || pCat.includes('brand');
      }
      return pCat === nameLower || pCat.includes(idLower);
    }).length;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base sm:text-lg font-black tracking-tight text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2">
            <span>Explore Department Segments</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#7C6FE0]/15 text-[#7C6FE0]">
              Visual Catalog
            </span>
          </h3>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            Click any segment picture bubble to filter products instantly
          </p>
        </div>
        {selectedCategory !== 'all' && (
          <button
            onClick={() => onSelectCategory('all')}
            className="text-xs font-bold text-[#7C6FE0] hover:underline cursor-pointer"
          >
            Clear Filter
          </button>
        )}
      </div>

      {/* Category Picture Bubbles Row / Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
        {CATEGORIES.map((cat) => {
          const Icon = iconMap[cat.iconName] || Grid;
          const isSelected = selectedCategory === cat.id;
          const count = getItemCount(cat.id, cat.name);

          return (
            <button
              key={cat.id}
              id={`cat-card-${cat.id}`}
              onClick={() => onSelectCategory(isSelected ? 'all' : cat.id)}
              className={`group flex flex-col items-center text-center p-2.5 rounded-2xl transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'bg-[#7C6FE0]/10 border-2 border-[#7C6FE0] shadow-sm scale-[1.03]'
                  : isDarkMode
                  ? 'bg-[#1E1E22]/80 hover:bg-[#27272A] border border-[#27272A]'
                  : 'bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] shadow-xs'
              }`}
            >
              {/* Circular Picture Bubble Container */}
              <div
                className={`relative h-16 w-16 sm:h-20 sm:w-20 rounded-full p-1 transition-all duration-300 group-hover:scale-105 shadow-md ${
                  isSelected
                    ? 'ring-4 ring-[#7C6FE0] ring-offset-2 dark:ring-offset-[#121214]'
                    : 'group-hover:ring-2 group-hover:ring-[#7C6FE0]/60'
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
                        // Fallback to Icon if image fails
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : null}
                  {/* Backup Icon Overlay if Image is loading/missing */}
                  <div className="absolute inset-0 flex items-center justify-center -z-10 text-[#7C6FE0]">
                    <Icon className="h-7 w-7" />
                  </div>
                </div>

                {/* Active Check Badge */}
                {isSelected && (
                  <div className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-[#7C6FE0] text-white flex items-center justify-center border-2 border-white dark:border-[#1E1E22] shadow-xs text-[10px] font-black">
                    ✓
                  </div>
                )}
              </div>

              {/* Category Name */}
              <span
                className={`mt-2.5 text-xs font-black line-clamp-2 leading-tight tracking-tight ${
                  isSelected
                    ? 'text-[#7C6FE0] dark:text-[#A78BFA]'
                    : 'text-[#0F172A] dark:text-[#F8FAFC] group-hover:text-[#7C6FE0]'
                }`}
              >
                {cat.name}
              </span>

              {/* Item Count */}
              <span className="text-[10px] font-bold text-[#64748B] dark:text-[#94A3B8] mt-1">
                {count.toLocaleString()} items
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
