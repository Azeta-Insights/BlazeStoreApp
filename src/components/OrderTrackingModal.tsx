import React, { useState } from 'react';
import {
  X,
  Search,
  Truck,
  Package,
  CheckCircle2,
  Clock,
  MapPin,
  Calendar,
  FileText,
  AlertCircle,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { Order } from '../types';
import { api } from '../services/api';
import { InvoiceModal } from './InvoiceModal';
import { formatNaira } from '../lib/currency';

interface OrderTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialOrderId?: string;
  onShowToast?: (msg: string) => void;
}

export function OrderTrackingModal({
  isOpen,
  onClose,
  initialOrderId = '',
  onShowToast,
}: OrderTrackingModalProps) {
  const [searchQuery, setSearchQuery] = useState(initialOrderId || '');
  const [loading, setLoading] = useState(false);
  const [trackingData, setTrackingData] = useState<{
    found: boolean;
    order?: Order;
    trackingNumber: string;
    carrier: string;
    estimatedDelivery: string;
    steps: { title: string; date: string; completed: boolean; current: boolean; desc: string }[];
    error?: string;
  } | null>(null);

  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<Order | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      onShowToast?.('Please enter an Order ID or Email.');
      return;
    }

    setLoading(true);
    try {
      const result = await api.trackOrder(searchQuery.trim());
      setTrackingData(result);
      if (!result.found && result.error) {
        onShowToast?.(result.error);
      }
    } catch (err: any) {
      onShowToast?.('Failed to track order.');
    } finally {
      setLoading(false);
    }
  };

  // Run on mount if initialOrderId is provided
  React.useEffect(() => {
    if (isOpen && initialOrderId) {
      setSearchQuery(initialOrderId);
      api.trackOrder(initialOrderId).then((res) => {
        if (res.found) setTrackingData(res);
      });
    }
  }, [isOpen, initialOrderId]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Live Order Tracking
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Real-time package status and courier checkpoint history
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="p-6 border-b border-slate-100 dark:border-slate-800">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Enter Order ID (e.g. BLZ-9021) or customer email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border-none text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Searching...' : 'Track'}
              </button>
            </form>

            <div className="flex items-center gap-2 mt-3 text-[11px] text-slate-500">
              <span>Quick test IDs:</span>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('BLZ-9021');
                  api.trackOrder('BLZ-9021').then(setTrackingData);
                }}
                className="underline hover:text-indigo-600 cursor-pointer font-semibold"
              >
                BLZ-9021 (Delivered)
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('BLZ-9022');
                  api.trackOrder('BLZ-9022').then(setTrackingData);
                }}
                className="underline hover:text-indigo-600 cursor-pointer font-semibold"
              >
                BLZ-9022 (Processing)
              </button>
            </div>
          </div>

          {/* Tracking Results Body */}
          <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
            {trackingData && trackingData.found && trackingData.order ? (
              <>
                {/* Order Summary & Status Card */}
                <div className="p-5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                        Order #{trackingData.order.orderId}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                        {trackingData.order.status}
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-1">
                      {trackingData.order.status === 'delivered'
                        ? 'Package Delivered Successfully'
                        : `Estimated Delivery: ${trackingData.estimatedDelivery}`}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Carrier: <strong className="text-slate-700 dark:text-slate-200">{trackingData.carrier}</strong> • Tracking #: <strong className="text-slate-700 dark:text-slate-200">{trackingData.trackingNumber}</strong>
                    </p>
                  </div>

                  <button
                    onClick={() => setSelectedInvoiceOrder(trackingData.order || null)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 shadow-2xs transition-all cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <span>View Invoice</span>
                  </button>
                </div>

                {/* Visual Step Timeline */}
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6">
                    Fulfillment & Delivery Progress
                  </h4>

                  <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
                    {trackingData.steps.map((step, idx) => (
                      <div key={idx} className="relative group">
                        {/* Dot indicator */}
                        <div
                          className={`absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${
                            step.completed
                              ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                              : step.current
                              ? 'bg-indigo-600 border-indigo-600 text-white ring-4 ring-indigo-100 dark:ring-indigo-950'
                              : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-400'
                          }`}
                        >
                          {step.completed ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <span className="text-[10px] font-bold">{idx + 1}</span>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <h5
                              className={`text-sm font-bold ${
                                step.completed || step.current
                                  ? 'text-slate-900 dark:text-white'
                                  : 'text-slate-400 dark:text-slate-500'
                              }`}
                            >
                              {step.title}
                            </h5>
                            <span className="text-[11px] font-medium text-slate-400">
                              {step.date}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {step.desc}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Package Items & Destination */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Items in package */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Items in Package ({trackingData.order.items.length})</span>
                    </h5>
                    <div className="space-y-2">
                      {trackingData.order.items.map((item, i) => (
                        <div key={i} className="flex items-center gap-2.5 text-xs">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-10 h-10 rounded-md object-cover bg-slate-200 shrink-0"
                          />
                          <div className="flex-1 truncate">
                            <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                              {item.name}
                            </p>
                            <span className="text-slate-400 text-[11px]">
                              Qty: {item.quantity} • {formatNaira(item.price * item.quantity)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Destination Address */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs">
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Delivery Address</span>
                    </h5>
                    <p className="font-bold text-slate-800 dark:text-slate-200">
                      {trackingData.order.customer?.name}
                    </p>
                    <p className="text-slate-600 dark:text-slate-400">
                      {trackingData.order.customer?.address}
                    </p>
                    <p className="text-slate-600 dark:text-slate-400">
                      {trackingData.order.customer?.city}, {trackingData.order.customer?.zip}
                    </p>
                  </div>
                </div>
              </>
            ) : trackingData && !trackingData.found ? (
              <div className="text-center py-10">
                <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
                <h4 className="font-bold text-base text-slate-800 dark:text-slate-200">
                  Order Not Found
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  We couldn't locate an order matching that query. Please double-check your Order ID or contact support.
                </p>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <Truck className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                  Track any BlazeStore package instantly
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  Enter your order reference code (e.g. BLZ-9021) or customer email above.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invoice Modal for this order */}
      <InvoiceModal
        order={selectedInvoiceOrder}
        isOpen={Boolean(selectedInvoiceOrder)}
        onClose={() => setSelectedInvoiceOrder(null)}
      />
    </>
  );
}
