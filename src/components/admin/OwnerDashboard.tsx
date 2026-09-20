import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Package,
  RotateCcw,
  Users,
  Database,
  ArrowLeft,
  Crown,
  ShieldCheck,
  Moon,
  Sun,
  Sparkles,
  ShoppingBag,
  LogOut,
  ChevronRight,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  RefreshCw,
  SlidersHorizontal,
  LayoutDashboard,
  ShieldAlert,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Trash2
} from 'lucide-react';
import { AdminRole, SalesAnalytics, User } from '../../types';
import { api } from '../../services/api';
import { AdminSalesReports } from './AdminSalesReports';
import { AdminInventory } from './AdminInventory';
import { AdminOrdersRefunds } from './AdminOrdersRefunds';
import { AdminUsersRoles } from './AdminUsersRoles';
import { AdminDatabaseHub } from './AdminDatabaseHub';
import { ConfirmDeleteModal } from '../ConfirmDeleteModal';

interface OwnerDashboardProps {
  currentUser: User | null;
  onBackToStore: () => void;
  onSwitchToManagerDashboard: () => void;
  onLogout: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({
  currentUser,
  onBackToStore,
  onSwitchToManagerDashboard,
  onLogout,
  isDarkMode,
  onToggleDarkMode,
}) => {
  // Owner tabs: 'sales_reports' | 'inventory' | 'orders_refunds' | 'users_roles' | 'database'
  const [activeTab, setActiveTab] = useState<'sales_reports' | 'inventory' | 'orders_refunds' | 'users_roles' | 'database'>('sales_reports');

  // Analytics & Services State
  const [analytics, setAnalytics] = useState<SalesAnalytics | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [cloudinaryStatus, setCloudinaryStatus] = useState<{
    configured: boolean;
    cloudName: string | null;
    hasApiKey: boolean;
    hasApiSecret: boolean;
    message: string;
  } | null>(null);
  const [isLoadingCloudinary, setIsLoadingCloudinary] = useState(true);
  const [isClearingData, setIsClearingData] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const loadAnalytics = async () => {
    setIsLoadingAnalytics(true);
    try {
      const data = await api.getSalesAnalytics();
      setAnalytics(data);
    } catch (e) {
      console.error('Failed to load sales analytics:', e);
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  const handleClearMockData = () => {
    setShowClearConfirm(true);
  };

  const handleConfirmClearMockData = async () => {
    setIsClearingData(true);
    try {
      await api.clearMockData();
      showToast('🧹 All mock dashboard data and test orders cleared!');
      setShowClearConfirm(false);
      await loadAnalytics();
    } catch (e: any) {
      console.error(e);
      showToast(`❌ Error: ${e?.message || 'Failed to clear data'}`);
    } finally {
      setIsClearingData(false);
    }
  };

  const loadCloudinaryStatus = async () => {
    setIsLoadingCloudinary(true);
    try {
      const status = await api.getCloudinaryStatus();
      setCloudinaryStatus(status);
    } catch (e) {
      console.error('Failed to check Cloudinary status:', e);
    } finally {
      setIsLoadingCloudinary(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
    loadCloudinaryStatus();
  }, []);

  return (
    <div className={`min-h-screen font-sans ${isDarkMode ? 'bg-[#0E0E11] text-[#ECECF1]' : 'bg-[#F7F7FA] text-[#1F1F23]'}`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-2xl bg-[#1F1F23] text-white px-4 py-3 shadow-2xl border border-white/10 text-xs font-bold animate-fade-in">
          <Sparkles className="h-4 w-4 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Bar for Store Owner */}
      <header className={`sticky top-0 z-40 border-b backdrop-blur-md ${isDarkMode ? 'bg-[#18181B]/95 border-[#27272A]' : 'bg-white/95 border-[#EDEDF2]'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          {/* Brand & Left Navigation */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/25">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-sm sm:text-base tracking-tight">Store Owner Portal</h1>
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                  Super Admin
                </span>
              </div>
              <span className="text-[10px] text-[#8A8A94] font-medium hidden sm:block">
                Full Executive Access • Financials, Team & Infrastructure
              </span>
            </div>
          </div>

          {/* Navigation Links for Owner: [Owner Hub (Active)] | [Manager Hub] | [Storefront] */}
          <div className="flex items-center gap-2">
            {/* Cloudinary Live Connection Indicator */}
            <button
              onClick={() => setActiveTab('database')}
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition ${
                cloudinaryStatus?.configured
                  ? 'bg-[#00A4EF]/10 border-[#00A4EF]/30 text-[#0077B5] dark:text-[#38BDF8] hover:bg-[#00A4EF]/20'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20'
              }`}
              title={
                cloudinaryStatus?.configured
                  ? `Cloudinary CDN Connected (Cloud: ${cloudinaryStatus.cloudName || 'Configured'}). Click to view Hub.`
                  : 'Cloudinary not configured in environment (Running in Direct Upload mode). Click to configure.'
              }
            >
              <UploadCloud className="h-3.5 w-3.5 shrink-0" />
              <span className="flex items-center gap-1.5">
                <span
                  className={`h-2 w-2 rounded-full ${
                    cloudinaryStatus?.configured ? 'bg-[#00A4EF] animate-pulse' : 'bg-amber-500'
                  }`}
                />
                <span>
                  {isLoadingCloudinary
                    ? 'Checking Cloudinary...'
                    : cloudinaryStatus?.configured
                    ? 'Cloudinary Connected'
                    : 'Cloudinary: Direct Mode'}
                </span>
              </span>
            </button>

            <div className="flex items-center p-1 rounded-xl bg-[#FAF9FC] dark:bg-[#202024] border border-[#EDEDF2] dark:border-[#27272A]">
              {/* Owner Dashboard (Active) */}
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-white shadow-xs"
                title="You are currently on the Store Owner Dashboard"
              >
                <Crown className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Owner Hub</span>
              </button>

              {/* Manager Dashboard (Owner has full access to this too!) */}
              <button
                onClick={onSwitchToManagerDashboard}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-[#8A8A94] hover:text-[#7C6FE0] hover:bg-black/5 dark:hover:bg-white/5 transition"
                title="Switch to Store Manager Operations View"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-[#7C6FE0]" />
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

            {/* Clear Mock Data Action */}
            <button
              onClick={handleClearMockData}
              disabled={isClearingData}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-500/20 transition disabled:opacity-50"
              title="Clear all mock orders, refunds, and sample metrics"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{isClearingData ? 'Clearing...' : 'Clear Mock Data'}</span>
            </button>

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
              title="Sign out of Owner Account"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Owner Navigation Tabs Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Welcome Owner Greeting Card */}
        <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-[#7C6FE0]/10 to-transparent border border-amber-500/20">
          <div className="flex items-center gap-3.5">
            <img
              src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'}
              alt={currentUser?.name || 'Owner'}
              className="h-12 w-12 rounded-2xl object-cover ring-2 ring-amber-500 shadow-sm"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black">
                  Welcome back, {currentUser?.name || 'Store Owner'} 👑
                </h2>
                <span className="rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-extrabold text-[10px] px-2.5 py-0.5">
                  Full Authority
                </span>
              </div>
              <p className="text-xs text-[#8A8A94] mt-0.5">
                Logged in as <strong>{currentUser?.email || 'azetablessingb@gmail.com'}</strong>. You have unrestricted access to both dashboards and the storefront.
              </p>

              {/* Live Infrastructure Status Pills */}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {/* Database Pill */}
                <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Cloud Database: Connected</span>
                </div>

                {/* Media Storage Pill */}
                <button
                  onClick={() => setActiveTab('database')}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-[11px] font-semibold transition ${
                    cloudinaryStatus?.configured
                      ? 'bg-[#00A4EF]/10 border-[#00A4EF]/25 text-[#0077B5] dark:text-[#38BDF8] hover:bg-[#00A4EF]/20'
                      : 'bg-amber-500/10 border-amber-500/25 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20'
                  }`}
                  title="Click to view Database & Media Hub"
                >
                  <UploadCloud className="h-3 w-3" />
                  <span className="flex items-center gap-1">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        cloudinaryStatus?.configured ? 'bg-[#00A4EF] animate-pulse' : 'bg-amber-500'
                      }`}
                    />
                    <span>
                      {cloudinaryStatus?.configured
                        ? `Media Storage: Connected (${cloudinaryStatus.cloudName || 'Active'})`
                        : 'Media Storage: Active'}
                    </span>
                  </span>
                  <ChevronRight className="h-3 w-3 opacity-60" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onSwitchToManagerDashboard}
              className="flex items-center gap-1.5 rounded-xl border border-[#7C6FE0]/30 bg-[#7C6FE0]/10 px-3 py-2 text-xs font-bold text-[#7C6FE0] hover:bg-[#7C6FE0]/20 transition"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Open Manager View</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div
          className={`flex items-center gap-2 p-1.5 rounded-2xl border overflow-x-auto mb-6 ${
            isDarkMode ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-[#EDEDF2] shadow-xs'
          }`}
        >
          <button
            id="owner-tab-sales"
            onClick={() => setActiveTab('sales_reports')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeTab === 'sales_reports'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-[#8A8A94] hover:text-[#1F1F23] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>Sales & Revenue Reports</span>
          </button>

          <button
            id="owner-tab-inventory"
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeTab === 'inventory'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-[#8A8A94] hover:text-[#1F1F23] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <Package className="h-4 w-4" />
            <span>Full Product & Inventory Master</span>
          </button>

          <button
            id="owner-tab-orders"
            onClick={() => setActiveTab('orders_refunds')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeTab === 'orders_refunds'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-[#8A8A94] hover:text-[#1F1F23] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <RotateCcw className="h-4 w-4" />
            <span>Orders & Unrestricted Refunds</span>
          </button>

          <button
            id="owner-tab-users"
            onClick={() => setActiveTab('users_roles')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeTab === 'users_roles'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-[#8A8A94] hover:text-[#1F1F23] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Team & User Role Permissions</span>
          </button>

          <button
            id="owner-tab-database"
            onClick={() => setActiveTab('database')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeTab === 'database'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-[#8A8A94] hover:text-[#1F1F23] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <Database className="h-4 w-4" />
            <span>Database &amp; Storage Hub</span>
            <span
              className={`h-2 w-2 rounded-full shrink-0 ${
                cloudinaryStatus?.configured ? 'bg-[#00A4EF]' : 'bg-amber-400'
              }`}
              title={cloudinaryStatus?.configured ? 'Cloudinary Connected' : 'Cloudinary Direct Mode'}
            />
          </button>
        </div>

        {/* Tab Contents */}
        <div className="pb-12">
          {activeTab === 'sales_reports' && (
            <AdminSalesReports
              analytics={analytics}
              isLoading={isLoadingAnalytics}
              onRefresh={loadAnalytics}
              adminRole="owner"
              isDarkMode={isDarkMode}
            />
          )}

          {activeTab === 'inventory' && (
            <AdminInventory
              adminRole="owner"
              isDarkMode={isDarkMode}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'orders_refunds' && (
            <AdminOrdersRefunds
              adminRole="owner"
              adminName={currentUser?.name || 'Azeta Blessing'}
              isDarkMode={isDarkMode}
              onShowToast={showToast}
              onDataChanged={loadAnalytics}
            />
          )}

          {activeTab === 'users_roles' && (
            <AdminUsersRoles
              adminRole="owner"
              isDarkMode={isDarkMode}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'database' && (
            <AdminDatabaseHub
              isDarkMode={isDarkMode}
              onShowToast={showToast}
            />
          )}
        </div>
      </div>

      {/* Clear Mock Data Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleConfirmClearMockData}
        title="Clear All Mock Data"
        message="This will reset and wipe sample test orders, customer refunds, temporary test cart items, and sample users. Authentic admin accounts and product catalog will be preserved."
        confirmText="Clear Mock Data"
        isLoading={isClearingData}
        isDarkMode={isDarkMode}
      />
    </div>
  );
};
