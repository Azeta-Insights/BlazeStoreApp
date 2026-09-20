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
  Bell,
  RefreshCw,
  Sparkles,
  ExternalLink,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  Trash2,
  Tag,
  Megaphone
} from 'lucide-react';
import { AdminRole, SalesAnalytics, User } from '../../types';
import { api } from '../../services/api';
import { AdminSalesReports } from './AdminSalesReports';
import { AdminInventory } from './AdminInventory';
import { AdminOrdersRefunds } from './AdminOrdersRefunds';
import { AdminUsersRoles } from './AdminUsersRoles';
import { AdminDatabaseHub } from './AdminDatabaseHub';
import { AdminCouponsPromos } from './AdminCouponsPromos';
import { AdminAnnouncementManager } from './AdminAnnouncementManager';

interface AdminDashboardProps {
  currentUser: User | null;
  onBackToStore: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  onBackToStore,
  isDarkMode,
  onToggleDarkMode,
}) => {
  // Navigation Tabs: 'sales_reports' | 'inventory' | 'orders_refunds' | 'coupons' | 'announcement' | 'users_roles' | 'database'
  const [activeTab, setActiveTab] = useState<
    'sales_reports' | 'inventory' | 'orders_refunds' | 'coupons' | 'announcement' | 'users_roles' | 'database'
  >('sales_reports');

  // Active Admin Role and Identity (Default to Owner if user is owner or manager)
  const initialRole: AdminRole = currentUser?.roleType === 'manager' ? 'manager' : 'owner';
  const [activeAdminRole, setActiveAdminRole] = useState<AdminRole>(initialRole);
  const [activeAdminName, setActiveAdminName] = useState<string>(
    currentUser?.name || (initialRole === 'owner' ? 'Azeta Blessing (Owner)' : 'Blessing Waydiva (Manager)')
  );

  // Data state
  const [analytics, setAnalytics] = useState<SalesAnalytics | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true);
  const [isClearingData, setIsClearingData] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastTimeout, setToastTimeout] = useState<any>(null);
  const [cloudinaryStatus, setCloudinaryStatus] = useState<{
    configured: boolean;
    cloudName: string | null;
    hasApiKey: boolean;
    hasApiSecret: boolean;
    message: string;
  } | null>(null);

  const showToast = (msg: string) => {
    if (toastTimeout) clearTimeout(toastTimeout);
    setToastMessage(msg);
    const timeout = setTimeout(() => {
      setToastMessage(null);
    }, 4000);
    setToastTimeout(timeout);
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

  const handleClearMockData = async () => {
    if (!window.confirm('Clear all sample orders, refunds, and temporary test records? Authentic staff accounts will be preserved.')) {
      return;
    }
    setIsClearingData(true);
    try {
      await api.clearMockData();
      showToast('🧹 Sample store records reset successfully!');
      await loadAnalytics();
    } catch (e: any) {
      console.error(e);
      showToast(`❌ Error: ${e?.message || 'Failed to clear data'}`);
    } finally {
      setIsClearingData(false);
    }
  };

  const loadCloudinaryStatus = async () => {
    try {
      const status = await api.getCloudinaryStatus();
      setCloudinaryStatus(status);
    } catch (e) {
      console.error('Failed to check Cloudinary status:', e);
    }
  };

  useEffect(() => {
    loadAnalytics();
    loadCloudinaryStatus();
  }, []);

  const handleAdminPersonaSwitch = (role: AdminRole) => {
    setActiveAdminRole(role);
    if (role === 'owner') {
      setActiveAdminName(currentUser?.roleType === 'owner' ? currentUser.name : 'Azeta Blessing (Owner)');
      showToast('👑 Switched active persona to Store Owner (Super Admin)');
    } else {
      setActiveAdminName(currentUser?.roleType === 'manager' ? currentUser.name : 'Blessing Waydiva (Manager)');
      showToast('🛡️ Switched active persona to Store Manager (Operations Lead)');
    }
  };

  return (
    <div className={`min-h-screen font-sans ${isDarkMode ? 'bg-[#0F0F12] text-[#ECECF1]' : 'bg-[#F7F7FA] text-[#1F1F23]'}`}>
      {/* Real-time Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-2xl bg-[#1F1F23] text-white px-4 py-3 shadow-2xl border border-white/10 animate-bounce text-xs font-bold">
          <Sparkles className="h-4 w-4 text-[#7C6FE0]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header
        className={`sticky top-0 z-40 border-b backdrop-blur-md ${
          isDarkMode ? 'bg-[#18181B]/90 border-[#27272A]' : 'bg-white/90 border-[#EDEDF2]'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand & Store Return Button */}
          <div className="flex items-center gap-4">
            <button
              onClick={onBackToStore}
              className="flex items-center gap-1.5 rounded-xl border border-[#EDEDF2] dark:border-[#27272A] px-3 py-1.5 text-xs font-bold hover:bg-black/5 dark:hover:bg-white/5 transition"
              title="Return to customer-facing shop"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Storefront</span>
            </button>

            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#A78BFA] to-[#7C6FE0] text-white font-black text-sm shadow-md shadow-[#7C6FE0]/25">
                B
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-black text-sm sm:text-base tracking-tight">BlazeStore Admin</h1>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-[#7C6FE0]/15 text-[#7C6FE0] px-2 py-0.5 rounded-full">
                    Portal
                  </span>
                </div>
                <span className="text-[10px] text-[#8A8A94] font-medium hidden sm:block">
                  Operations & Revenue Management System
                </span>
              </div>
            </div>
          </div>

          {/* Admin Persona Selector & System Controls */}
          <div className="flex items-center gap-3">
            {/* Database Connection Status Pill */}
            <div className="hidden md:flex items-center gap-1.5 rounded-full bg-[#E3F2DD] dark:bg-[#1E3A1E] px-3 py-1 text-[11px] font-bold text-[#2E7D32] dark:text-[#4ADE80] border border-[#A3E635]/30">
              <span className="h-2 w-2 rounded-full bg-[#22C55E] animate-pulse" />
              <span>Cloud Database Connected</span>
            </div>

            {/* Cloudinary Status Pill */}
            <button
              onClick={() => setActiveTab('database')}
              className={`hidden sm:flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold border transition ${
                cloudinaryStatus?.configured
                  ? 'bg-[#00A4EF]/10 border-[#00A4EF]/30 text-[#0077B5] dark:text-[#38BDF8] hover:bg-[#00A4EF]/20'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20'
              }`}
              title={cloudinaryStatus?.message || 'Cloudinary Media CDN Status'}
            >
              <UploadCloud className="h-3 w-3" />
              <span className={`h-1.5 w-1.5 rounded-full ${cloudinaryStatus?.configured ? 'bg-[#00A4EF] animate-pulse' : 'bg-amber-500'}`} />
              <span>{cloudinaryStatus?.configured ? 'Cloudinary Active' : 'Cloudinary Direct'}</span>
            </button>

            {/* Admin Switcher Dropdown */}
            <div className="flex items-center gap-1 rounded-xl p-1 border border-[#EDEDF2] dark:border-[#27272A] bg-[#FAF9FC] dark:bg-[#202024]">
              <button
                onClick={() => handleAdminPersonaSwitch('owner')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  activeAdminRole === 'owner'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-[#8A8A94] hover:text-[#1F1F23] dark:hover:text-white'
                }`}
                title="Store Owner (Super Admin)"
              >
                <Crown className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">Owner</span>
              </button>

              <button
                onClick={() => handleAdminPersonaSwitch('manager')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  activeAdminRole === 'manager'
                    ? 'bg-[#7C6FE0] text-white shadow-xs'
                    : 'text-[#8A8A94] hover:text-[#1F1F23] dark:hover:text-white'
                }`}
                title="Store Manager (Operations Lead)"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">Manager</span>
              </button>
            </div>

            {/* Clear Mock Data Action */}
            <button
              onClick={handleClearMockData}
              disabled={isClearingData}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-500/20 transition disabled:opacity-50"
              title="Clear all mock orders, refunds, and test metrics"
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
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Navigation Tabs Bar */}
        <div
          className={`flex items-center gap-2 p-1.5 rounded-2xl border overflow-x-auto mb-6 ${
            isDarkMode ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-[#EDEDF2] shadow-xs'
          }`}
        >
          <button
            id="tab-sales-reports"
            onClick={() => setActiveTab('sales_reports')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeTab === 'sales_reports'
                ? 'bg-[#7C6FE0] text-white shadow-sm'
                : 'text-[#8A8A94] hover:text-[#1F1F23] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>Sales Reports</span>
          </button>

          <button
            id="tab-inventory"
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeTab === 'inventory'
                ? 'bg-[#7C6FE0] text-white shadow-sm'
                : 'text-[#8A8A94] hover:text-[#1F1F23] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <Package className="h-4 w-4" />
            <span>Manage Inventory</span>
          </button>

          <button
            id="tab-orders-refunds"
            onClick={() => setActiveTab('orders_refunds')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeTab === 'orders_refunds'
                ? 'bg-[#7C6FE0] text-white shadow-sm'
                : 'text-[#8A8A94] hover:text-[#1F1F23] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <RotateCcw className="h-4 w-4" />
            <span>Process Refunds & Orders</span>
          </button>

          <button
            id="tab-coupons-promos"
            onClick={() => setActiveTab('coupons')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeTab === 'coupons'
                ? 'bg-[#7C6FE0] text-white shadow-sm'
                : 'text-[#8A8A94] hover:text-[#1F1F23] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <Tag className="h-4 w-4" />
            <span>Coupons & Promos</span>
          </button>

          <button
            id="tab-announcement-bar"
            onClick={() => setActiveTab('announcement')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeTab === 'announcement'
                ? 'bg-[#7C6FE0] text-white shadow-sm'
                : 'text-[#8A8A94] hover:text-[#1F1F23] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <Megaphone className="h-4 w-4" />
            <span>Announcement Bar</span>
          </button>

          <button
            id="tab-users-roles"
            onClick={() => setActiveTab('users_roles')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeTab === 'users_roles'
                ? 'bg-[#7C6FE0] text-white shadow-sm'
                : 'text-[#8A8A94] hover:text-[#1F1F23] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Users & Roles</span>
          </button>

          <button
            id="tab-database-hub"
            onClick={() => setActiveTab('database')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeTab === 'database'
                ? 'bg-[#7C6FE0] text-white shadow-sm'
                : 'text-[#8A8A94] hover:text-[#1F1F23] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <Database className="h-4 w-4" />
            <span>Database &amp; Cloud Storage</span>
          </button>
        </div>

        {/* Tab Content Display */}
        <div>
          {activeTab === 'sales_reports' && (
            <AdminSalesReports
              analytics={analytics}
              isLoading={isLoadingAnalytics}
              onRefresh={loadAnalytics}
              adminRole={activeAdminRole}
              isDarkMode={isDarkMode}
            />
          )}

          {activeTab === 'inventory' && (
            <AdminInventory
              adminRole={activeAdminRole}
              isDarkMode={isDarkMode}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'orders_refunds' && (
            <AdminOrdersRefunds
              adminRole={activeAdminRole}
              adminName={activeAdminName}
              isDarkMode={isDarkMode}
              onShowToast={showToast}
              onDataChanged={loadAnalytics}
            />
          )}

          {activeTab === 'coupons' && (
            <AdminCouponsPromos
              adminRole={activeAdminRole}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'announcement' && (
            <AdminAnnouncementManager
              onShowToast={showToast}
            />
          )}

          {activeTab === 'users_roles' && (
            <AdminUsersRoles
              adminRole={activeAdminRole}
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
    </div>
  );
};
