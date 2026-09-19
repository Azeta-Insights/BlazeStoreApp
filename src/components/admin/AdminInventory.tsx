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
import { saveFirestoreDoc } from '../../services/firestoreService';
import { ImageUploader } from '../ImageUploader';
import { ConfirmDeleteModal } from '../ConfirmDeleteModal';
import { formatNaira } from '../../lib/currency';

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
      onShowToast('❌ Failed to load inventory from Firestore');
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
      onShowToast('❌ Failed to update stock on Firestore');
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
      price: '45000',
      costPrice: '20000',
      originalPrice: '60000',
      stockQuantity: '35',
      sku: `BLZ-FAS-${Math.floor(1000 + Math.random() * 9000)}`,
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=80',
      description: 'Handcrafted premium merchandise designed for maximum durability and style.',
      badge: 'New',
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
      costPrice: (p.costPrice || p.price * 0.5).toString(),
      originalPrice: p.originalPrice ? p.originalPrice.toString() : '',
      stockQuantity: (p.stockQuantity ?? 25).toString(),
      sku: p.sku || `BLZ-${p.category.slice(0, 3).toUpperCase()}-1001`,
      image: p.image,
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
        onShowToast(`✅ "${updated.name}" updated in Firestore inventory`);
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
        onShowToast(`🎉 "${created.name}" created and added to Firestore!`);
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

    const headers = ['ID', 'Name', 'Category', 'Price', 'StockQuantity', 'SKU', 'InStock', 'Rating', 'Badge', 'CostPrice', 'Description'];
    const rows = products.map((p) => [
      p.id,
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${(p.category || '').replace(/"/g, '""')}"`,
      p.price,
      p.stockQuantity ?? 0,
      `"${(p.sku || '').replace(/"/g, '""')}"`,
      p.inStock !== false ? 'TRUE' : 'FALSE',
      p.rating ?? 5,
      `"${(p.badge || '').replace(/"/g, '""')}"`,
      p.costPrice ?? 0,
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
    onShowToast(`📥 Exported ${products.length} catalog items to CSV.`);
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

        const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
        if (lines.length <= 1) {
          onShowToast('⚠️ CSV file contains no product rows.');
          return;
        }

        let importedCount = 0;
        const newItems: Product[] = [];

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map((c) => c.replace(/^"|"$/g, '').trim());
          if (cols.length >= 4) {
            const [id, name, category, priceStr, stockStr, sku, inStockStr] = cols;
            if (name && priceStr) {
              const itemPrice = parseFloat(priceStr) || 25000;
              const itemStock = parseInt(stockStr, 10) || 20;
              const productObj: Product = {
                id: id || `imp-${Date.now()}-${i}`,
                name,
                category: category || 'General',
                price: itemPrice,
                stockQuantity: itemStock,
                sku: sku || `SKU-IMP-${Math.floor(1000 + Math.random() * 9000)}`,
                inStock: inStockStr !== 'FALSE' && itemStock > 0,
                rating: 5,
                reviewCount: 0,
                colors: ['#7C6FE0'],
                image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=80',
                description: 'Imported product catalog item.',
              };
              newItems.push(productObj);
              importedCount++;
            }
          }
        }

        if (newItems.length > 0) {
          setProducts((prev) => [...newItems, ...prev]);
          onShowToast(`🚀 Successfully imported ${importedCount} products from CSV!`);
        }
      } catch (err: any) {
        onShowToast(`❌ Failed to parse CSV: ${err.message}`);
      }
    };
    reader.readAsText(file);
    // reset input
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
            <h2 className="text-xl font-black tracking-tight">Manage Inventory & Catalog</h2>
            <span className="rounded-full bg-[#10B981]/15 px-2.5 py-0.5 text-xs font-bold text-[#10B981]">
              Firestore Synced
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
            onClick={() => fileInputRef.current?.click()}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
              isDarkMode
                ? 'border-[#27272A] text-[#A1A1AA] hover:bg-[#202024] hover:text-white'
                : 'border-[#EDEDF2] text-[#52525B] hover:bg-[#FAF9FC] hover:text-[#1F1F23]'
            }`}
            title="Import products from a CSV spreadsheet"
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
            onClick={loadInventory}
            className={`p-2 rounded-xl border text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5 transition ${
              isDarkMode ? 'border-[#27272A] text-[#A1A1AA]' : 'border-[#EDEDF2] text-[#52525B]'
            }`}
            title="Refresh inventory from Firestore"
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
            <option value="all">All Categories</option>
            <option value="Fashion">Fashion</option>
            <option value="Electronics">Electronics</option>
            <option value="Beauty">Beauty & Skincare</option>
            <option value="Home">Home & Living</option>
            <option value="Sports">Sports</option>
            <option value="Bags">Bags & Accessories</option>
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
                <span className="text-[11px] text-[#8A8A94]">Syncs directly with Firestore `products`</span>
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
                    <option value="Fashion">Fashion</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Beauty">Beauty & Skincare</option>
                    <option value="Home & Living">Home & Living</option>
                    <option value="Sports">Sports</option>
                    <option value="Bags & Accessories">Bags & Accessories</option>
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
                    {isSubmitting ? 'Saving to Firestore...' : editingProduct ? 'Save Changes' : 'Create Product'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-app Confirmation Modal for Deleting Products */}
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
    </div>
  );
};
