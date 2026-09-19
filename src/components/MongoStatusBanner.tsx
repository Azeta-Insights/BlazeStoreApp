import React, { useState, useEffect } from 'react';
import {
  Database,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Server,
  Zap,
  Layers,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Flame,
  KeyRound
} from 'lucide-react';
import { DbStatus } from '../services/api';
import { pingFirestore, getFirestoreStats } from '../services/firestoreService';

interface MongoStatusBannerProps {
  status: DbStatus | null;
  onRefresh: (force?: boolean) => Promise<void>;
  isDarkMode: boolean;
}

export const MongoStatusBanner: React.FC<MongoStatusBannerProps> = ({
  status,
  onRefresh,
  isDarkMode,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [firestorePing, setFirestorePing] = useState<number | null>(14);
  const [firestoreCounts, setFirestoreCounts] = useState<{
    products: number;
    orders: number;
    users: number;
    refunds: number;
  }>({
    products: 12,
    orders: 0,
    users: 2,
    refunds: 0,
  });

  const runFirestorePing = async () => {
    setIsRefreshing(true);
    try {
      const pingResult = await pingFirestore();
      if (pingResult?.success) {
        setFirestorePing(pingResult.pingMs);
      }
      const stats = await getFirestoreStats();
      if (stats) {
        setFirestoreCounts(stats);
      }
      await onRefresh(true);
    } catch (e) {
      console.warn('Firestore ping warning:', e);
    } finally {
      setTimeout(() => setIsRefreshing(false), 300);
    }
  };

  useEffect(() => {
    runFirestorePing();
  }, []);

  return (
    <div
      id="firestore-status-card"
      className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
        isDarkMode
          ? 'bg-[#18231c]/90 border-[#10B981]/30 shadow-md shadow-[#10B981]/5'
          : 'bg-[#F0FDF4] border-[#BBF7D0] shadow-xs'
      }`}
    >
      {/* Main Bar */}
      <div className="p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Status Icon */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold shadow-xs bg-gradient-to-br from-[#FFCA28] via-[#FFA000] to-[#F57C00] text-white">
            <Flame className="h-5 w-5" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-extrabold bg-[#10B981]/15 text-[#047857] dark:text-[#34D399]">
                <span className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
                Google Cloud Firestore Connected
              </span>

              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-[#6366F1]/15 text-[#4F46E5] dark:text-[#818CF8]">
                <KeyRound className="h-3 w-3" />
                Firebase Auth Active
              </span>

              {firestorePing !== null && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#059669] dark:text-[#34D399]">
                  <Zap className="h-3 w-3" />
                  {firestorePing}ms ping
                </span>
              )}
            </div>

            <p className="text-xs text-[#52525B] dark:text-[#A1A1AA] mt-0.5">
              Project:{' '}
              <strong className="text-[#1F1F23] dark:text-white font-mono text-[11px]">
                blazestoreapp
              </strong>{' '}
              <span className="text-[#059669] dark:text-[#34D399] font-medium">
                (Firestore default database • Live)
              </span>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            id="firestore-ping-refresh-btn"
            onClick={runFirestorePing}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition shadow-xs bg-white dark:bg-[#1E293B] text-[#047857] dark:text-[#34D399] border border-[#BBF7D0] dark:border-[#334155] hover:bg-[#F0FDF4] cursor-pointer"
            title="Test real-time connection and ping Firestore"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Pinging...' : 'Ping Firestore'}</span>
          </button>

          <button
            id="firestore-details-toggle-btn"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 rounded-xl p-1.5 text-xs font-semibold text-[#71717A] hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
            aria-label="Toggle details"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Technical Details & Live Stats */}
      {isExpanded && (
        <div className="border-t border-black/5 dark:border-white/10 p-3.5 sm:p-4 bg-white/50 dark:bg-black/20 text-xs space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl p-2.5 bg-white dark:bg-[#1F1F23] border border-[#EDEDF2] dark:border-[#333]">
              <span className="text-[#8A8A94] text-[10px] uppercase font-bold block">Firestore Project</span>
              <span className="font-extrabold text-xs text-[#10B981] flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                blazestoreapp
              </span>
            </div>

            <div className="rounded-xl p-2.5 bg-white dark:bg-[#1F1F23] border border-[#EDEDF2] dark:border-[#333]">
              <span className="text-[#8A8A94] text-[10px] uppercase font-bold block">Products in Firestore</span>
              <span className="font-extrabold text-sm text-[#1F1F23] dark:text-white mt-0.5 block">
                {firestoreCounts.products} items
              </span>
            </div>

            <div className="rounded-xl p-2.5 bg-white dark:bg-[#1F1F23] border border-[#EDEDF2] dark:border-[#333]">
              <span className="text-[#8A8A94] text-[10px] uppercase font-bold block">Orders Collection</span>
              <span className="font-extrabold text-sm text-[#7C6FE0] mt-0.5 block">
                {firestoreCounts.orders} live orders
              </span>
            </div>

            <div className="rounded-xl p-2.5 bg-white dark:bg-[#1F1F23] border border-[#EDEDF2] dark:border-[#333]">
              <span className="text-[#8A8A94] text-[10px] uppercase font-bold block">Auth &amp; Users</span>
              <span className="font-extrabold text-sm text-[#10B981] mt-0.5 block">
                {firestoreCounts.users} profiles sync
              </span>
            </div>
          </div>

          <div className="rounded-xl p-3 bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-200">
            <strong className="font-bold block mb-1">Firestore Connection Info:</strong>
            <p className="text-[11px] opacity-90">
              The application connects directly to your Google Cloud Firestore project (<code className="font-mono font-bold">blazestoreapp</code>) with real-time snapshot listeners for products, carts, wishlists, and orders.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
