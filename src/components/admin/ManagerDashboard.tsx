import React, { useState, useEffect } from 'react';
import {
  Package,
  RotateCcw,
  ArrowLeft,
  ShieldCheck,
  Moon,
  Sun,
  Sparkles,
  ShoppingBag,
  LogOut,
  AlertCircle,
  Clock,
  Truck,
  CheckCircle2,
  Boxes,
  BellRing,
  TrendingUp,
} from 'lucide-react';
import { AdminRole, User, SalesAnalytics } from '../../types';
import { AdminInventory } from './AdminInventory';
import { AdminOrdersRefunds } from './AdminOrdersRefunds';
import { AdminSalesReports } from './AdminSalesReports';
import { api } from '../../services/api';

interface ManagerDashboardProps {
  currentUser: User | null;
  onBackToStore: () => void;
  onLogout: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const ManagerDashboard: React.FC<ManagerDashboardProps> = ({
  currentUser,
  onBackToStore,
  onLogout,
  isDarkMode,
  onToggleDarkMode,
}) => {
  // Manager tabs: 'inventory' | 'orders_refunds' | 'analytics' | 'operations_guide'
  const [activeTab, setActiveTab] = useState<'inventory' | 'orders_refunds' | 'analytics' | 'operations_guide'>('inventory');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<SalesAnalytics | null>(null);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const loadAnalytics = async () => {
    setIsAnalyticsLoading(true);
    try {
      const data = await api.getSalesAnalytics();
      setAnalytics(data);
    } catch (e) {
      console.error('Failed to load analytics:', e);
    } finally {
      setIsAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'analytics') {
      loadAnalytics();
    }
  }, [activeTab]);

  return (
    <div className={`min-h-screen font-sans ${isDarkMode ? 'bg-[#0E0E11] text-[#ECECF1]' : 'bg-[#F7F7FA] text-[#1F1F23]'}`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-2xl bg-[#1F1F23] text-white px-4 py-3 shadow-2xl border border-white/10 text-xs font-bold animate-fade-in">
          <Sparkles className="h-4 w-4 text-[#7C6FE0]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Bar for Store Manager */}
      <header className={`sticky top-0 z-40 border-b backdrop-blur-md ${isDarkMode ? 'bg-[#18181B]/95 border-[#27272A]' : 'bg-white/95 border-[#EDEDF2]'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          {/* Brand & Left Navigation */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-[#7C6FE0] to-[#6366F1] text-white shadow-md shadow-[#7C6FE0]/25">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-sm sm:text-base tracking-tight">Store Manager Portal</h1>
                <span className="text-[10px] font-black uppercase tracking-wider bg-[#7C6FE0]/15 text-[#7C6FE0] dark:text-[#A78BFA] px-2.5 py-0.5 rounded-full border border-[#7C6FE0]/30">
                  Operations Lead
                </span>
              </div>
              <span className="text-[10px] text-[#8A8A94] font-medium hidden sm:block">
                Inventory Stocking, Order Fulfillment & Customer Support
              </span>
            </div>
          </div>

          {/* Navigation Links for Manager: [Manager Hub (Active)] | [Storefront] */}
          <div className="flex items-center gap-2">
            <div className="flex items-center p-1 rounded-xl bg-[#FAF9FC] dark:bg-[#202024] border border-[#EDEDF2] dark:border-[#27272A]">
              {/* Manager Dashboard (Active) */}
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#7C6FE0] text-white shadow-xs"
                title="You are currently on the Store Manager Dashboard"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Manager Hub</span>
              </button>

              {/* Storefront Button */}
              <button
                onClick={onBackToStore}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-[#8A8A94] hover:text-[#1F1F23] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition"
                title="Open Storefront customer view"
              >
                <ShoppingBag className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Storefront</span>
              </button>
            </div>

            {/* Dark Mode Toggle */}
            <button
              onClick={onToggleDarkMode}
              className="p-2 rounded-xl border border-[#EDEDF2] dark:border-[#27272A] hover:bg-black/5 dark:hover:bg-white/5 transition"
              title="Toggle theme"
            >
              {isDarkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-[#52525B]" />}
            </button>

            {/* Logout / Switch User */}
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-xl border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-500/20 transition"
              title="Sign out of Manager Account"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Manager Navigation Tabs Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Welcome Manager Greeting Card */}
        <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-[#7C6FE0]/10 via-[#A78BFA]/10 to-transparent border border-[#7C6FE0]/20">
          <div className="flex items-center gap-3.5">
            <img
              src={currentUser?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80'}
              alt={currentUser?.name || 'Manager'}
              className="h-12 w-12 rounded-2xl object-cover ring-2 ring-[#7C6FE0] shadow-sm"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black">
                  Welcome back, {currentUser?.name || 'Store Manager'} 🛡️
                </h2>
                <span className="rounded-full bg-[#7C6FE0]/20 text-[#7C6FE0] dark:text-[#A78BFA] font-extrabold text-[10px] px-2.5 py-0.5">
                  Operations & Fulfillment
                </span>
              </div>
              <p className="text-xs text-[#8A8A94] mt-0.5">
                Logged in as <strong>{currentUser?.email || 'manager@blazestore.com'}</strong>. You have access to your Operations Dashboard and the Storefront.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-[#8A8A94] bg-white dark:bg-[#1E1E22] px-3 py-1.5 rounded-xl border border-[#EDEDF2] dark:border-[#27272A]">
              <Truck className="h-3.5 w-3.5 text-[#7C6FE0]" />
              <span className="font-semibold">Fulfillment Ready</span>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div
          className={`flex items-center gap-2 p-1.5 rounded-2xl border overflow-x-auto mb-6 ${
            isDarkMode ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-[#EDEDF2] shadow-xs'
          }`}
        >
          <button
            id="manager-tab-inventory"
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeTab === 'inventory'
                ? 'bg-[#7C6FE0] text-white shadow-sm'
                : 'text-[#8A8A94] hover:text-[#1F1F23] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <Package className="h-4 w-4" />
            <span>Manage Inventory & Stock</span>
          </button>

          <button
            id="manager-tab-orders"
            onClick={() => setActiveTab('orders_refunds')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeTab === 'orders_refunds'
                ? 'bg-[#7C6FE0] text-white shadow-sm'
                : 'text-[#8A8A94] hover:text-[#1F1F23] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <RotateCcw className="h-4 w-4" />
            <span>Order Fulfillment & Support Refunds</span>
          </button>

          <button
            id="manager-tab-analytics"
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeTab === 'analytics'
                ? 'bg-[#7C6FE0] text-white shadow-sm'
                : 'text-[#8A8A94] hover:text-[#1F1F23] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            <span>Sales & Revenue Metrics</span>
          </button>

          <button
            id="manager-tab-guide"
            onClick={() => setActiveTab('operations_guide')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeTab === 'operations_guide'
                ? 'bg-[#7C6FE0] text-white shadow-sm'
                : 'text-[#8A8A94] hover:text-[#1F1F23] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <Boxes className="h-4 w-4" />
            <span>Daily Operations Checklist</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="pb-12">
          {activeTab === 'inventory' && (
            <AdminInventory
              adminRole="manager"
              isDarkMode={isDarkMode}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'orders_refunds' && (
            <AdminOrdersRefunds
              adminRole="manager"
              adminName={currentUser?.name || 'Elena Rostova (Manager)'}
              isDarkMode={isDarkMode}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'analytics' && (
            <AdminSalesReports
              analytics={analytics}
              isLoading={isAnalyticsLoading}
              onRefresh={loadAnalytics}
              adminRole="manager"
              isDarkMode={isDarkMode}
            />
          )}

          {activeTab === 'operations_guide' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="rounded-2xl border border-[#EDEDF2] dark:border-[#27272A] bg-white dark:bg-[#18181B] p-5 space-y-3">
                <div className="flex items-center gap-2.5 text-[#7C6FE0]">
                  <Boxes className="h-5 w-5" />
                  <h3 className="font-extrabold text-sm">1. Stock Audits & Alerts</h3>
                </div>
                <p className="text-xs text-[#8A8A94] leading-relaxed">
                  Review products flagged below 10 units in the Inventory tab. Update quantities once new stock arrives from suppliers.
                </p>
                <div className="rounded-xl bg-[#F7F7FA] dark:bg-[#202024] p-3 text-[11px] font-semibold text-[#52525B] dark:text-[#A1A1AA]">
                  💡 Quick update: Click <strong>"Update Stock"</strong> on any item in Inventory to adjust physical count.
                </div>
              </div>

              <div className="rounded-2xl border border-[#EDEDF2] dark:border-[#27272A] bg-white dark:bg-[#18181B] p-5 space-y-3">
                <div className="flex items-center gap-2.5 text-[#38BDF8]">
                  <Truck className="h-5 w-5" />
                  <h3 className="font-extrabold text-sm">2. Order Progression</h3>
                </div>
                <p className="text-xs text-[#8A8A94] leading-relaxed">
                  Advance newly placed orders from <code>pending</code> to <code>processing</code>, generate package labels, and mark <code>shipped</code>.
                </p>
                <div className="rounded-xl bg-[#F7F7FA] dark:bg-[#202024] p-3 text-[11px] font-semibold text-[#52525B] dark:text-[#A1A1AA]">
                  📦 Real-time: Status changes notify customer in app and log to database.
                </div>
              </div>

              <div className="rounded-2xl border border-[#EDEDF2] dark:border-[#27272A] bg-white dark:bg-[#18181B] p-5 space-y-3">
                <div className="flex items-center gap-2.5 text-[#10B981]">
                  <RotateCcw className="h-5 w-5" />
                  <h3 className="font-extrabold text-sm">3. Support Refunds (RBAC Policy)</h3>
                </div>
                <p className="text-xs text-[#8A8A94] leading-relaxed">
                  Managers can authorize customer support refunds up to <strong>₦100,000.00</strong> without prior approval. Refunds above ₦100,000.00 are automatically routed to the Store Owner queue.
                </p>
                <div className="rounded-xl bg-[#F7F7FA] dark:bg-[#202024] p-3 text-[11px] font-semibold text-[#52525B] dark:text-[#A1A1AA]">
                  🔒 RBAC Enforced: Raw revenue export and user permissions are reserved for Store Owners.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
