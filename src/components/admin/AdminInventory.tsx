import React, { useState, useEffect, useRef } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowUpDown,
  RefreshCw,
  Tag,
  DollarSign,
  Layers,
  X,
  Download,
  Upload,
  FileSpreadsheet,
  Bell,
  Sparkles
} from 'lucide-react';
import { Product, AdminRole } from '../../types';
import { api } from '../../services/api';
import { saveFirestoreDoc, clearAllFirestoreProducts } from '../../services/firestoreService';
import { ImageUploader } from '../ImageUploader';
import { ConfirmDeleteModal } from '../ConfirmDeleteModal';
import { formatNaira } from '../../lib/currency';
import { CATEGORIES } from '../../data/mockData';
import { normalizeCategoryName } from '../../utils/categoryMatcher';

export { normalizeCategoryName };

interface AdminInventoryProps {
  adminRole: AdminRole;
  isDarkMode: boolean;
  onShowToast: (msg: string) => void;
}

export const AdminInventory: React.FC<AdminInventoryProps> = ({
  adminRole,
  isDarkMode,
  onShowToast,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleClearAllInventory = async () => {
    setIsClearing(true);
    try {
      await api.clearAllProducts();
      await clearAllFirestoreProducts().catch(() => {});
      setProducts([]);
      onShowToast('✨ All mock products cleared! Inventory is now ready for real data.');
      setIsClearModalOpen(false);
    } catch (err) {
      console.error(err);
      onShowToast('❌ Failed to clear products');
    } finally {
      setIsClearing(false);
    }
  };

  // Add/Edit Form State
  const [formData, setFormData] = useState({
    name: '',
    category: 'Fashion',
    price: '',
    costPrice: '',
    originalPrice: '',
    stockQuantity: '30',
    sku: '',
    image: '',
    description: '',
    badge: 'New',
    isHot: false,
    inStock: true,
  });

  const loadInventory = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAdminProducts(
        selectedCategory !== 'all' ? selectedCategory : undefined,
        searchQuery || undefined
      );
      setProducts(data);
    } catch (e) {
      console.error('Failed to load inventory:', e);
      onShowToast('❌ Failed to load inventory');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, [selectedCategory, searchQuery]);

  const handleQuickStockUpdate = async (id: string, delta: number) => {
    const prod = products.find((p) => p.id === id);
    if (!prod) return;

    const currentStock = prod.stockQuantity ?? 0;
    const newStock = Math.max(0, currentStock + delta);
    const inStock = newStock > 0;

    // Optimistic local update
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, stockQuantity: newStock, inStock } : p))
    );

    try {
      await api.updateProductStock(id, newStock, inStock);
      await saveFirestoreDoc('products', id, { ...prod, stockQuantity: newStock, inStock }).catch(() => {});
      onShowToast(`📦 Stock updated: ${prod.name} now has ${newStock} units`);
    } catch (e) {
      console.error(e);
      onShowToast('❌ Failed to update stock');
      loadInventory();
    }
  };

  const handleToggleInStock = async (id: string) => {
    const prod = products.find((p) => p.id === id);
    if (!prod) return;

    const nextInStock = !prod.inStock;
    const nextStock = nextInStock ? Math.max(1, prod.stockQuantity ?? 10) : 0;

    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, inStock: nextInStock, stockQuantity: nextStock } : p))
    );

    try {
      await api.updateProductStock(id, nextStock, nextInStock);
      onShowToast(`Updated availability for ${prod.name}`);
    } catch (e) {
      console.error(e);
      onShowToast('❌ Failed to update availability');
      loadInventory();
    }
  };

  const openAddModal = () => {
    setFormData({
      name: '',
      category: 'Fashion',
      price: '',
      costPrice: '',
      originalPrice: '',
      stockQuantity: '',
      sku: '',
      image: '',
      description: '',
      badge: '',
      isHot: false,
      inStock: true,
    });
    setEditingProduct(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      category: p.category,
      price: p.price.toString(),
      costPrice: p.costPrice !== undefined ? p.costPrice.toString() : '',
      originalPrice: p.originalPrice ? p.originalPrice.toString() : '',
      stockQuantity: (p.stockQuantity ?? 0).toString(),
      sku: p.sku || '',
      image: p.image || '',
      description: p.description || '',
      badge: p.badge || '',
      isHot: Boolean(p.isHot),
      inStock: p.inStock !== false,
    });
    setIsAddModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingProduct) {
        // Update existing product
        const updated = await api.updateProduct(editingProduct.id, {
          name: formData.name,
          category: formData.category,
          price: Number(formData.price),
          costPrice: Number(formData.costPrice),
          originalPrice: formData.originalPrice ? Number(formData.originalPrice) : undefined,
          stockQuantity: Number(formData.stockQuantity),
          sku: formData.sku,
          image: formData.image,
          description: formData.description,
          badge: formData.badge,
          isHot: formData.isHot,
          inStock: Number(formData.stockQuantity) > 0 && formData.inStock,
        });
        await saveFirestoreDoc('products', editingProduct.id, {
          ...editingProduct,
          name: formData.name,
          category: formData.category,
          price: Number(formData.price),
          costPrice: Number(formData.costPrice),
          originalPrice: formData.originalPrice ? Number(formData.originalPrice) : undefined,
          stockQuantity: Number(formData.stockQuantity),
          sku: formData.sku,
          image: formData.image,
          description: formData.description,
          badge: formData.badge,
          isHot: formData.isHot,
          inStock: Number(formData.stockQuantity) > 0 && formData.inStock,
        }).catch(() => {});
        onShowToast(`✅ "${updated.name}" updated successfully`);
      } else {
        // Create new product
        const created = await api.createProduct({
          name: formData.name,
          category: formData.category,
          price: Number(formData.price),
          costPrice: Number(formData.costPrice),
          originalPrice: formData.originalPrice ? Number(formData.originalPrice) : undefined,
          stockQuantity: Number(formData.stockQuantity),
          sku: formData.sku,
          image: formData.image,
          description: formData.description,
          badge: formData.badge,
          isHot: formData.isHot,
          inStock: Number(formData.stockQuantity) > 0 && formData.inStock,
        });
        await saveFirestoreDoc('products', created.id, created).catch(() => {});
        onShowToast(`🎉 "${created.name}" created and added to inventory!`);
      }
      setIsAddModalOpen(false);
      loadInventory();
    } catch (err: any) {
      console.error(err);
      onShowToast(`❌ Error: ${err?.message || 'Failed to save product'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = (p: Product) => {
    setProductToDelete(p);
  };

  const handleConfirmDeleteProduct = async () => {
    if (!productToDelete) return;
    const targetId = productToDelete.id;
    const targetName = productToDelete.name;
    setIsDeleting(true);
    // Optimistically update local inventory state
    setProducts((prev) => prev.filter((p) => String(p.id) !== String(targetId)));
    try {
      await api.deleteProduct(targetId);
      onShowToast(`🗑️ "${targetName}" removed from catalog.`);
      setProductToDelete(null);
      if (editingProduct?.id === targetId) {
        setIsAddModalOpen(false);
        setEditingProduct(null);
      }
      await loadInventory();
    } catch (e: any) {
      console.error(e);
      onShowToast(`❌ Delete failed: ${e?.message || 'Server error'}`);
      await loadInventory();
    } finally {
      setIsDeleting(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  // CSV Export Handler
  const handleExportCSV = () => {
    if (products.length === 0) {
      onShowToast('⚠️ No products available to export.');
      return;
    }

    const headers = [
      'ID',
      'Name',
      'Category',
      'Brand',
      'Collection',
      'Price',
      'OriginalPrice',
      'CostPrice',
      'StockQuantity',
      'SKU',
      'IsDeal',
      'IsBestSeller',
      'IsNewArrival',
      'IsHot',
      'Badge',
      'Colors',
      'InStock',
      'Rating',
      'ImageURL',
      'Description',
    ];

    const rows = products.map((p) => [
      p.id,
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${(p.category || '').replace(/"/g, '""')}"`,
      `"${(p.brand || '').replace(/"/g, '""')}"`,
      `"${(p.collection || '').replace(/"/g, '""')}"`,
      p.price,
      p.originalPrice ?? '',
      p.costPrice ?? 0,
      p.stockQuantity ?? 0,
      `"${(p.sku || '').replace(/"/g, '""')}"`,
      p.isDeal ? 'TRUE' : 'FALSE',
      p.isBestSeller ? 'TRUE' : 'FALSE',
      p.isNewArrival ? 'TRUE' : 'FALSE',
      p.isHot ? 'TRUE' : 'FALSE',
      `"${(p.badge || '').replace(/"/g, '""')}"`,
      `"${(p.colors ? p.colors.join(', ') : '').replace(/"/g, '""')}"`,
      p.inStock !== false ? 'TRUE' : 'FALSE',
      p.rating ?? 5,
      `"${(p.image || '').replace(/"/g, '""')}"`,
      `"${(p.description || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `blazestore-products-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast(`📥 Exported ${products.length} segmented catalog items to CSV.`);
  };

  const downloadSampleCsvTemplate = () => {
    const templateContent = [
      'Name,Category,Brand,Collection,Price,OriginalPrice,CostPrice,StockQuantity,SKU,ImageURL,Description,IsDeal,IsBestSeller,IsNewArrival,Badge,Colors',
      '"iPhone 15 Pro Max 256GB","Phones & Tablets","Apple","Flagship Mobile",1450000,1600000,1200000,10,"BLZ-PHO-1001","https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500","Titanium natural finish 6.7-inch Super Retina XDR display",TRUE,TRUE,TRUE,"Hot Deal","Natural Titanium, Blue Titanium"',
      '"Double Door Inverter Refrigerator","Appliances","Nexus","Kitchen Essentials",380000,420000,310000,8,"BLZ-APP-2001","https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=500","Energy efficient 250L double door frost-free refrigerator",TRUE,FALSE,FALSE,"10% OFF","Silver, Stainless Steel"',
      '"Floral Baby Romper Set","Kids & Baby","Carter\'s","Baby Care 2026",18000,24000,11000,30,"BLZ-KID-3001","https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=500","Soft organic cotton 3-piece baby outfit set",FALSE,TRUE,TRUE,"New Arrival","Pink, Pastel Blue"',
      '"Tailored Italian Wool Blazer","Fashion","Zara","Executive Wear",85000,110000,55000,12,"BLZ-FAS-4001","https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=500","Classic slim-fit Italian wool blazer for business and gala",TRUE,TRUE,FALSE,"Popular","Navy Blue, Charcoal Gray"',
      '"Vitamin C Brightening Serum","Beauty","CeraVe","Skincare Glow",22000,28000,14000,45,"BLZ-BEA-5001","https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500","Dermatologist tested 10% pure vitamin C antioxidant serum",TRUE,TRUE,TRUE,"Best Seller","Clear"',
      '"Air Max Retro Running Sneakers","Sneakers","Nike","Sportswear Classics",95000,120000,62000,20,"BLZ-SNK-6001","https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500","Lightweight breathable mesh athletic running shoes",TRUE,TRUE,FALSE,"Top Choice","Red/White, Black/Lime"',
      '"55-inch 4K UHD Smart TV","Television","Samsung","Home Entertainment",420000,480000,350000,6,"BLZ-TV-7001","https://images.unsplash.com/photo-1593784991095-a205069470b6?w=500","Crystal 4K HDR smart television with voice remote",TRUE,FALSE,TRUE,"4K Ultra HD","Black"',
      '"Ergonomic Executive Office Chair","Home & Office","Herman Miller","Workspace 2026",175000,210000,125000,15,"BLZ-OFF-8001","https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=500","Breathable mesh lumbar support adjustable swivel office chair",FALSE,TRUE,FALSE,"Ergonomic","Black, Space Gray"',
      '"Gold Roast Coffee & Granola Pantry Pack","Supermarket","Nestle","Pantry Specials",12500,15000,8500,50,"BLZ-SUP-9001","https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=500","Premium roasted coffee beans with crunchy honey granola duo",TRUE,FALSE,FALSE,"Bulk Deal","Standard"',
      '"Fast Charging Power Bank 20,000mAh","Mobile Accessories","Anker","Power Essentials",32000,40000,21000,35,"BLZ-ACC-1001","https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=500","PD 22.5W fast charge dual USB-C portable battery bank",TRUE,TRUE,TRUE,"Fast Charge","Black, White"',
      '"MacBook Air M3 15-inch 16GB","Computing","Apple","Pro Laptops",1650000,1800000,1380000,8,"BLZ-CMP-1101","https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500","Ultra-thin M3 chip laptop with Liquid Retina display",TRUE,TRUE,TRUE,"M3 Chip","Midnight, Starlight"',
      '"Oud Royal Eau De Parfum 100ml","Sillage & Olfactory","Tom Ford","Sillage Collection",185000,220000,130000,12,"BLZ-SIL-1201","https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=500","Exquisite oriental wood and amber unisex eau de parfum",TRUE,TRUE,TRUE,"Exclusive","Gold Bottle"',
    ].join('\n');

    const blob = new Blob([templateContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'blazestore-inventory-template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast('📄 Downloaded inventory CSV template pre-segmented across all 12 departments.');
  };

  // Helper to parse CSV line handling quoted values
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result.map((col) => col.replace(/^"|"$/g, '').trim());
  };

  // CSV Import Handler
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        if (!text) return;

        const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        if (lines.length <= 1) {
          onShowToast('⚠️ CSV file contains no product rows.');
          return;
        }

        // Parse header row
        const headerCols = parseCSVLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
        
        // Find column indices
        const findColIndex = (keywords: string[]): number => {
          return headerCols.findIndex((h) => keywords.some((kw) => h.includes(kw)));
        };

        const idxName = findColIndex(['name', 'title', 'product']);
        const idxCategory = findColIndex(['category', 'dept', 'department', 'type']);
        const idxBrand = findColIndex(['brand', 'designer', 'vendor', 'make', 'manufacturer']);
        const idxCollection = findColIndex(['collection', 'lookbook', 'season', 'series']);
        const idxPrice = findColIndex(['price', 'costunit', 'retail']);
        const idxOrigPrice = findColIndex(['originalprice', 'crossedprice', 'compareprice', 'rrp', 'listprice']);
        const idxCostPrice = findColIndex(['costprice', 'buyingprice', 'cost']);
        const idxStock = findColIndex(['stockquantity', 'stock', 'quantity', 'qty', 'count']);
        const idxSku = findColIndex(['sku', 'code', 'barcode', 'itemcode']);
        const idxImage = findColIndex(['imageurl', 'image', 'photo', 'picture', 'img']);
        const idxDesc = findColIndex(['description', 'desc', 'details', 'summary']);
        const idxBadge = findColIndex(['badge', 'promobadge', 'tagline', 'label']);
        const idxIsDeal = findColIndex(['isdeal', 'deal', 'flashsale']);
        const idxIsBestSeller = findColIndex(['isbestseller', 'bestseller', 'topitem']);
        const idxIsNewArrival = findColIndex(['isnewarrival', 'newarrival', 'isnew']);
        const idxIsHot = findColIndex(['ishot', 'hot', 'trending']);
        const idxColors = findColIndex(['colors', 'color', 'swatches']);

        const parseBool = (val?: string): boolean => {
          if (!val) return false;
          const v = val.toLowerCase();
          return v === 'true' || v === '1' || v === 'yes' || v === 'y';
        };

        const newItems: Partial<Product>[] = [];

        for (let i = 1; i < lines.length; i++) {
          const cols = parseCSVLine(lines[i]);
          if (cols.length < 2) continue;

          // Header-mapped values or fallback
          let name = idxName !== -1 ? cols[idxName] : cols[0];
          let categoryRaw = idxCategory !== -1 ? cols[idxCategory] : (cols[1] || 'Phones & Tablets');
          let category = normalizeCategoryName(categoryRaw);
          let brand = idxBrand !== -1 ? cols[idxBrand] : undefined;
          let collection = idxCollection !== -1 ? cols[idxCollection] : undefined;
          let priceStr = idxPrice !== -1 ? cols[idxPrice] : cols[2];
          let origStr = idxOrigPrice !== -1 ? cols[idxOrigPrice] : cols[8];
          let costStr = idxCostPrice !== -1 ? cols[idxCostPrice] : cols[7];
          let stockStr = idxStock !== -1 ? cols[idxStock] : cols[3];
          let sku = idxSku !== -1 ? cols[idxSku] : cols[4];
          let image = idxImage !== -1 ? cols[idxImage] : cols[5];
          let desc = idxDesc !== -1 ? cols[idxDesc] : cols[6];
          let badge = idxBadge !== -1 ? cols[idxBadge] : undefined;
          let isDeal = idxIsDeal !== -1 ? parseBool(cols[idxIsDeal]) : false;
          let isBestSeller = idxIsBestSeller !== -1 ? parseBool(cols[idxIsBestSeller]) : false;
          let isNewArrival = idxIsNewArrival !== -1 ? parseBool(cols[idxIsNewArrival]) : false;
          let isHot = idxIsHot !== -1 ? parseBool(cols[idxIsHot]) : false;
          let colorsStr = idxColors !== -1 ? cols[idxColors] : undefined;

          // Fallback if column 1 looks like ID
          if (cols[0] && (cols[0].startsWith('prod-') || cols[0].startsWith('imp-')) && idxName === -1) {
            name = cols[1];
            category = cols[2] || 'General';
            priceStr = cols[3];
            stockStr = cols[4];
            sku = cols[5];
            image = cols[6];
            desc = cols[7];
          }

          if (name && (priceStr || idxPrice !== -1)) {
            const itemPrice = parseFloat((priceStr || '0').replace(/[^0-9.]/g, '')) || 10000;
            const itemStock = parseInt((stockStr || '15').replace(/[^0-9]/g, ''), 10);
            const origPrice = origStr ? parseFloat(origStr.replace(/[^0-9.]/g, '')) : undefined;
            const costPrice = costStr ? parseFloat(costStr.replace(/[^0-9.]/g, '')) : itemPrice * 0.55;

            // Auto-detect isDeal, isBestSeller, isNewArrival if badge/discount implies it
            if (!badge && origPrice && origPrice > itemPrice) {
              const pct = Math.round(((origPrice - itemPrice) / origPrice) * 100);
              badge = `${pct}% OFF`;
              isDeal = true;
            }

            const colorsArray = colorsStr
              ? colorsStr.split(/[,|]/).map((c) => c.trim()).filter(Boolean)
              : undefined;

            const productObj: Partial<Product> = {
              name,
              category: category || 'General',
              brand: brand || undefined,
              collection: collection || undefined,
              price: itemPrice,
              originalPrice: origPrice,
              costPrice: costPrice,
              stockQuantity: itemStock >= 0 ? itemStock : 0,
              sku: sku || '',
              inStock: itemStock > 0,
              rating: 5,
              reviewCount: 0,
              badge: badge || (isNewArrival ? 'New Arrival' : isBestSeller ? 'Best Seller' : isDeal ? 'Hot Deal' : 'In Stock'),
              isDeal,
              isBestSeller,
              isNewArrival,
              isHot: isHot || isDeal,
              colors: colorsArray,
              image: image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=80',
              description: desc || '',
            };
            newItems.push(productObj);
          }
        }

        if (newItems.length > 0) {
          const res = await api.bulkImportProducts(newItems);
          const imported = res.products && res.products.length > 0 ? res.products : (newItems as Product[]);
          setProducts((prev) => [...imported, ...prev.filter((p) => !imported.some((ip) => ip.id === p.id))]);
          for (const p of imported) {
            if (p.id) {
              await saveFirestoreDoc('products', p.id, p).catch(() => {});
            }
          }
          try {
            localStorage.removeItem('blazestore_bootstrap_cache');
            window.dispatchEvent(new CustomEvent('blazestore:products_updated', { detail: { products: imported } }));
          } catch {}
          onShowToast(`🚀 Successfully imported ${imported.length} products with immediate Storefront & Category sync!`);
        } else {
          onShowToast('⚠️ Could not parse valid product rows from CSV.');
        }
      } catch (err: any) {
        onShowToast(`❌ Failed to parse CSV: ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Restock All Low Stock Items in Batch
  const handleRestockAllLow = async () => {
    const lowItems = products.filter((p) => (p.stockQuantity ?? 0) <= 10);
    if (lowItems.length === 0) {
      onShowToast('✅ All inventory items are sufficiently stocked!');
      return;
    }

    setProducts((prev) =>
      prev.map((p) => {
        if ((p.stockQuantity ?? 0) <= 10) {
          return { ...p, stockQuantity: (p.stockQuantity ?? 0) + 30, inStock: true };
        }
        return p;
      })
    );

    // Persist each in background
    for (const item of lowItems) {
      const newStock = (item.stockQuantity ?? 0) + 30;
      api.updateProductStock(item.id, newStock, true).catch(() => {});
    }

    onShowToast(`⚡ Batch restocked ${lowItems.length} low-stock items (+30 units each)!`);
  };

  // Filter products by stock alert
  const filteredProducts = products.filter((p) => {
    const qty = p.stockQuantity ?? 0;
    if (stockFilter === 'low') return qty > 0 && qty <= 10;
    if (stockFilter === 'out') return qty === 0 || p.inStock === false;
    return true;
  });

  const totalSKUs = products.length;
  const inStockCount = products.filter((p) => (p.stockQuantity ?? 0) > 0 && p.inStock !== false).length;
  const lowStockCount = products.filter((p) => (p.stockQuantity ?? 0) > 0 && (p.stockQuantity ?? 0) <= 10).length;
  const outOfStockCount = products.filter((p) => (p.stockQuantity ?? 0) === 0 || p.inStock === false).length;
  const totalInventoryValue = products.reduce((sum, p) => sum + p.price * (p.stockQuantity ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black tracking-tight">Manage Inventory &amp; Catalog</h2>
            <span className="rounded-full bg-[#10B981]/15 px-2.5 py-0.5 text-xs font-bold text-[#10B981]">
              Live Synced
            </span>
          </div>
          <p className="text-xs text-[#8A8A94] mt-0.5">
            Monitor real-time warehouse stock, adjust unit quantities, and add new SKUs.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* CSV Import/Export Buttons */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportCSV}
            accept=".csv"
            className="hidden"
          />

          <button
            onClick={downloadSampleCsvTemplate}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
              isDarkMode
                ? 'border-[#27272A] text-[#A1A1AA] hover:bg-[#202024] hover:text-white'
                : 'border-[#EDEDF2] text-[#52525B] hover:bg-[#FAF9FC] hover:text-[#1F1F23]'
            }`}
            title="Download blank CSV template pre-segmented for stock import"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-[#7C6FE0]" />
            <span>CSV Template</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
              isDarkMode
                ? 'border-[#27272A] text-[#A1A1AA] hover:bg-[#202024] hover:text-white'
                : 'border-[#EDEDF2] text-[#52525B] hover:bg-[#FAF9FC] hover:text-[#1F1F23]'
            }`}
            title="Import real products from CSV spreadsheet"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={handleExportCSV}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
              isDarkMode
                ? 'border-[#27272A] text-[#A1A1AA] hover:bg-[#202024] hover:text-white'
                : 'border-[#EDEDF2] text-[#52525B] hover:bg-[#FAF9FC] hover:text-[#1F1F23]'
            }`}
            title="Download product catalog as CSV"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setIsClearModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 text-xs font-bold transition cursor-pointer"
            title="Clear mock or out-of-stock demo inventory"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear Mock Stock</span>
          </button>

          <button
            onClick={loadInventory}
            className={`p-2 rounded-xl border text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5 transition ${
              isDarkMode ? 'border-[#27272A] text-[#A1A1AA]' : 'border-[#EDEDF2] text-[#52525B]'
            }`}
            title="Refresh inventory"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            id="add-product-btn"
            onClick={openAddModal}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#A78BFA] to-[#7C6FE0] px-4 py-2 text-xs font-bold text-white shadow-sm shadow-[#7C6FE0]/30 hover:opacity-95 transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* 12 Synced Department Segments Helper Banner */}
      <div className="p-3.5 rounded-2xl bg-[#7C6FE0]/10 border border-[#7C6FE0]/25 text-xs space-y-1.5 shadow-xs">
        <div className="flex items-center gap-2 font-black text-[#7C6FE0]">
          <Sparkles className="h-4 w-4" />
          <span>12 Department Segments Synced for Stock Import &amp; CSV Template</span>
        </div>
        <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
          When preparing your stock upload spreadsheet, use any of these 12 official department segment names in the <strong>Category</strong> column to automatically populate picture bubbles and catalog filters:
        </p>
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {CATEGORIES.map((cat) => (
            <span
              key={cat.id}
              className="text-[10px] font-extrabold px-2.5 py-1 rounded-lg bg-white dark:bg-[#18181B] border border-[#EDEDF2] dark:border-[#27272A] text-[#1F1F23] dark:text-[#F8FAFC] shadow-2xs flex items-center gap-1.5"
            >
              {cat.image ? (
                <img src={cat.image} alt={cat.name} className="h-3.5 w-3.5 rounded-full object-cover" />
              ) : null}
              <span>{cat.name}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Automated Low-Stock Alert Banner */}
      {lowStockCount > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h4 className="font-bold text-xs sm:text-sm">
                Automated Low-Stock Alert: {lowStockCount} items below threshold (≤10 units)
              </h4>
              <p className="text-[11px] opacity-80">
                Prevent order fulfillment delays by restocking high-demand catalog items immediately.
              </p>
            </div>
          </div>

          <button
            onClick={handleRestockAllLow}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Restock All Low Items (+30)</span>
          </button>
        </div>
      )}

      {/* Inventory KPI Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div
          onClick={() => setStockFilter('all')}
          className={`cursor-pointer rounded-2xl p-4 border transition-all ${
            stockFilter === 'all'
              ? 'border-[#7C6FE0] ring-2 ring-[#7C6FE0]/20'
              : 'border-[#EDEDF2] dark:border-[#27272A]'
          } ${isDarkMode ? 'bg-[#18181B]' : 'bg-white shadow-xs'}`}
        >
          <span className="text-[11px] font-bold text-[#8A8A94] uppercase tracking-wider block">Total SKUs</span>
          <span className="text-xl font-black mt-1 block">{totalSKUs}</span>
          <span className="text-[10px] text-[#7C6FE0] font-bold">Catalog Items</span>
        </div>

        <div
          onClick={() => setStockFilter('all')}
          className={`cursor-pointer rounded-2xl p-4 border transition-all ${
            isDarkMode ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-[#EDEDF2] shadow-xs'
          }`}
        >
          <span className="text-[11px] font-bold text-[#8A8A94] uppercase tracking-wider block">In Stock</span>
          <span className="text-xl font-black mt-1 block text-[#4CAF50]">{inStockCount}</span>
          <span className="text-[10px] text-[#4CAF50] font-bold">Available to buy</span>
        </div>

        <div
          onClick={() => setStockFilter('low')}
          className={`cursor-pointer rounded-2xl p-4 border transition-all ${
            stockFilter === 'low'
              ? 'border-[#D97706] ring-2 ring-[#D97706]/20'
              : 'border-[#EDEDF2] dark:border-[#27272A]'
          } ${isDarkMode ? 'bg-[#18181B]' : 'bg-white shadow-xs'}`}
        >
          <span className="text-[11px] font-bold text-[#8A8A94] uppercase tracking-wider block">Low Stock (≤10)</span>
          <span className="text-xl font-black mt-1 block text-[#D97706]">{lowStockCount}</span>
          <span className="text-[10px] text-[#D97706] font-bold">Needs restock</span>
        </div>

        <div
          onClick={() => setStockFilter('out')}
          className={`cursor-pointer rounded-2xl p-4 border transition-all ${
            stockFilter === 'out'
              ? 'border-[#E11D48] ring-2 ring-[#E11D48]/20'
              : 'border-[#EDEDF2] dark:border-[#27272A]'
          } ${isDarkMode ? 'bg-[#18181B]' : 'bg-white shadow-xs'}`}
        >
          <span className="text-[11px] font-bold text-[#8A8A94] uppercase tracking-wider block">Out of Stock</span>
          <span className="text-xl font-black mt-1 block text-[#E11D48]">{outOfStockCount}</span>
          <span className="text-[10px] text-[#E11D48] font-bold">0 Units remaining</span>
        </div>

        <div
          className={`col-span-2 lg:col-span-1 rounded-2xl p-4 border ${
            isDarkMode ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-[#EDEDF2] shadow-xs'
          }`}
        >
          <span className="text-[11px] font-bold text-[#8A8A94] uppercase tracking-wider block">Stock Asset Value</span>
          <span className="text-xl font-black mt-1 block text-[#7C6FE0]">
            {formatNaira(totalInventoryValue)}
          </span>
          <span className="text-[10px] text-[#8A8A94] font-medium">Retail Value</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className={`rounded-2xl p-3 border flex flex-col md:flex-row items-center justify-between gap-3 ${
          isDarkMode ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-[#EDEDF2] shadow-xs'
        }`}
      >
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A8A94]" />
          <input
            type="text"
            placeholder="Search by product name or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full rounded-xl pl-9 pr-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#7C6FE0] ${
              isDarkMode ? 'bg-[#202024] border border-[#27272A] text-white' : 'bg-[#FAF9FC] border border-[#EDEDF2] text-[#1F1F23]'
            }`}
          />
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="h-4 w-4 text-[#8A8A94] shrink-0" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className={`rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#7C6FE0] ${
              isDarkMode ? 'bg-[#202024] border border-[#27272A] text-white' : 'bg-[#FAF9FC] border border-[#EDEDF2] text-[#1F1F23]'
            }`}
          >
            <option value="all">All Departments ({products.length})</option>
            {CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.name}>
                {cat.name}
              </option>
            ))}
          </select>

          {stockFilter !== 'all' && (
            <button
              onClick={() => setStockFilter('all')}
              className="flex items-center gap-1 text-xs font-bold text-[#7C6FE0] bg-[#7C6FE0]/10 px-2.5 py-1.5 rounded-xl hover:bg-[#7C6FE0]/20"
            >
              <span>Clear Filter: {stockFilter}</span>
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Inventory Table */}
      <div
        className={`rounded-2xl border overflow-hidden ${
          isDarkMode ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-[#EDEDF2] shadow-xs'
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead
              className={`border-b text-[11px] font-bold uppercase tracking-wider text-[#8A8A94] ${
                isDarkMode ? 'bg-[#202024] border-[#27272A]' : 'bg-[#FAF9FC] border-[#EDEDF2]'
              }`}
            >
              <tr>
                <th className="py-3 px-4">Item & SKU</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Retail Price</th>
                <th className="py-3 px-4 text-center">Stock Units</th>
                <th className="py-3 px-4 text-center">Quick Adjust</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDEDF2] dark:divide-[#27272A]">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((p) => {
                  const qty = p.stockQuantity ?? 0;
                  const isLow = qty > 0 && qty <= 10;
                  const isOut = qty === 0 || p.inStock === false;

                  return (
                    <tr key={p.id} className="hover:bg-black/2 dark:hover:bg-white/2 transition">
                      {/* Product details */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={p.image}
                            alt={p.name}
                            referrerPolicy="no-referrer"
                            className="h-11 w-11 rounded-xl object-cover bg-[#F7F7FA] border border-[#EDEDF2] dark:border-[#333]"
                          />
                          <div className="min-w-0">
                            <span className="font-bold block truncate max-w-[200px] sm:max-w-xs">{p.name}</span>
                            <span className="text-[10px] text-[#8A8A94] font-mono block">
                              {p.sku || `BLZ-${p.id.slice(-6).toUpperCase()}`}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 font-medium text-[#52525B] dark:text-[#A1A1AA]">
                        <span className="inline-block rounded-md bg-[#FAF9FC] dark:bg-[#202024] px-2 py-0.5 border border-[#EDEDF2] dark:border-[#333]">
                          {p.category}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="py-3 px-4 text-right font-bold text-[#7C6FE0]">
                        {formatNaira(p.price)}
                      </td>

                      {/* Stock units with badge */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 font-bold text-xs px-2.5 py-1 rounded-full ${
                            isOut
                              ? 'bg-[#FCE7F3] text-[#BE185D]'
                              : isLow
                              ? 'bg-[#FEF3C7] text-[#D97706]'
                              : 'bg-[#E3F2DD] text-[#2E7D32]'
                          }`}
                        >
                          {isOut && <XCircle className="h-3 w-3" />}
                          {isLow && <AlertTriangle className="h-3 w-3" />}
                          {!isLow && !isOut && <CheckCircle2 className="h-3 w-3" />}
                          <span>{qty} in stock</span>
                        </span>
                      </td>

                      {/* Quick Adjust Buttons */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1 bg-[#FAF9FC] dark:bg-[#202024] p-1 rounded-xl border border-[#EDEDF2] dark:border-[#333]">
                          <button
                            onClick={() => handleQuickStockUpdate(p.id, -1)}
                            disabled={qty <= 0}
                            className="h-6 w-6 rounded-lg flex items-center justify-center font-bold text-xs hover:bg-[#EDEDF2] dark:hover:bg-[#27272A] disabled:opacity-30"
                            title="Decrease stock by 1"
                          >
                            -1
                          </button>
                          <button
                            onClick={() => handleQuickStockUpdate(p.id, 1)}
                            className="h-6 w-6 rounded-lg flex items-center justify-center font-bold text-xs text-[#7C6FE0] hover:bg-[#7C6FE0]/10"
                            title="Add 1 unit"
                          >
                            +1
                          </button>
                          <button
                            onClick={() => handleQuickStockUpdate(p.id, 10)}
                            className="h-6 px-1.5 rounded-lg flex items-center justify-center font-bold text-[10px] bg-[#7C6FE0]/15 text-[#7C6FE0] hover:bg-[#7C6FE0] hover:text-white transition"
                            title="Restock +10 units"
                          >
                            +10
                          </button>
                        </div>
                      </td>

                      {/* In Stock toggle */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleInStock(p.id)}
                          className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition ${
                            p.inStock !== false && qty > 0
                              ? 'bg-[#E3F2DD] border-[#A3E635] text-[#2E7D32]'
                              : 'bg-[#FEE2E2] border-[#FCA5A5] text-[#991B1B]'
                          }`}
                        >
                          {p.inStock !== false && qty > 0 ? 'Active' : 'Disabled'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-1.5 rounded-lg text-[#52525B] dark:text-[#A1A1AA] hover:bg-[#FAF9FC] dark:hover:bg-[#27272A] transition"
                            title="Edit product"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>

                          {adminRole === 'owner' && (
                            <button
                              onClick={() => handleDeleteProduct(p)}
                              className="p-1.5 rounded-lg text-[#FF4D4D] hover:bg-[#FF4D4D]/10 transition"
                              title="Delete product (Owner only)"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#8A8A94]">
                    No inventory products match your search or filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setIsAddModalOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
          />

          <div
            className={`relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6 shadow-2xl ${
              isDarkMode ? 'bg-[#18181B] text-white border border-[#27272A]' : 'bg-white text-[#1F1F23]'
            }`}
          >
            <div className="flex items-center justify-between border-b border-[#EDEDF2] dark:border-[#27272A] pb-4 mb-4">
              <div>
                <h3 className="font-bold text-base">
                  {editingProduct ? 'Edit Catalog Product' : 'Add New Inventory SKU'}
                </h3>
                <span className="text-[11px] text-[#8A8A94]">Live store catalog updates</span>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-[#8A8A94] hover:bg-[#F7F7FA] dark:hover:bg-[#27272A]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div>
                <label className="text-[11px] font-bold text-[#8A8A94] block mb-1">Product Title *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Vintage Leather Messenger Bag"
                  className="w-full rounded-xl border border-[#EDEDF2] dark:border-[#27272A] bg-[#FAF9FC] dark:bg-[#202024] px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#7C6FE0]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-[#8A8A94] block mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full rounded-xl border border-[#EDEDF2] dark:border-[#27272A] bg-[#FAF9FC] dark:bg-[#202024] px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#7C6FE0]"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#8A8A94] block mb-1">SKU Barcode</label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="BLZ-SKU-1001"
                    className="w-full rounded-xl border border-[#EDEDF2] dark:border-[#27272A] bg-[#FAF9FC] dark:bg-[#202024] px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#7C6FE0]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-[#8A8A94] block mb-1">Retail Price (₦) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="45000"
                    className="w-full rounded-xl border border-[#EDEDF2] dark:border-[#27272A] bg-[#FAF9FC] dark:bg-[#202024] px-3 py-2 text-xs font-bold text-[#7C6FE0] focus:outline-none focus:ring-1 focus:ring-[#7C6FE0]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#8A8A94] block mb-1">Cost Price (₦)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                    placeholder="20000"
                    className="w-full rounded-xl border border-[#EDEDF2] dark:border-[#27272A] bg-[#FAF9FC] dark:bg-[#202024] px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#7C6FE0]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#8A8A94] block mb-1">Stock Units *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.stockQuantity}
                    onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                    placeholder="30"
                    className="w-full rounded-xl border border-[#EDEDF2] dark:border-[#27272A] bg-[#FAF9FC] dark:bg-[#202024] px-3 py-2 text-xs font-bold text-[#4CAF50] focus:outline-none focus:ring-1 focus:ring-[#7C6FE0]"
                  />
                </div>
              </div>

              <div>
                <ImageUploader
                  value={formData.image}
                  onChange={(url) => setFormData({ ...formData, image: url })}
                  folder="blazestore_catalog"
                  label="Product Media / Photo"
                  isDarkMode={isDarkMode}
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#8A8A94] block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Product highlights and materials..."
                  className="w-full rounded-xl border border-[#EDEDF2] dark:border-[#27272A] bg-[#FAF9FC] dark:bg-[#202024] px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#7C6FE0]"
                />
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isHot}
                    onChange={(e) => setFormData({ ...formData, isHot: e.target.checked })}
                    className="rounded text-[#7C6FE0]"
                  />
                  <span className="text-xs font-bold">Featured Hot Deal 🔥</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.inStock}
                    onChange={(e) => setFormData({ ...formData, inStock: e.target.checked })}
                    className="rounded text-[#7C6FE0]"
                  />
                  <span className="text-xs font-bold">In Stock & Active</span>
                </label>
              </div>

              <div className="pt-3 border-t border-[#EDEDF2] dark:border-[#27272A] flex items-center justify-between gap-2">
                <div>
                  {editingProduct && adminRole === 'owner' && (
                    <button
                      type="button"
                      onClick={() => setProductToDelete(editingProduct)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-red-500 hover:bg-red-500/10 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Delete Product</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-[#8A8A94] hover:bg-[#FAF9FC] dark:hover:bg-[#27272A]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 rounded-xl bg-[#7C6FE0] px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#6D60D6] disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : editingProduct ? 'Save Changes' : 'Create Product'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-app Confirmation Modal for Deleting Single Product */}
      <ConfirmDeleteModal
        isOpen={Boolean(productToDelete)}
        onClose={() => setProductToDelete(null)}
        onConfirm={handleConfirmDeleteProduct}
        title="Delete Product from Catalog"
        message="This action will permanently delete the item from the catalog, inventory tracking, and warehouse database."
        itemName={productToDelete ? `${productToDelete.name} (${productToDelete.sku || productToDelete.id})` : undefined}
        confirmText="Delete Product"
        isLoading={isDeleting}
        isDarkMode={isDarkMode}
      />

      {/* Confirmation Modal for Clearing Entire Mock Catalog */}
      <ConfirmDeleteModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={handleClearAllInventory}
        title="Clear Entire Inventory Catalog?"
        message="This will wipe all existing sample/mock products from the website database and local cache so you can start with a completely clean slate for real store data."
        itemName={`All ${products.length} catalog items`}
        confirmText="Clear All Stock Now"
        isLoading={isClearing}
        isDarkMode={isDarkMode}
      />
    </div>
  );
};
