/**
 * Unified Category Normalization and Matching Utility
 * Bridges category IDs, category names, Department slugs, and CSV imported values
 */

export interface DepartmentCategory {
  id: string;
  name: string;
  keywords: string[];
}

export const DEPARTMENT_CATEGORIES: DepartmentCategory[] = [
  {
    id: 'phones-tablets',
    name: 'Phones & Tablets',
    keywords: ['phone', 'phones', 'tablet', 'tablets', 'mobile', 'smartphone', 'ipad', 'iphone', 'android', 'cell'],
  },
  {
    id: 'appliances',
    name: 'Appliances',
    keywords: ['appliance', 'appliances', 'refrigerator', 'fridge', 'freezer', 'cooker', 'blender', 'microwave', 'washing machine', 'iron', 'oven', 'kitchen'],
  },
  {
    id: 'kids-baby',
    name: 'Kids & Baby',
    keywords: ['kid', 'kids', 'baby', 'babies', 'toddler', 'child', 'children', 'toy', 'toys', 'romper', 'infant', 'maternity'],
  },
  {
    id: 'fashion',
    name: 'Fashion',
    keywords: ['fashion', 'cloth', 'clothes', 'clothing', 'apparel', 'dress', 'shirt', 'suit', 'blazer', 't-shirt', 'pants', 'trousers', 'jacket', 'hoodie', 'wear'],
  },
  {
    id: 'beauty',
    name: 'Beauty',
    keywords: ['beauty', 'skincare', 'skin', 'cosmetic', 'cosmetics', 'serum', 'lotion', 'cream', 'makeup', 'cleanser', 'moisturizer'],
  },
  {
    id: 'sneakers',
    name: 'Sneakers',
    keywords: ['sneaker', 'sneakers', 'shoe', 'shoes', 'footwear', 'running', 'sport', 'sports', 'athletic', 'trainer', 'trainers', 'kicks', 'boots'],
  },
  {
    id: 'television',
    name: 'Television',
    keywords: ['tv', 'television', 'televisions', 'smart tv', 'screen', 'display', 'oled', 'qled', '4k', 'uhd', 'monitor'],
  },
  {
    id: 'home-office',
    name: 'Home & Office',
    keywords: ['home & office', 'home and office', 'office', 'desk', 'chair', 'furniture', 'workspace', 'ergonomic', 'bookshelf', 'lamp', 'decor'],
  },
  {
    id: 'supermarket',
    name: 'Supermarket',
    keywords: ['supermarket', 'grocery', 'groceries', 'food', 'pantry', 'coffee', 'tea', 'beverage', 'drink', 'snack', 'snacks', 'provisions'],
  },
  {
    id: 'mobile-accessories',
    name: 'Mobile Accessories',
    keywords: ['accessory', 'accessories', 'mobile accessories', 'charger', 'cable', 'power bank', 'powerbank', 'case', 'cover', 'screen protector', 'earphone', 'headphone', 'earbud', 'earbuds', 'adapter'],
  },
  {
    id: 'computing',
    name: 'Computing',
    keywords: ['computing', 'computer', 'computers', 'laptop', 'laptops', 'macbook', 'pc', 'desktop', 'notebook', 'keyboard', 'mouse', 'ssd', 'ram'],
  },
  {
    id: 'sillage-and-olfactory',
    name: 'Sillage & Olfactory',
    keywords: ['sillage', 'olfactory', 'sillage & olfactory', 'sillage and olfactory', 'perfume', 'perfumes', 'fragrance', 'fragrances', 'eau de parfum', 'cologne', 'scent', 'body spray', 'oud'],
  },
];

/**
 * Normalizes any category string into the canonical department name
 */
export function normalizeCategoryName(input: string | undefined): string {
  if (!input) return 'Phones & Tablets';
  const clean = input.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

  for (const dept of DEPARTMENT_CATEGORIES) {
    const cleanName = dept.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanId = dept.id.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (clean === cleanName || clean === cleanId) {
      return dept.name;
    }
    for (const kw of dept.keywords) {
      const cleanKw = kw.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (clean === cleanKw || (clean.length > 3 && clean.includes(cleanKw))) {
        return dept.name;
      }
    }
  }

  // Preserve original title casing if already sensible
  return input.trim();
}

/**
 * Returns true if a product's category matches the user's selected category ID or name filter.
 */
export function matchProductCategory(
  productCategory: string | undefined,
  selectedCategoryFilter: string | undefined
): boolean {
  if (!selectedCategoryFilter || selectedCategoryFilter === 'all') {
    return true;
  }
  if (!productCategory) {
    return false;
  }

  const target = selectedCategoryFilter.trim().toLowerCase();
  const prodCat = productCategory.trim().toLowerCase();

  // 1. Direct string equivalence
  if (target === prodCat) return true;

  // 2. Alphanumeric match (ignores hyphens, spaces, ampersands, slashes)
  const cleanTarget = target.replace(/[^a-z0-9]/g, '');
  const cleanProdCat = prodCat.replace(/[^a-z0-9]/g, '');

  if (cleanTarget === cleanProdCat) return true;
  if (cleanProdCat.includes(cleanTarget) || cleanTarget.includes(cleanProdCat)) {
    return true;
  }

  // 3. Match against department keywords
  const matchedDept = DEPARTMENT_CATEGORIES.find((dept) => {
    const cleanId = dept.id.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanName = dept.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return cleanTarget === cleanId || cleanTarget === cleanName || cleanTarget.includes(cleanId);
  });

  if (matchedDept) {
    for (const kw of matchedDept.keywords) {
      const cleanKw = kw.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanProdCat.includes(cleanKw) || cleanKw.includes(cleanProdCat)) {
        return true;
      }
    }
  }

  return false;
}
