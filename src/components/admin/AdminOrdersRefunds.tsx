import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  ShoppingBag,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  AlertCircle,
  DollarSign,
  User,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  X,
  Database,
  Trash2
} from 'lucide-react';
import { Order, RefundRecord, OrderStatus, AdminRole } from '../../types';
import { api } from '../../services/api';
import { deleteFirestoreDoc } from '../../services/firestoreService';
import { ConfirmDeleteModal } from '../ConfirmDeleteModal';
import { formatNaira } from '../../lib/currency';

interface AdminOrdersRefundsProps {
  adminRole: AdminRole;
  adminName: string;
  isDarkMode: boolean;
  onShowToast: (msg: string) => void;
  onDataChanged?: () => void;
}

export const AdminOrdersRefunds: React.FC<AdminOrdersRefundsProps> = ({
  adminRole,
  adminName,
  isDarkMode,
  onShowToast,
  onDataChanged,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'orders' | 'refunds_log' | 'approval_queue'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [refunds, setRefunds] = useState<RefundRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isApprovingId, setIsApprovingId] = useState<string | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [isDeletingOrder, setIsDeletingOrder] = useState(false);
  const [refundToReject, setRefundToReject] = useState<string | null>(null);
  const [isRejectingRefund, setIsRejectingRefund] = useState(false);

  // Refund Modal State
  const [selectedOrderForRefund, setSelectedOrderForRefund] = useState<Order | null>(null);
  const [refundAmount, setRefundAmount] = useState<string>('');
  const [refundReason, setRefundReason] = useState('Customer returned item');
  const [customReason, setCustomReason] = useState('');
  const [restockItems, setRestockItems] = useState(true);
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [ordersData, refundsData] = await Promise.all([
        api.getAdminOrders(statusFilter !== 'all' ? statusFilter : undefined, searchQuery || undefined),
        api.getRefunds(),
      ]);
      setOrders(ordersData);
      setRefunds(refundsData);
    } catch (e) {
      console.error('Failed to load orders or refunds:', e);
      onShowToast('❌ Failed to sync orders with database');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, searchQuery]);

  const pendingApprovalRefunds = refunds.filter((r) => r.status === 'pending_owner_approval');

  const handleApproveRefund = async (refundId: string) => {
    if (adminRole !== 'owner') {
      onShowToast('❌ Only Store Owners can approve queued refunds.');
      return;
    }
    setIsApprovingId(refundId);
    try {
      const res = await api.approveRefund(refundId, adminName, adminRole);
      onShowToast(`✅ ${res.message}`);
      await loadData();
      if (onDataChanged) onDataChanged();
    } catch (e: any) {
      console.error(e);
      onShowToast(`❌ Approval failed: ${e?.message}`);
    } finally {
      setIsApprovingId(null);
    }
  };

  const handleRejectRefund = (refundId: string) => {
    if (adminRole !== 'owner') {
      onShowToast('❌ Only Store Owners can reject queued refunds.');
      return;
    }
    setRefundToReject(refundId);
  };

  const handleConfirmRejectRefund = async () => {
    if (!refundToReject) return;
    setIsRejectingRefund(true);
    try {
      const res = await api.rejectRefund(refundToReject, adminName, adminRole);
      onShowToast(`ℹ️ ${res.message}`);
      setRefundToReject(null);
      await loadData();
      if (onDataChanged) onDataChanged();
    } catch (e: any) {
      console.error(e);
      onShowToast(`❌ Rejection failed: ${e?.message || 'Server error'}`);
    } finally {
      setIsRejectingRefund(false);
    }
  };

  const handleConfirmDeleteOrder = async () => {
    if (!orderToDelete) return;
    setIsDeletingOrder(true);
    try {
      await deleteFirestoreDoc('orders', orderToDelete.orderId).catch(() => {});
      await api.deleteOrder(orderToDelete.orderId);
      onShowToast(`🗑️ Order #${orderToDelete.orderId} deleted from Firestore.`);
      setOrderToDelete(null);
      await loadData();
      if (onDataChanged) onDataChanged();
    } catch (e: any) {
      console.error(e);
      onShowToast(`❌ Failed to delete order: ${e?.message || 'Server error'}`);
    } finally {
      setIsDeletingOrder(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const updated = await api.updateOrderStatus(orderId, newStatus, adminName, adminRole);
      setOrders((prev) => prev.map((o) => (o.orderId === orderId ? { ...o, status: newStatus } : o)));
      onShowToast(`📦 Order #${orderId} marked as ${newStatus.toUpperCase()}`);
      if (onDataChanged) onDataChanged();
    } catch (e: any) {
      console.error(e);
      onShowToast(`❌ Failed to update status: ${e?.message}`);
    }
  };

  const openRefundModal = (order: Order) => {
    setSelectedOrderForRefund(order);
    const maxRefund = order.total - (order.refundAmount || 0);
    setRefundAmount(maxRefund.toFixed(2));
    setRefundReason('Customer returned item');
    setCustomReason('');
    setRestockItems(true);
  };

  const handleProcessRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForRefund) return;

    const amountNum = Number(refundAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      onShowToast('❌ Please enter a valid refund amount');
      return;
    }

    const availableToRefund = selectedOrderForRefund.total - (selectedOrderForRefund.refundAmount || 0);
    if (amountNum > availableToRefund) {
      onShowToast(`❌ Refund amount exceeds available balance (${formatNaira(availableToRefund)})`);
      return;
    }

    setIsProcessingRefund(true);
    try {
      const finalReason = customReason.trim() ? `${refundReason}: ${customReason}` : refundReason;
      const res = await api.processRefund({
        orderId: selectedOrderForRefund.orderId,
        amount: amountNum,
        reason: finalReason,
        restockItems,
        adminName,
        adminRole,
      });

      onShowToast(`💳 ${res.message}`);
      setSelectedOrderForRefund(null);
      await loadData();
      if (onDataChanged) onDataChanged();
    } catch (err: any) {
      console.error(err);
      onShowToast(`❌ Refund failed: ${err?.message || 'Server error'}`);
    } finally {
      setIsProcessingRefund(false);
    }
  };

  const statusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'delivered':
        return <span className="bg-[#E3F2DD] text-[#2E7D32] px-2.5 py-0.5 rounded-full font-bold text-[10px]">Delivered</span>;
      case 'shipped':
        return <span className="bg-[#E0F2FE] text-[#0369A1] px-2.5 py-0.5 rounded-full font-bold text-[10px]">Shipped</span>;
      case 'processing':
        return <span className="bg-[#FEF3C7] text-[#D97706] px-2.5 py-0.5 rounded-full font-bold text-[10px]">Processing</span>;
      case 'refunded':
        return <span className="bg-[#FCE7F3] text-[#BE185D] px-2.5 py-0.5 rounded-full font-bold text-[10px]">Refunded</span>;
      case 'partially_refunded':
        return <span className="bg-[#FDF2F8] text-[#DB2777] px-2.5 py-0.5 rounded-full font-bold text-[10px]">Partial Refund</span>;
      case 'cancelled':
        return <span className="bg-[#FEE2E2] text-[#991B1B] px-2.5 py-0.5 rounded-full font-bold text-[10px]">Cancelled</span>;
      default:
        return <span className="bg-[#EDE9FE] text-[#6D28D9] px-2.5 py-0.5 rounded-full font-bold text-[10px]">Pending</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black tracking-tight">Orders & Refund Operations</h2>
            <span className="rounded-full bg-[#10B981]/15 px-2.5 py-0.5 text-xs font-bold text-[#10B981]">
              Firestore Protected
            </span>
          </div>
          <p className="text-xs text-[#8A8A94] mt-0.5">
            Process customer refunds, adjust order fulfillment states, and audit returns ledger.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sub-tab Switcher */}
          <div className={`flex rounded-xl p-1 border ${isDarkMode ? 'bg-[#202024] border-[#27272A]' : 'bg-[#FAF9FC] border-[#EDEDF2]'}`}>
            <button
              onClick={() => setActiveSubTab('orders')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                activeSubTab === 'orders'
                  ? 'bg-[#7C6FE0] text-white shadow-xs'
                  : 'text-[#8A8A94] hover:text-[#1F1F23] dark:hover:text-white'
              }`}
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              <span>Orders ({orders.length})</span>
            </button>
            <button
              onClick={() => setActiveSubTab('refunds_log')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                activeSubTab === 'refunds_log'
                  ? 'bg-[#7C6FE0] text-white shadow-xs'
                  : 'text-[#8A8A94] hover:text-[#1F1F23] dark:hover:text-white'
              }`}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Refunds Log ({refunds.length})</span>
            </button>
            <button
              onClick={() => setActiveSubTab('approval_queue')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition relative ${
                activeSubTab === 'approval_queue'
                  ? 'bg-[#E11D48] text-white shadow-xs'
                  : 'text-[#8A8A94] hover:text-[#1F1F23] dark:hover:text-white'
              }`}
            >
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Approval Queue ({pendingApprovalRefunds.length})</span>
              {pendingApprovalRefunds.length > 0 && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
              )}
            </button>
          </div>

          <button
            onClick={loadData}
            className={`p-2 rounded-xl border text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5 transition ${
              isDarkMode ? 'border-[#27272A] text-[#A1A1AA]' : 'border-[#EDEDF2] text-[#52525B]'
            }`}
            title="Refresh from database"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {activeSubTab === 'orders' ? (
        <>
          {/* Search and Filters */}
          <div
            className={`rounded-2xl p-3 border flex flex-col md:flex-row items-center justify-between gap-3 ${
              isDarkMode ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-[#EDEDF2] shadow-xs'
            }`}
          >
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A8A94]" />
              <input
                type="text"
                placeholder="Search order ID, customer name, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full rounded-xl pl-9 pr-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#7C6FE0] ${
                  isDarkMode ? 'bg-[#202024] border border-[#27272A] text-white' : 'bg-[#FAF9FC] border border-[#EDEDF2] text-[#1F1F23]'
                }`}
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
              <Filter className="h-4 w-4 text-[#8A8A94] shrink-0" />
              {(['all', 'pending', 'processing', 'shipped', 'delivered', 'refunded'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold capitalize transition shrink-0 ${
                    statusFilter === st
                      ? 'bg-[#7C6FE0] text-white'
                      : 'bg-[#FAF9FC] dark:bg-[#202024] text-[#8A8A94] hover:text-[#1F1F23] dark:hover:text-white border border-[#EDEDF2] dark:border-[#27272A]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Orders Table */}
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
                    <th className="py-3 px-4">Order ID & Date</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Items Summary</th>
                    <th className="py-3 px-4 text-right">Total Paid</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Update Status</th>
                    <th className="py-3 px-4 text-right">Refund Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDEDF2] dark:divide-[#27272A]">
                  {orders.length > 0 ? (
                    orders.map((ord) => {
                      const dateStr = new Date(ord.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                      const remainingRefund = ord.total - (ord.refundAmount || 0);

                      return (
                        <tr key={ord.orderId} className="hover:bg-black/2 dark:hover:bg-white/2 transition">
                          {/* Order ID */}
                          <td className="py-3.5 px-4 font-mono">
                            <span className="font-bold text-[#7C6FE0] block">#{ord.orderId}</span>
                            <span className="text-[10px] text-[#8A8A94]">{dateStr}</span>
                          </td>

                          {/* Customer */}
                          <td className="py-3.5 px-4">
                            <span className="font-bold block">{ord.customer?.name || 'Guest User'}</span>
                            <span className="text-[10px] text-[#8A8A94] block truncate max-w-[150px]">
                              {ord.customer?.email || 'N/A'}
                            </span>
                          </td>

                          {/* Items summary */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-0.5">
                              {(ord.items || []).slice(0, 2).map((itm, idx) => (
                                <div key={idx} className="text-[11px] truncate max-w-[180px]">
                                  <span className="font-semibold">{itm.quantity}x</span> {itm.name}
                                </div>
                              ))}
                              {(ord.items?.length || 0) > 2 && (
                                <span className="text-[10px] text-[#8A8A94] italic">
                                  +{(ord.items?.length || 0) - 2} more items
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Total */}
                          <td className="py-3.5 px-4 text-right font-black text-[#1F1F23] dark:text-white">
                            {formatNaira(ord.total)}
                            {ord.refundAmount ? (
                              <span className="block text-[10px] text-[#E11D48] font-bold">
                                -{formatNaira(ord.refundAmount)} refunded
                              </span>
                            ) : null}
                          </td>

                          {/* Status Badge */}
                          <td className="py-3.5 px-4 text-center">
                            {statusBadge(ord.status)}
                          </td>

                          {/* Status Dropdown */}
                          <td className="py-3.5 px-4 text-center">
                            <select
                              value={ord.status}
                              onChange={(e) => handleUpdateStatus(ord.orderId, e.target.value as OrderStatus)}
                              className={`rounded-lg px-2 py-1 text-[11px] font-bold border focus:outline-none focus:ring-1 focus:ring-[#7C6FE0] ${
                                isDarkMode ? 'bg-[#202024] border-[#27272A] text-white' : 'bg-[#FAF9FC] border-[#EDEDF2] text-[#1F1F23]'
                              }`}
                            >
                              <option value="pending">Pending</option>
                              <option value="processing">Processing</option>
                              <option value="shipped">Shipped</option>
                              <option value="delivered">Delivered</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </td>

                          {/* Refund & Owner Delete Action */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {ord.status === 'refunded' ? (
                                <span className="text-[10px] font-bold text-[#8A8A94] bg-[#EDEDF2] dark:bg-[#27272A] px-2.5 py-1 rounded-lg">
                                  Fully Refunded
                                </span>
                              ) : remainingRefund <= 0 ? (
                                <span className="text-[10px] font-bold text-[#8A8A94]">Refunded</span>
                              ) : (
                                <button
                                  id={`refund-order-${ord.orderId}`}
                                  onClick={() => openRefundModal(ord)}
                                  className="inline-flex items-center gap-1 rounded-xl bg-[#FB7185]/15 px-3 py-1.5 text-xs font-bold text-[#E11D48] hover:bg-[#FB7185] hover:text-white transition"
                                  title="Process partial or full refund"
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                  <span>Refund</span>
                                </button>
                              )}

                              {/* Owner Delete Order Button */}
                              {adminRole === 'owner' && (
                                <button
                                  id={`delete-order-${ord.orderId}`}
                                  onClick={() => setOrderToDelete(ord)}
                                  className="p-1.5 rounded-xl text-[#8A8A94] hover:text-red-600 hover:bg-red-500/10 transition"
                                  title="Delete order record permanently"
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
                        No orders recorded matching the current filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : activeSubTab === 'approval_queue' ? (
        /* Owner Approval Queue Tab */
        <div
          className={`rounded-2xl border overflow-hidden ${
            isDarkMode ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-[#EDEDF2] shadow-xs'
          }`}
        >
          <div className="p-4 border-b border-[#EDEDF2] dark:border-[#27272A] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-500/5">
            <div>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <h3 className="font-bold text-sm">Manager Refund Approval Queue</h3>
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/15 px-2.5 py-0.5 rounded-full">
                  {pendingApprovalRefunds.length} Pending Owner Review
                </span>
              </div>
              <p className="text-[11px] text-[#8A8A94] mt-0.5">
                Under RBAC policy, refund requests over ₦100,000.00 initiated by Store Managers require Owner approval.
              </p>
            </div>

            {adminRole !== 'owner' && (
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3 py-1 rounded-xl border border-amber-500/20">
                🔒 Read-Only for Managers
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead
                className={`border-b text-[11px] font-bold uppercase tracking-wider text-[#8A8A94] ${
                  isDarkMode ? 'bg-[#202024] border-[#27272A]' : 'bg-[#FAF9FC] border-[#EDEDF2]'
                }`}
              >
                <tr>
                  <th className="py-3 px-4">Refund ID</th>
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Reason / Notes</th>
                  <th className="py-3 px-4">Submitted By</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Owner Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDEDF2] dark:divide-[#27272A]">
                {pendingApprovalRefunds.length > 0 ? (
                  pendingApprovalRefunds.map((ref) => (
                    <tr key={ref.id} className="hover:bg-black/2 dark:hover:bg-white/2 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#7C6FE0]">{ref.id}</td>
                      <td className="py-3.5 px-4 font-mono font-bold">#{ref.orderId}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold block">{ref.customerName || 'Customer'}</span>
                        <span className="text-[10px] text-[#8A8A94] block">{ref.customerEmail}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-[#E11D48] text-sm">
                        {formatNaira(ref.amount)}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-[#52525B] dark:text-[#A1A1AA] max-w-[200px]">
                        {ref.reason}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-xs block">{ref.refundedBy}</span>
                        <span className="text-[10px] text-[#8A8A94] block">
                          {new Date(ref.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30">
                          <Clock className="h-3 w-3" /> Pending Owner
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {adminRole === 'owner' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleApproveRefund(ref.id)}
                              disabled={isApprovingId === ref.id}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-xs transition disabled:opacity-50"
                              title="Approve refund and debit order"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectRefund(ref.id)}
                              disabled={isApprovingId === ref.id}
                              className="px-2.5 py-1 rounded-lg bg-red-600/15 hover:bg-red-600 text-red-600 hover:text-white font-bold text-[11px] transition disabled:opacity-50"
                              title="Reject refund request"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-[#8A8A94] italic">Owner required</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-[#8A8A94]">
                      <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-60" />
                      <p className="font-bold text-xs">Approval Queue is Clear</p>
                      <p className="text-[11px] text-[#8A8A94]">No manager refunds are currently pending owner authorization.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Refunds Audit Log Tab */
        <div
          className={`rounded-2xl border overflow-hidden ${
            isDarkMode ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-[#EDEDF2] shadow-xs'
          }`}
        >
          <div className="p-4 border-b border-[#EDEDF2] dark:border-[#27272A] flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm">Refunds Audit Ledger</h3>
              <p className="text-[11px] text-[#8A8A94]">Permanent record of all refunded transactions from Firestore & database</p>
            </div>
            <span className="text-xs font-bold text-[#E11D48] bg-[#FB7185]/15 px-3 py-1 rounded-full">
              {refunds.length} Refund Records
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead
                className={`border-b text-[11px] font-bold uppercase tracking-wider text-[#8A8A94] ${
                  isDarkMode ? 'bg-[#202024] border-[#27272A]' : 'bg-[#FAF9FC] border-[#EDEDF2]'
                }`}
              >
                <tr>
                  <th className="py-3 px-4">Refund ID</th>
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Authorized By</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Restocked</th>
                  <th className="py-3 px-4 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDEDF2] dark:divide-[#27272A]">
                {refunds.length > 0 ? (
                  refunds.map((ref) => (
                    <tr key={ref.id} className="hover:bg-black/2 dark:hover:bg-white/2 transition">
                      <td className="py-3 px-4 font-mono font-bold text-[#7C6FE0]">{ref.id}</td>
                      <td className="py-3 px-4 font-mono font-bold">#{ref.orderId}</td>
                      <td className="py-3 px-4">
                        <span className="font-bold block">{ref.customerName}</span>
                        <span className="text-[10px] text-[#8A8A94] block">{ref.customerEmail}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-black text-[#E11D48]">
                        {formatNaira(ref.amount)}
                      </td>
                      <td className="py-3 px-4 font-medium text-[#52525B] dark:text-[#A1A1AA] max-w-[200px] truncate">
                        {ref.reason}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-xs">{ref.refundedBy}</span>
                        <span className="text-[10px] text-[#7C6FE0] block capitalize">Role: {ref.adminRole}</span>
                        {ref.approvedBy && (
                          <span className="text-[9px] text-emerald-600 dark:text-emerald-400 block font-bold">
                            Approved by: {ref.approvedBy}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {ref.status === 'pending_owner_approval' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full">
                            Pending Owner
                          </span>
                        ) : ref.status === 'rejected' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-500/15 px-2 py-0.5 rounded-full">
                            Rejected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full">
                            Approved
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {ref.restocked ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#2E7D32] bg-[#E3F2DD] px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="h-3 w-3" /> Yes
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#8A8A94]">No</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right text-[10px] text-[#8A8A94]">
                        {new Date(ref.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-[#8A8A94]">
                      No refund transactions recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Process Refund Modal */}
      {selectedOrderForRefund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setSelectedOrderForRefund(null)}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
          />

          <div
            className={`relative z-10 w-full max-w-lg overflow-hidden rounded-2xl p-6 shadow-2xl ${
              isDarkMode ? 'bg-[#18181B] text-white border border-[#27272A]' : 'bg-white text-[#1F1F23]'
            }`}
          >
            <div className="flex items-center justify-between border-b border-[#EDEDF2] dark:border-[#27272A] pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FB7185]/15 text-[#E11D48]">
                  <RotateCcw className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Process Order Refund</h3>
                  <span className="text-[11px] text-[#8A8A94]">
                    Order #{selectedOrderForRefund.orderId} • Customer: {selectedOrderForRefund.customer?.name}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrderForRefund(null)}
                className="p-1 rounded-lg text-[#8A8A94] hover:bg-[#F7F7FA] dark:hover:bg-[#27272A]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleProcessRefundSubmit} className="space-y-4 text-xs">
              {/* Manager RBAC threshold alert */}
              {adminRole === 'manager' && Number(refundAmount) > 100000 && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-300 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                    <span>Manager Approval Threshold (₦100,000.00)</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Under RBAC rules, refunds above <strong>₦100,000.00</strong> will be flagged as <strong>"Pending Owner Approval"</strong> and submitted to the Store Owner queue.
                  </p>
                </div>
              )}

              {/* Order Summary Snapshot */}
              <div className="rounded-xl bg-[#FAF9FC] dark:bg-[#202024] p-3 border border-[#EDEDF2] dark:border-[#27272A] space-y-1">
                <div className="flex justify-between text-[#8A8A94]">
                  <span>Original Order Total</span>
                  <span className="font-bold text-[#1F1F23] dark:text-white">
                    {formatNaira(selectedOrderForRefund.total)}
                  </span>
                </div>
                {selectedOrderForRefund.refundAmount ? (
                  <div className="flex justify-between text-[#E11D48]">
                    <span>Already Refunded</span>
                    <span>-{formatNaira(selectedOrderForRefund.refundAmount)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between font-bold pt-1 border-t border-[#EDEDF2] dark:border-[#333]">
                  <span>Maximum Refundable</span>
                  <span className="text-[#4CAF50]">
                    {formatNaira(selectedOrderForRefund.total - (selectedOrderForRefund.refundAmount || 0))}
                  </span>
                </div>
              </div>

              {/* Refund Amount Input */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] font-bold text-[#8A8A94]">Refund Amount (₦) *</label>
                  {adminRole === 'manager' && (
                    <span className="text-[10px] text-[#7C6FE0] font-bold">
                      Direct limit: ₦100,000.00
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-xs text-[#8A8A94]">₦</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0.01"
                    max={selectedOrderForRefund.total - (selectedOrderForRefund.refundAmount || 0)}
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="w-full rounded-xl border border-[#EDEDF2] dark:border-[#27272A] bg-[#FAF9FC] dark:bg-[#202024] pl-8 pr-3 py-2.5 text-sm font-black text-[#E11D48] focus:outline-none focus:ring-1 focus:ring-[#7C6FE0]"
                  />
                </div>
              </div>

              {/* Refund Reason Selection */}
              <div>
                <label className="text-[11px] font-bold text-[#8A8A94] block mb-1">Primary Reason *</label>
                <select
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full rounded-xl border border-[#EDEDF2] dark:border-[#27272A] bg-[#FAF9FC] dark:bg-[#202024] px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#7C6FE0]"
                >
                  <option value="Customer returned item">Customer returned item / Unsatisfied</option>
                  <option value="Damaged / Defective merchandise">Damaged or defective on arrival</option>
                  <option value="Incorrect size / color variant">Incorrect size or variant shipped</option>
                  <option value="Out of stock cancellation">Out of stock fulfillment cancellation</option>
                  <option value="Accidental duplicate transaction">Accidental duplicate charge</option>
                  <option value="Customer courtesy concession">Customer goodwill / courtesy credit</option>
                </select>
              </div>

              {/* Additional notes */}
              <div>
                <label className="text-[11px] font-bold text-[#8A8A94] block mb-1">Additional Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Return shipping tracking #TRK948201"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  className="w-full rounded-xl border border-[#EDEDF2] dark:border-[#27272A] bg-[#FAF9FC] dark:bg-[#202024] px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#7C6FE0]"
                />
              </div>

              {/* Restock items checkbox */}
              <div className="rounded-xl border border-[#EDEDF2] dark:border-[#27272A] p-3 bg-[#FAF9FC] dark:bg-[#202024]">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={restockItems}
                    onChange={(e) => setRestockItems(e.target.checked)}
                    className="rounded text-[#7C6FE0] h-4 w-4"
                  />
                  <div>
                    <span className="font-bold text-xs block">Restock Order Items</span>
                    <span className="text-[10px] text-[#8A8A94] block">
                      Automatically return product unit counts back to Firestore inventory catalog
                    </span>
                  </div>
                </label>
              </div>

              {/* Admin Sign-off Badge */}
              <div className="flex items-center justify-between text-[11px] text-[#8A8A94] pt-1">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#7C6FE0]" />
                  <span>Authorized by: <strong className="text-[#1F1F23] dark:text-white">{adminName}</strong> ({adminRole})</span>
                </span>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-[#EDEDF2] dark:border-[#27272A] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedOrderForRefund(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#8A8A94] hover:bg-[#FAF9FC] dark:hover:bg-[#27272A]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingRefund}
                  className="flex items-center gap-1.5 rounded-xl bg-[#E11D48] px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#BE185D] transition disabled:opacity-50"
                >
                  {isProcessingRefund ? (
                    <span>Processing Refund...</span>
                  ) : (
                    <>
                      <span>Issue Refund ({formatNaira(Number(refundAmount || 0))})</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Order Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(orderToDelete)}
        onClose={() => setOrderToDelete(null)}
        onConfirm={handleConfirmDeleteOrder}
        title="Delete Order Record"
        message="This action will permanently delete this order record and associated line items from the database."
        itemName={orderToDelete ? `Order #${orderToDelete.orderId} - ${formatNaira(orderToDelete.total)} (${orderToDelete.customerName})` : undefined}
        confirmText="Delete Order"
        isLoading={isDeletingOrder}
        isDarkMode={isDarkMode}
      />

      {/* Reject Refund Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(refundToReject)}
        onClose={() => setRefundToReject(null)}
        onConfirm={handleConfirmRejectRefund}
        title="Reject Refund Request"
        message="Are you sure you want to reject this queued refund request? The manager and customer will be notified."
        itemName={refundToReject ? `Refund Request ${refundToReject}` : undefined}
        confirmText="Reject Refund"
        isDanger={false}
        isLoading={isRejectingRefund}
        isDarkMode={isDarkMode}
      />
    </div>
  );
};
