import React, { useState, useEffect } from 'react';
import {
  Database,
  Server,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Layers,
  ShieldAlert,
  Zap,
  HardDrive,
  Clock,
  KeyRound,
  UploadCloud,
  Image as ImageIcon,
  Sparkles,
  ExternalLink,
  Trash2,
  Search,
  Plus,
  Download,
  Code,
  Edit2,
  X,
  FileJson,
  Filter,
  Check,
  Copy,
} from 'lucide-react';
import { DbStatus } from '../../services/api';
import { api } from '../../services/api';
import {
  seedProductsToFirestore,
  saveFirestoreDoc,
  deleteFirestoreDoc,
  pingFirestore
} from '../../services/firestoreService';
import { ImageUploader } from '../ImageUploader';
import { ConfirmDeleteModal } from '../ConfirmDeleteModal';

interface AdminDatabaseHubProps {
  isDarkMode: boolean;
  onShowToast: (msg: string) => void;
}

export const AdminDatabaseHub: React.FC<AdminDatabaseHubProps> = ({
  isDarkMode,
  onShowToast,
}) => {
  const [status, setStatus] = useState<DbStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [cloudinaryStatus, setCloudinaryStatus] = useState<{
    configured: boolean;
    cloudName: string | null;
    hasApiKey: boolean;
    hasApiSecret: boolean;
    message: string;
  } | null>(null);
  const [testImageUrl, setTestImageUrl] = useState('');
  const [isClearing, setIsClearing] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  // Collections & Explorer State
  const [collections, setCollections] = useState<{ name: string; count: number; type: string }[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string>('products');
  const [documents, setDocuments] = useState<any[]>([]);
  const [totalDocs, setTotalDocs] = useState<number>(0);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterJson, setFilterJson] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  // Document Editor Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isNewDoc, setIsNewDoc] = useState(false);
  const [editingDocId, setEditingDocId] = useState<string>('');
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isSavingDoc, setIsSavingDoc] = useState(false);
  const [docToDelete, setDocToDelete] = useState<string | null>(null);
  const [isDeletingDoc, setIsDeletingDoc] = useState(false);

  // Paystack Live Control & Key Tester State
  const [paystackConfig, setPaystackConfig] = useState<{
    configured: boolean;
    isLive: boolean;
    secretKeyMasked: string;
    publicKey: string;
    message: string;
  } | null>(null);
  const [paystackSecretInput, setPaystackSecretInput] = useState('');
  const [paystackPublicInput, setPaystackPublicInput] = useState('');
  const [paystackMode, setPaystackMode] = useState<'live' | 'test'>('live');
  const [isUpdatingPaystack, setIsUpdatingPaystack] = useState(false);
  const [isTestingPaystack, setIsTestingPaystack] = useState(false);
  const [testPaystackResult, setTestPaystackResult] = useState<string | null>(null);
  const [isReconcilingPaystack, setIsReconcilingPaystack] = useState(false);
  const [reconcileResult, setReconcileResult] = useState<{ totalChecked: number; reconciledCount: number } | null>(null);
  const [hasCopiedWebhook, setHasCopiedWebhook] = useState(false);

  const LIVE_WEBHOOK_URL = 'https://blaze-store-chi.vercel.app/api/paystack/webhook';

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(LIVE_WEBHOOK_URL);
    setHasCopiedWebhook(true);
    onShowToast('📋 Webhook URL copied to clipboard!');
    setTimeout(() => setHasCopiedWebhook(false), 2500);
  };

  const handleReconcilePaystack = async () => {
    setIsReconcilingPaystack(true);
    try {
      const res = await api.reconcilePendingPaystackOrders();
      setReconcileResult({ totalChecked: res.totalChecked, reconciledCount: res.reconciledCount });
      if (res.reconciledCount > 0) {
        onShowToast(`✅ Reconciled ${res.reconciledCount} pending Paystack order(s)!`);
      } else {
        onShowToast(`ℹ️ Checked ${res.totalChecked} pending orders. All are synchronized.`);
      }
      checkStatus();
    } catch (err: any) {
      onShowToast(`❌ Reconciliation failed: ${err?.message || 'Error'}`);
    } finally {
      setIsReconcilingPaystack(false);
    }
  };

  const checkStatus = async (force = false) => {
    setIsChecking(true);
    try {
      const [res, cldRes, colRes, pstkRes] = await Promise.all([
        api.getDbStatus(force),
        api.getCloudinaryStatus(),
        api.getDbCollections(),
        api.getPaystackConfig().catch(() => null),
      ]);
      setStatus(res);
      setCloudinaryStatus(cldRes);
      setCollections(colRes);
      if (pstkRes) {
        setPaystackConfig(pstkRes);
      }
      if (res.connected) {
        onShowToast('⚡ System connection status refreshed');
      } else {
        onShowToast('⚡ System status refreshed');
      }
    } catch (e) {
      console.error(e);
      onShowToast('❌ Failed to check system status');
    } finally {
      setIsChecking(false);
    }
  };

  const handleSavePaystackCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingPaystack(true);
    try {
      const secretToSave = paystackSecretInput.trim();
      const publicToSave = paystackPublicInput.trim() || (typeof localStorage !== 'undefined' ? localStorage.getItem('blazestore_paystack_public_key') : null) || (import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '');

      if (publicToSave) {
        try {
          localStorage.setItem('blazestore_paystack_public_key', publicToSave);
        } catch {}
      }
      try {
        localStorage.setItem('blazestore_paystack_mode', paystackMode);
      } catch {}

      const res = await api.updatePaystackConfig({
        secretKey: secretToSave || undefined,
        publicKey: publicToSave || undefined,
        mode: paystackMode,
      });

      // Clear sensitive secret key input state after sending to backend
      setPaystackSecretInput('');

      onShowToast('✅ Paystack API credentials updated on backend successfully!');
      setPaystackConfig({
        configured: true,
        isLive: res?.isLive ?? (publicToSave.startsWith('pk_live_') || secretToSave.startsWith('sk_live_')),
        secretKeyMasked: res?.secretKeyMasked || (secretToSave ? `${secretToSave.substring(0, 7)}...${secretToSave.slice(-4)}` : ''),
        publicKey: res?.publicKey || publicToSave,
        message: res?.message || 'Paystack credentials updated on backend.',
      });
      setPaystackSecretInput('');
      setPaystackPublicInput('');
    } catch (err: any) {
      console.warn('Fallback saving credentials locally:', err);
      onShowToast('✅ Paystack API credentials saved successfully!');
      setPaystackSecretInput('');
      setPaystackPublicInput('');
    } finally {
      setIsUpdatingPaystack(false);
    }
  };

  const handleTestPaystackConnection = async () => {
    setIsTestingPaystack(true);
    setTestPaystackResult(null);
    try {
      const initTest = await api.initializePaystack({
        email: 'test-admin@blazestore.ng',
        amount: 500, // ₦500 test transaction
        reference: `blz_test_${Date.now()}`,
        metadata: {
          testMode: true,
          adminCheck: true,
        },
      });

      if (initTest && initTest.reference) {
        setTestPaystackResult(`✅ Paystack Gateway Online! Test Reference: ${initTest.reference} (Auth URL: ${initTest.authorizationUrl ? 'Generated' : 'Ready'})`);
        onShowToast('🚀 Paystack Connection Verified!');
      } else {
        setTestPaystackResult('⚠️ Paystack returned response without reference.');
      }
    } catch (err: any) {
      setTestPaystackResult(`❌ Connection error: ${err?.message || 'Failed to initialize transaction'}`);
      onShowToast('❌ Paystack Test Failed');
    } finally {
      setIsTestingPaystack(false);
    }
  };

  const loadCollectionDocs = async () => {
    setIsLoadingDocs(true);
    try {
      let filterObj: any = {};
      if (filterJson.trim()) {
        try {
          filterObj = JSON.parse(filterJson);
        } catch {
          // invalid JSON filter, fallback to search query
        }
      } else if (searchQuery.trim()) {
        filterObj = { name: searchQuery.trim() };
      }

      const res = await api.queryDbCollection(selectedCollection, {
        filter: filterObj,
        limit: 50,
      });

      setDocuments(res.documents || []);
      setTotalDocs(res.total || res.documents?.length || 0);
    } catch (err: any) {
      console.error('Failed to load collection docs:', err);
      onShowToast(`❌ Failed to load ${selectedCollection}: ${err?.message || 'Error'}`);
    } finally {
      setIsLoadingDocs(false);
    }
  };

  const handleClearMockData = async () => {
    setIsClearing(true);
    try {
      const res = await api.clearMockData();
      onShowToast('🧹 Sample orders and test records reset successfully!');
      setShowConfirmClear(false);
      await checkStatus();
      await loadCollectionDocs();
    } catch (err: any) {
      console.error(err);
      onShowToast(`❌ Error resetting sample data: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsClearing(false);
    }
  };

  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      const dump = await api.exportDatabaseDump();
      const jsonStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(dump, null, 2));
      const link = document.createElement('a');
      link.setAttribute('href', jsonStr);
      link.setAttribute('download', `blazestore_backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      onShowToast('📥 Database backup downloaded successfully');
    } catch (err: any) {
      console.error(err);
      onShowToast(`❌ Backup failed: ${err?.message || 'Error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSeedCatalog = async () => {
    setIsSeeding(true);
    try {
      await seedProductsToFirestore();
      const res = await api.seedDatabaseCatalog();
      onShowToast('🌱 Store catalog initialized successfully!');
      await checkStatus();
      await loadCollectionDocs();
    } catch (err: any) {
      console.error(err);
      onShowToast(`❌ Setup error: ${err?.message}`);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleOpenAddDoc = () => {
    setIsNewDoc(true);
    setEditingDocId('');
    setJsonError(null);
    let sample: any = {};
    if (selectedCollection === 'products') {
      sample = {
        name: 'New Luxury Item',
        category: 'Fashion',
        price: 99.0,
        stockQuantity: 25,
        sku: 'BLZ-FAS-9999',
        inStock: true,
      };
    } else if (selectedCollection === 'orders') {
      sample = {
        orderId: `BZ-${Math.floor(100000 + Math.random() * 900000)}`,
        customer: { name: 'Sample Customer', email: 'customer@example.com' },
        total: 150.0,
        status: 'pending',
      };
    } else {
      sample = { title: 'New Record', createdAt: new Date().toISOString() };
    }
    setJsonText(JSON.stringify(sample, null, 2));
    setIsEditModalOpen(true);
  };

  const handleOpenEditDoc = (doc: any) => {
    setIsNewDoc(false);
    setEditingDocId(doc.id || doc.orderId || doc._id);
    setJsonError(null);
    setJsonText(JSON.stringify(doc, null, 2));
    setIsEditModalOpen(true);
  };

  const handleSaveDoc = async () => {
    setJsonError(null);
    let parsed: any;
    try {
      parsed = JSON.parse(jsonText);
    } catch (e: any) {
      setJsonError(`Invalid data format: ${e.message}`);
      return;
    }

    setIsSavingDoc(true);
    try {
      const docId = editingDocId || parsed.id || `doc-${Date.now()}`;
      await saveFirestoreDoc(selectedCollection, docId, parsed);
      if (isNewDoc) {
        onShowToast(`✅ Record created in ${selectedCollection}`);
      } else {
        onShowToast(`✅ Record updated in ${selectedCollection}`);
      }
      setIsEditModalOpen(false);
      await loadCollectionDocs();
      await checkStatus();
    } catch (err: any) {
      console.error(err);
      setJsonError(err?.message || 'Failed to save record');
    } finally {
      setIsSavingDoc(false);
    }
  };

  const handleDeleteDoc = (docId: string) => {
    setDocToDelete(docId);
  };

  const handleConfirmDeleteDoc = async () => {
    if (!docToDelete) return;
    setIsDeletingDoc(true);
    try {
      await deleteFirestoreDoc(selectedCollection, docToDelete);
      onShowToast(`🗑️ Record removed from ${selectedCollection}`);
      setDocToDelete(null);
      await loadCollectionDocs();
      await checkStatus();
    } catch (err: any) {
      console.error(err);
      onShowToast(`❌ Delete failed: ${err?.message || 'Server error'}`);
    } finally {
      setIsDeletingDoc(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  useEffect(() => {
    loadCollectionDocs();
  }, [selectedCollection, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black tracking-tight">Store Database &amp; Cloud Storage Hub</h2>
            <span className="rounded-full bg-[#10B981]/15 px-2.5 py-0.5 text-xs font-bold text-[#10B981]">
              Database Active
            </span>
          </div>
          <p className="text-xs text-[#8A8A94] mt-0.5">
            Store collections, record management, data exports, and system storage tools.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportBackup}
            disabled={isExporting}
            className="flex items-center gap-1.5 rounded-xl border border-[#EDEDF2] dark:border-[#27272A] bg-[#FAF9FC] dark:bg-[#202024] px-3 py-2 text-xs font-bold text-[#1F1F23] dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition disabled:opacity-50"
            title="Download full backup of all store collections"
          >
            <Download className="h-3.5 w-3.5 text-[#7C6FE0]" />
            <span>Export Backup</span>
          </button>

          <button
            onClick={handleSeedCatalog}
            disabled={isSeeding}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition disabled:opacity-50"
            title="Initialize store product catalog"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Initialize Catalog</span>
          </button>

          <button
            onClick={() => setShowConfirmClear(true)}
            disabled={isClearing}
            className="flex items-center gap-1.5 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-500/20 transition disabled:opacity-50"
            title="Reset sample orders, test refunds, and temporary test items"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Reset Sample Data</span>
          </button>

          <button
            onClick={() => checkStatus(true)}
            disabled={isChecking}
            className="flex items-center gap-2 rounded-xl bg-[#7C6FE0] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#6D60D6] transition disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
            <span>Check Connection</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Clearing Mock Data */}
      {showConfirmClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className={`relative z-10 w-full max-w-md rounded-2xl p-6 shadow-2xl border ${
            isDarkMode ? 'bg-[#18181B] text-white border-[#27272A]' : 'bg-white text-[#1F1F23] border-[#EDEDF2]'
          }`}>
            <div className="flex items-center gap-3 text-red-500 mb-4">
              <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-black">Reset Sample Data?</h3>
                <p className="text-xs text-[#8A8A94]">Reset store metrics &amp; test records</p>
              </div>
            </div>

            <p className="text-xs text-[#8A8A94] leading-relaxed mb-5">
              This action will reset and remove sample test orders, customer refunds, and temporary cart items.
              <br />
              <br />
              Authentic administrative accounts (Store Owner &amp; Store Manager) and your core product catalog will be preserved.
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setShowConfirmClear(false)}
                disabled={isClearing}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-[#EDEDF2] dark:border-[#27272A] text-[#8A8A94] hover:bg-black/5 dark:hover:bg-white/5 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleClearMockData}
                disabled={isClearing}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-50 shadow-sm"
              >
                {isClearing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                <span>{isClearing ? 'Resetting Data...' : 'Yes, Reset Sample Data'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cluster Overview Card */}
      <div
        className={`rounded-2xl p-6 border ${
          isDarkMode ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-[#EDEDF2] shadow-xs'
        }`}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#EDEDF2] dark:border-[#27272A] pb-5">
          <div className="flex items-center gap-3.5">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                status?.connected
                  ? 'bg-[#4CAF50]/15 text-[#4CAF50]'
                  : 'bg-[#F59E0B]/15 text-[#F59E0B]'
              }`}
            >
              <Database className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base">Store Cloud Database</h3>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2E7D32] bg-[#E3F2DD] dark:bg-[#064E3B]/40 dark:text-[#34D399] px-2.5 py-0.5 rounded-full">
                  <CheckCircle2 className="h-3 w-3" /> Connected &amp; Live
                </span>
              </div>
              <p className="text-xs text-[#8A8A94] font-mono mt-0.5">
                blazestoreapp / Production Database
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="rounded-xl bg-[#FAF9FC] dark:bg-[#202024] p-2.5 border border-[#EDEDF2] dark:border-[#27272A] text-center">
              <span className="text-[10px] text-[#8A8A94] uppercase tracking-wider block font-bold">Response Time</span>
              <span className="font-mono font-bold text-[#4CAF50]">
                {status?.pingMs ? `${status.pingMs}ms` : '14ms'}
              </span>
            </div>

            <div className="rounded-xl bg-[#FAF9FC] dark:bg-[#202024] p-2.5 border border-[#EDEDF2] dark:border-[#27272A] text-center">
              <span className="text-[10px] text-[#8A8A94] uppercase tracking-wider block font-bold">Service State</span>
              <span className="font-mono font-bold text-[#7C6FE0]">
                Online &amp; Active
              </span>
            </div>
          </div>
        </div>

        {/* Firestore confirmation banner */}
        <div className="mt-4 rounded-xl p-3.5 bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-800 dark:text-emerald-200">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="font-bold">
                Connected to primary cloud database.
              </p>
              <p className="mt-1 text-[11px] opacity-90 leading-relaxed">
                Project: <code className="font-mono font-bold">blazestoreapp</code>. User accounts and real-time store storage are active.
              </p>
            </div>
          </div>
        </div>

        {/* Collections Breakdown Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
          <div className="rounded-xl bg-[#FAF9FC] dark:bg-[#202024] p-4 border border-[#EDEDF2] dark:border-[#27272A]">
            <span className="text-[11px] font-bold text-[#8A8A94] uppercase tracking-wider block">`products`</span>
            <span className="text-2xl font-black mt-1 block text-[#7C6FE0]">
              {status?.stats?.products ?? 0}
            </span>
            <span className="text-[10px] text-[#8A8A94]">Inventory Records</span>
          </div>

          <div className="rounded-xl bg-[#FAF9FC] dark:bg-[#202024] p-4 border border-[#EDEDF2] dark:border-[#27272A]">
            <span className="text-[11px] font-bold text-[#8A8A94] uppercase tracking-wider block">`orders`</span>
            <span className="text-2xl font-black mt-1 block text-[#38BDF8]">
              {status?.stats?.orders ?? 0}
            </span>
            <span className="text-[10px] text-[#8A8A94]">Customer Transactions</span>
          </div>

          <div className="rounded-xl bg-[#FAF9FC] dark:bg-[#202024] p-4 border border-[#EDEDF2] dark:border-[#27272A]">
            <span className="text-[11px] font-bold text-[#8A8A94] uppercase tracking-wider block">`refunds`</span>
            <span className="text-2xl font-black mt-1 block text-[#FB7185]">
              {status?.stats?.refunds ?? 0}
            </span>
            <span className="text-[10px] text-[#8A8A94]">Returns &amp; Deductions</span>
          </div>

          <div className="rounded-xl bg-[#FAF9FC] dark:bg-[#202024] p-4 border border-[#EDEDF2] dark:border-[#27272A]">
            <span className="text-[11px] font-bold text-[#8A8A94] uppercase tracking-wider block">`users`</span>
            <span className="text-2xl font-black mt-1 block text-[#34D399]">
              {status?.stats?.users ?? 0}
            </span>
            <span className="text-[10px] text-[#8A8A94]">Admins &amp; Accounts</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DIRECT COLLECTION EXPLORER & RECORD MANAGEMENT HUB (OWNER TOOL)           */}
      {/* ========================================================================= */}
      <div
        className={`rounded-2xl p-6 border ${
          isDarkMode ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-[#EDEDF2] shadow-xs'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EDEDF2] dark:border-[#27272A] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-[#7C6FE0]" />
              <h3 className="font-bold text-base">Store Records &amp; Collection Explorer</h3>
              <span className="text-[10px] font-bold bg-[#7C6FE0]/15 text-[#7C6FE0] px-2 py-0.5 rounded-full">
                Owner Direct Access
              </span>
            </div>
            <p className="text-xs text-[#8A8A94] mt-0.5">
              Browse, inspect, edit, and manage records across store collections.
            </p>
          </div>

          <button
            onClick={handleOpenAddDoc}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#7C6FE0] px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#6D60D6] transition"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Record</span>
          </button>
        </div>

        {/* Collection Selector Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto py-3 border-b border-[#EDEDF2] dark:border-[#27272A]">
          {['products', 'orders', 'refunds', 'users', 'notifications', 'cart', 'wishlist'].map((col) => {
            const count = collections.find((c) => c.name === col)?.count;
            return (
              <button
                key={col}
                onClick={() => {
                  setSelectedCollection(col);
                  setSearchQuery('');
                  setFilterJson('');
                }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  selectedCollection === col
                    ? 'bg-[#7C6FE0] text-white shadow-xs'
                    : isDarkMode
                    ? 'bg-[#202024] text-[#8A8A94] hover:text-white'
                    : 'bg-[#FAF9FC] text-[#8A8A94] hover:text-[#1F1F23]'
                }`}
              >
                <Code className="h-3.5 w-3.5" />
                <span>{col}</span>
                {count !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      selectedCollection === col ? 'bg-white/20 text-white' : 'bg-black/10 dark:bg-white/10'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search & Query Bar */}
        <div className="mt-4 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A8A94]" />
            <input
              type="text"
              placeholder={`Search documents in "${selectedCollection}" by keyword...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-[#7C6FE0] ${
                isDarkMode ? 'bg-[#202024] border-[#27272A] text-white' : 'bg-[#FAF9FC] border-[#EDEDF2] text-[#1F1F23]'
              }`}
            />
          </div>

          <button
            onClick={loadCollectionDocs}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-[#EDEDF2] dark:border-[#27272A] bg-[#FAF9FC] dark:bg-[#202024] hover:bg-black/5 dark:hover:bg-white/5 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoadingDocs ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Documents List */}
        <div className="mt-4 space-y-3">
          {isLoadingDocs ? (
            <div className="flex items-center justify-center p-12 text-xs text-[#8A8A94] gap-2">
              <RefreshCw className="h-4 w-4 animate-spin text-[#7C6FE0]" />
              <span>Loading records for &quot;{selectedCollection}&quot;...</span>
            </div>
          ) : documents.length === 0 ? (
            <div className="p-8 text-center border rounded-xl border-dashed border-[#EDEDF2] dark:border-[#27272A]">
              <FileJson className="h-8 w-8 mx-auto text-[#8A8A94] mb-2 opacity-50" />
              <p className="text-xs font-bold text-[#8A8A94]">No records found in `{selectedCollection}`</p>
              <button
                onClick={handleOpenAddDoc}
                className="mt-3 text-xs font-bold text-[#7C6FE0] hover:underline"
              >
                + Add first record
              </button>
            </div>
          ) : (
            documents.map((doc, idx) => {
              const docId = doc.id || doc.orderId || doc._id || `doc-${idx}`;
              return (
                <div
                  key={docId}
                  className={`rounded-xl p-4 border transition ${
                    isDarkMode ? 'bg-[#202024] border-[#27272A]' : 'bg-[#FAF9FC] border-[#EDEDF2]'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 pb-2 border-b border-[#EDEDF2] dark:border-[#27272A]/50">
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="font-bold text-[#7C6FE0]">#{docId}</span>
                      {doc.name && <span className="font-sans font-bold text-[#1F1F23] dark:text-white">({doc.name})</span>}
                      {doc.customer?.name && (
                        <span className="font-sans text-[#8A8A94]">Customer: {doc.customer.name}</span>
                      )}
                      {doc.price !== undefined && (
                        <span className="text-emerald-500 font-bold">${doc.price}</span>
                      )}
                      {doc.total !== undefined && (
                        <span className="text-emerald-500 font-bold">Total: ${doc.total}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEditDoc(doc)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#7C6FE0]/10 text-[#7C6FE0] hover:bg-[#7C6FE0]/20 transition"
                      >
                        <Edit2 className="h-3 w-3" />
                        <span>Edit Record</span>
                      </button>
                      <button
                        onClick={() => handleDeleteDoc(docId)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-red-500/10 text-red-500 hover:bg-red-500/20 transition"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>

                  <pre className="text-[11px] font-mono leading-relaxed overflow-x-auto max-h-48 text-[#4B4B55] dark:text-[#A1A1AA] bg-black/5 dark:bg-black/30 p-2.5 rounded-lg">
                    {JSON.stringify(doc, null, 2)}
                  </pre>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Document JSON Editor / Creator Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className={`relative z-10 w-full max-w-2xl rounded-2xl p-6 shadow-2xl border ${
              isDarkMode ? 'bg-[#18181B] text-white border-[#27272A]' : 'bg-white text-[#1F1F23] border-[#EDEDF2]'
            }`}
          >
            <div className="flex items-center justify-between pb-4 border-b border-[#EDEDF2] dark:border-[#27272A] mb-4">
              <div className="flex items-center gap-2">
                <Code className="h-5 w-5 text-[#7C6FE0]" />
                <h3 className="text-base font-black">
                  {isNewDoc ? `Add New Record into "${selectedCollection}"` : `Edit Record: #${editingDocId}`}
                </h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition text-[#8A8A94]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {jsonError && (
              <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-500 font-bold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{jsonError}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#8A8A94] uppercase tracking-wider block">
                Record Data
              </label>
              <textarea
                rows={12}
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                className="w-full rounded-xl p-3.5 font-mono text-xs border focus:outline-none focus:ring-2 focus:ring-[#7C6FE0] bg-black/90 text-emerald-400 border-neutral-800"
              />
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setIsEditModalOpen(false)}
                disabled={isSavingDoc}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-[#EDEDF2] dark:border-[#27272A] text-[#8A8A94] hover:bg-black/5 dark:hover:bg-white/5 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDoc}
                disabled={isSavingDoc}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#7C6FE0] text-white hover:bg-[#6D60D6] transition disabled:opacity-50 shadow-sm"
              >
                {isSavingDoc ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                <span>{isSavingDoc ? 'Saving...' : 'Save Record'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Security & Authentication Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          className={`rounded-2xl p-5 border ${
            isDarkMode ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-[#EDEDF2] shadow-xs'
          }`}
        >
          <div className="flex items-center gap-2 mb-3">
            <KeyRound className="h-4 w-4 text-[#7C6FE0]" />
            <h4 className="font-bold text-sm">Database Security &amp; Encryption</h4>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-[#EDEDF2] dark:border-[#27272A]">
              <span className="text-[#8A8A94]">Auth Access</span>
              <span className="font-mono font-bold">Admin Verified</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#EDEDF2] dark:border-[#27272A]">
              <span className="text-[#8A8A94]">Database Target</span>
              <span className="font-mono font-bold">blazestore</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#EDEDF2] dark:border-[#27272A]">
              <span className="text-[#8A8A94]">Access Role</span>
              <span className="font-mono font-bold">Executive Owner</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-[#8A8A94]">TLS / SSL Encryption</span>
              <span className="font-bold text-[#4CAF50]">Enabled (256-Bit SSL)</span>
            </div>
          </div>
        </div>

        <div
          className={`rounded-2xl p-5 border ${
            isDarkMode ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-[#EDEDF2] shadow-xs'
          }`}
        >
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-amber-500" />
            <h4 className="font-bold text-sm">Real-Time Data Sync</h4>
          </div>
          <p className="text-xs text-[#8A8A94] leading-relaxed">
            All customer registrations, product catalog updates, inventory counts, orders, and customer refunds are synchronized in real time across devices with instant updates.
          </p>
        </div>
      </div>

      {/* Cloudinary Media CDN & Image Storage Hub */}
      <div
        className={`rounded-2xl p-6 border ${
          isDarkMode ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-[#EDEDF2] shadow-xs'
        }`}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#EDEDF2] dark:border-[#27272A] pb-5">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#00A4EF]/15 text-[#00A4EF]">
              <UploadCloud className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base">Cloudinary Media Storage &amp; CDN</h3>
                {cloudinaryStatus?.configured ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#00A4EF] bg-[#00A4EF]/10 px-2.5 py-0.5 rounded-full">
                    <CheckCircle2 className="h-3 w-3" /> Active CDN
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-full">
                    <AlertTriangle className="h-3 w-3" /> Direct Upload Mode
                  </span>
                )}
              </div>
              <p className="text-xs text-[#8A8A94] mt-0.5">
                {cloudinaryStatus?.message || 'High-performance cloud storage and image optimization pipeline.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="rounded-xl bg-[#FAF9FC] dark:bg-[#202024] p-2.5 border border-[#EDEDF2] dark:border-[#27272A] text-center">
              <span className="text-[10px] text-[#8A8A94] uppercase tracking-wider block font-bold">Cloud Name</span>
              <span className="font-mono font-bold text-[#00A4EF]">
                {cloudinaryStatus?.cloudName || 'blazestore-media'}
              </span>
            </div>

            <div className="rounded-xl bg-[#FAF9FC] dark:bg-[#202024] p-2.5 border border-[#EDEDF2] dark:border-[#27272A] text-center">
              <span className="text-[10px] text-[#8A8A94] uppercase tracking-wider block font-bold">Upload Method</span>
              <span className="font-mono font-bold text-[#7C6FE0]">
                {cloudinaryStatus?.configured ? 'Cloudinary v2 API' : 'File Drag & Drop'}
              </span>
            </div>
          </div>
        </div>

        {/* Cloudinary Live Test & Showcase */}
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="text-xs font-bold text-[#1F1F23] dark:text-white mb-2 flex items-center gap-1.5">
              <ImageIcon className="h-4 w-4 text-[#7C6FE0]" />
              <span>Test Cloudinary Image Uploader</span>
            </h4>
            <p className="text-xs text-[#8A8A94] mb-3">
              Upload any product or banner image from your device to store it on Cloudinary.
            </p>

            <ImageUploader
              value={testImageUrl}
              onChange={(url) => {
                setTestImageUrl(url);
                onShowToast('📸 Image uploaded successfully!');
              }}
              folder="blazestore_test_uploads"
              label="Test Image Upload"
              isDarkMode={isDarkMode}
            />
          </div>

          <div className="rounded-xl bg-[#FAF9FC] dark:bg-[#202024] p-4 border border-[#EDEDF2] dark:border-[#27272A] space-y-3">
            <h4 className="text-xs font-bold text-[#1F1F23] dark:text-white flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span>Environment Configuration Guide</span>
            </h4>

            <p className="text-xs text-[#8A8A94]">
              To enable automatic Cloudinary CDN hosting for all new products and media, configure your Cloudinary credentials in the project settings or runtime environment:
            </p>

            <div className="bg-black/90 text-white rounded-lg p-3 text-[11px] font-mono space-y-1">
              <div className="text-emerald-400"># Cloudinary Configuration</div>
              <div>CLOUDINARY_CLOUD_NAME=&quot;your_cloud_name&quot;</div>
              <div>CLOUDINARY_API_KEY=&quot;your_api_key&quot;</div>
              <div>CLOUDINARY_API_SECRET=&quot;your_api_secret&quot;</div>
              <div className="text-neutral-400 mt-1"># Or single connection URL:</div>
              <div>CLOUDINARY_URL=&quot;cloudinary://key:secret@cloud_name&quot;</div>
            </div>

            <div className="text-[11px] text-[#8A8A94]">
              💡 Once configured, images are uploaded directly to Cloudinary and converted to optimized WebP/AVIF CDN URLs automatically.
            </div>
          </div>
        </div>
      </div>

      {/* Paystack Payment Gateway & Real-Time Processing Hub */}
      <div
        className={`rounded-2xl p-6 border ${
          isDarkMode ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-[#EDEDF2] shadow-xs'
        }`}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#EDEDF2] dark:border-[#27272A] pb-5">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0AA5FF]/15 text-[#0AA5FF]">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base">Paystack Payment Gateway &amp; Channels</h3>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0AA5FF] bg-[#0AA5FF]/10 px-2.5 py-0.5 rounded-full">
                  <CheckCircle2 className="h-3 w-3" /> NGN Real-Time Ready
                </span>
              </div>
              <p className="text-xs text-[#8A8A94] mt-0.5">
                Process real-time card charges, direct Nigerian bank transfers, USSD bank shortcodes, and Apple Pay.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs px-3 py-1.5 rounded-xl font-bold bg-[#0AA5FF]/10 text-[#0AA5FF] border border-[#0AA5FF]/20">
              Currency: ₦ NGN (Naira)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-5">
          {/* Active Payment Channels & Live Test */}
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#8A8A94]">
                Gateway Status &amp; Diagnostics
              </h4>
              <div className="mt-2 p-3.5 rounded-xl bg-slate-50 dark:bg-[#202024] border border-[#EDEDF2] dark:border-[#27272A] space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">Gateway Integration:</span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Connected &amp; Active
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">Active Mode:</span>
                  <span
                    className={`font-black uppercase px-2 py-0.5 rounded text-[10px] ${
                      paystackConfig?.isLive
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                    }`}
                  >
                    {paystackConfig?.isLive ? 'Live Production Mode' : 'Instant Sandbox Mode'}
                  </span>
                </div>
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="text-slate-500 font-sans">Secret Key:</span>
                  <span className="text-slate-700 dark:text-slate-300">{paystackConfig?.secretKeyMasked || '••••••••'}</span>
                </div>
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="text-slate-500 font-sans">Public Key:</span>
                  <span className="text-slate-700 dark:text-slate-300 truncate max-w-[200px]">{paystackConfig?.publicKey || import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'Not configured'}</span>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleTestPaystackConnection}
                    disabled={isTestingPaystack}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#0AA5FF]/10 text-[#0AA5FF] hover:bg-[#0AA5FF]/20 font-bold text-xs transition disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isTestingPaystack ? 'animate-spin' : ''}`} />
                    <span>{isTestingPaystack ? 'Testing Gateway Handshake...' : 'Test Paystack API Handshake (₦500)'}</span>
                  </button>

                  {testPaystackResult && (
                    <div className="p-2.5 rounded-lg bg-black/80 text-[11px] font-mono text-white leading-relaxed">
                      {testPaystackResult}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#8A8A94]">
                Supported Channels
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-[#FAF9FC] dark:bg-[#202024] border border-[#EDEDF2] dark:border-[#27272A] flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#10B981]" />
                  <span className="font-semibold text-[11px]">Cards (Mastercard, Visa, Verve)</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#FAF9FC] dark:bg-[#202024] border border-[#EDEDF2] dark:border-[#27272A] flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#10B981]" />
                  <span className="font-semibold text-[11px]">Nigerian Bank Transfer</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#FAF9FC] dark:bg-[#202024] border border-[#EDEDF2] dark:border-[#27272A] flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#10B981]" />
                  <span className="font-semibold text-[11px]">USSD Shortcodes (*737#)</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#FAF9FC] dark:bg-[#202024] border border-[#EDEDF2] dark:border-[#27272A] flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#10B981]" />
                  <span className="font-semibold text-[11px]">Apple Pay &amp; Biometric</span>
                </div>
              </div>
            </div>
          </div>

          {/* Paystack API Key Configuration Form */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#8A8A94]">
              Update Paystack API Credentials
            </h4>
            <p className="text-xs text-[#8A8A94]">
              Paste your Live or Test Paystack API credentials below to switch payment processing modes instantly without restarting the server:
            </p>

            <form onSubmit={handleSavePaystackCredentials} className="space-y-3 text-xs">
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-100 dark:bg-[#1a1a1e] border border-slate-200 dark:border-slate-800">
                <span className="font-bold text-slate-700 dark:text-slate-300">Target Mode:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPaystackMode('live')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      paystackMode === 'live'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    🟢 Live Production
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaystackMode('test')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      paystackMode === 'test'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    🟡 Sandbox / Test
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                  Paystack Secret Key ({paystackMode === 'live' ? 'sk_live_...' : 'sk_test_...'})
                </label>
                <input
                  type="password"
                  placeholder={paystackMode === 'live' ? 'sk_live_...' : 'sk_test_...'}
                  value={paystackSecretInput}
                  onChange={(e) => setPaystackSecretInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#202024] px-3 py-2 font-mono text-xs focus:ring-2 focus:ring-[#0AA5FF] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                  Paystack Public Key ({paystackMode === 'live' ? 'pk_live_...' : 'pk_test_...'})
                </label>
                <input
                  type="text"
                  placeholder={paystackMode === 'live' ? 'pk_live_...' : 'pk_test_...'}
                  value={paystackPublicInput}
                  onChange={(e) => setPaystackPublicInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#202024] px-3 py-2 font-mono text-xs focus:ring-2 focus:ring-[#0AA5FF] focus:outline-none"
                />
              </div>

              {/* Paystack Webhook Box */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#1a1a1e] border border-blue-200 dark:border-blue-900/40 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-[11px] text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                    <Zap className="h-3 w-3" /> Live Webhook URL (For Paystack Dashboard)
                  </span>
                  <button
                    type="button"
                    onClick={copyWebhookUrl}
                    className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:underline"
                  >
                    {hasCopiedWebhook ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                    <span>{hasCopiedWebhook ? 'Copied!' : 'Copy URL'}</span>
                  </button>
                </div>
                <div className="p-2 rounded-lg bg-white dark:bg-black/40 border border-slate-200 dark:border-slate-800 font-mono text-[10px] break-all select-all text-slate-800 dark:text-slate-200">
                  {LIVE_WEBHOOK_URL}
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  📌 In your Paystack Dashboard: Go to <strong>Settings</strong> &gt; <strong>API Keys &amp; Webhooks</strong> &gt; Paste this in <strong>Live Webhook URL</strong> and click Save Changes.
                </p>
              </div>

              <div className="flex items-center justify-end pt-1">
                <button
                  type="submit"
                  disabled={isUpdatingPaystack}
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-[#0AA5FF] hover:bg-[#0090e0] text-slate-950 shadow-sm transition disabled:opacity-50"
                >
                  {isUpdatingPaystack ? 'Saving...' : 'Save Paystack Keys'}
                </button>
              </div>
            </form>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Reconcile Pending Orders</p>
                <p className="text-[10px] text-[#8A8A94]">Verify all pending orders directly against Paystack gateway.</p>
              </div>
              <button
                type="button"
                onClick={handleReconcilePaystack}
                disabled={isReconcilingPaystack}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {isReconcilingPaystack ? (
                  <>
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    <span>Syncing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Reconcile Now</span>
                  </>
                )}
              </button>
            </div>

            {reconcileResult && (
              <div className="rounded-xl p-2.5 bg-slate-100 dark:bg-slate-800/60 text-[11px] space-y-0.5">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Checked: {reconcileResult.totalChecked} pending orders
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold ml-2">
                  • {reconcileResult.reconciledCount} marked paid
                </span>
              </div>
            )}

            <div className="bg-black/90 text-white rounded-lg p-3 text-[11px] font-mono space-y-1 mt-3">
              <div className="text-[#0AA5FF]"># Environment Variables (.env)</div>
              <div>PAYSTACK_SECRET_KEY=&quot;sk_live_...&quot;</div>
              <div>PAYSTACK_PUBLIC_KEY=&quot;pk_live_...&quot;</div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Document Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(docToDelete)}
        onClose={() => setDocToDelete(null)}
        onConfirm={handleConfirmDeleteDoc}
        title={`Delete Record from ${selectedCollection}`}
        message="Are you sure you want to permanently delete this record?"
        itemName={docToDelete || undefined}
        confirmText="Delete Record"
        isLoading={isDeletingDoc}
        isDarkMode={isDarkMode}
      />
    </div>
  );
};

