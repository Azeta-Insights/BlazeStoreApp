import React from 'react';
import {
  Shirt,
  Sparkles,
  Smartphone,
  Home,
  Activity,
  Grid,
  LucideIcon
} from 'lucide-react';
import { CATEGORIES } from '../data/mockData';

interface CategoryNavProps {
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
  isDarkMode: boolean;
}

const iconMap: Record<string, LucideIcon> = {
  Shirt,
  Sparkles,
  Smartphone,
  Home,
  Activity,
  Grid,
};

export const CategoryNav: React.FC<CategoryNavProps> = ({
  selectedCategory,
  onSelectCategory,
  isDarkMode,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base sm:text-lg font-extrabold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
          Explore Categories
        </h3>
        <span className="text-xs font-semibold text-[#475569] dark:text-[#94A3B8]">
          {selectedCategory === 'all' ? 'Showing all departments' : `Filtering by category`}
        </span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {CATEGORIES.map((cat) => {
          const Icon = iconMap[cat.iconName] || Grid;
          const isSelected = selectedCategory === cat.id;

          return (
            <button
              key={cat.id}
              id={`cat-card-${cat.id}`}
              onClick={() => onSelectCategory(isSelected ? 'all' : cat.id)}
              className={`group flex flex-col items-center justify-center rounded-2xl p-3.5 transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'bg-[#7C6FE0] text-white shadow-md shadow-[#7C6FE0]/25 scale-[1.03]'
                  : isDarkMode
                  ? 'bg-[#1E1E22] text-[#F8FAFC] hover:bg-[#27272A] border border-[#27272A]'
                  : 'bg-white text-[#0F172A] hover:bg-[#F8FAFC] border border-[#E2E8F0] shadow-xs'
              }`}
            >
              {/* Circular Icon Container */}
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-110 shadow-xs ${
                  isSelected ? 'bg-white text-[#7C6FE0]' : ''
                }`}
                style={{
                  backgroundColor: isSelected ? '#FFFFFF' : cat.colorBg,
                  color: isSelected ? '#7C6FE0' : cat.colorIcon,
                }}
              >
                <Icon className="h-6 w-6" />
              </div>

              {/* Category Name */}
              <span
                className={`mt-2 text-xs font-extrabold truncate max-w-full tracking-tight ${
                  isSelected ? 'text-white' : 'text-[#0F172A] dark:text-[#F8FAFC]'
                }`}
              >
                {cat.name}
              </span>

              {/* Item Count */}
              <span
                className={`text-[11px] font-semibold mt-0.5 ${
                  isSelected ? 'text-white/90' : 'text-[#64748B] dark:text-[#94A3B8]'
                }`}
              >
                {cat.itemCount.toLocaleString()}+ items
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
