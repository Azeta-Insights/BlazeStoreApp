import React from 'react';
import { Plus, Check, ShoppingBag, Sparkles } from 'lucide-react';
import { Product } from '../types';
import { formatNaira } from '../lib/currency';

interface FrequentlyBoughtTogetherProps {
  mainProduct: Product;
  allProducts: Product[];
  onAddBundleToCart: (products: Product[]) => void;
  onSelectProduct?: (product: Product) => void;
}

export function FrequentlyBoughtTogether({
  mainProduct,
  allProducts,
  onAddBundleToCart,
  onSelectProduct,
}: FrequentlyBoughtTogetherProps) {
  // Select 2 complementary products
  const complementaryProducts = React.useMemo(() => {
    const others = allProducts.filter((p) => p.id !== mainProduct.id && p.inStock !== false);
    const sameCategory = others.filter((p) => p.category === mainProduct.category);
    const diffCategory = others.filter((p) => p.category !== mainProduct.category);

    const bundle: Product[] = [];
    if (sameCategory.length > 0) bundle.push(sameCategory[0]);
    if (diffCategory.length > 0) {
      bundle.push(diffCategory[0]);
    } else if (sameCategory.length > 1) {
      bundle.push(sameCategory[1]);
    }
    return bundle.slice(0, 2);
  }, [mainProduct, allProducts]);

  const [selectedIds, setSelectedIds] = React.useState<string[]>([
    mainProduct.id,
    ...complementaryProducts.map((p) => p.id),
  ]);

  React.useEffect(() => {
    setSelectedIds([mainProduct.id, ...complementaryProducts.map((p) => p.id)]);
  }, [mainProduct.id, complementaryProducts]);

  if (complementaryProducts.length === 0) return null;

  const bundleItems = [mainProduct, ...complementaryProducts];
  const activeBundleItems = bundleItems.filter((p) => selectedIds.includes(p.id));

  const rawTotal = activeBundleItems.reduce((sum, p) => sum + p.price, 0);
  const bundleDiscountPercent = activeBundleItems.length > 1 ? 10 : 0; // 10% discount for bundle
  const discountedTotal = rawTotal * (1 - bundleDiscountPercent / 100);
  const savings = rawTotal - discountedTotal;

  const toggleItem = (productId: string) => {
    if (productId === mainProduct.id) return; // Main product is always included
    setSelectedIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const handleAddBundle = () => {
    if (activeBundleItems.length > 0) {
      onAddBundleToCart(activeBundleItems);
    }
  };

  return (
    <div
      id="frequently-bought-together-section"
      className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800"
    >
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-amber-500" />
        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
          Frequently Bought Together
        </h3>
        {bundleDiscountPercent > 0 && (
          <span className="ml-auto bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-xs font-semibold px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-700">
            Save 10% on Bundle
          </span>
        )}
      </div>

      {/* Visual Bundle Chain */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 mb-4">
        {bundleItems.map((item, index) => {
          const isSelected = selectedIds.includes(item.id);
          const isMain = item.id === mainProduct.id;

          return (
            <React.Fragment key={item.id}>
              {index > 0 && (
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-sm shrink-0">
                  <Plus className="w-3.5 h-3.5" />
                </div>
              )}
              <div
                className={`relative flex flex-col items-center p-2 rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-indigo-500/80 bg-white dark:bg-slate-800 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 opacity-60 bg-transparent'
                }`}
                onClick={() => toggleItem(item.id)}
              >
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-md overflow-hidden bg-slate-100 dark:bg-slate-700 mb-1.5">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  {isSelected && (
                    <div className="absolute top-1 left-1 bg-indigo-600 text-white rounded-full p-0.5 shadow-xs">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                  {isMain && (
                    <span className="absolute bottom-1 right-1 bg-slate-900/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                      This item
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 max-w-[80px] sm:max-w-[100px] truncate text-center">
                  {item.name}
                </span>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  {formatNaira(item.price)}
                </span>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Pricing & Add Bundle Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
        <div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Bundle Price ({activeBundleItems.length} items):
            </span>
            <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              {formatNaira(discountedTotal)}
            </span>
            {bundleDiscountPercent > 0 && (
              <span className="text-xs line-through text-slate-400">
                {formatNaira(rawTotal)}
              </span>
            )}
          </div>
          {savings > 0 && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              You save {formatNaira(savings)} with instant bundle discount!
            </p>
          )}
        </div>

        <button
          onClick={handleAddBundle}
          disabled={activeBundleItems.length === 0}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-50 transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Add Bundle to Cart</span>
        </button>
      </div>
    </div>
  );
}
