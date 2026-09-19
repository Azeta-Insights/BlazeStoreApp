import React from 'react';
import { X, Printer, CheckCircle, ShieldCheck, Flame } from 'lucide-react';
import { Order } from '../types';
import { formatNaira } from '../lib/currency';

interface InvoiceModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

export function InvoiceModal({ order, isOpen, onClose }: InvoiceModalProps) {
  if (!isOpen || !order) return null;

  const orderDate = new Date(order.createdAt).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const vatAmount = Number(((order.subtotal - (order.discount || 0)) * 0.075).toFixed(2));

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
        {/* Action Header (Hidden during actual paper print) */}
        <div className="print:hidden flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
              Tax Invoice & Receipt (Naira ₦)
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold uppercase">
              {order.status}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Container */}
        <div id="printable-invoice-content" className="p-8 sm:p-10 text-slate-900 dark:text-slate-100 print:text-black">
          {/* Top Bar: Brand & Invoice Meta */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-slate-200 dark:border-slate-800 pb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-600 flex items-center justify-center text-white font-black text-xl shadow-md">
                  <Flame className="w-6 h-6" />
                </div>
                <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white print:text-black">
                  BLAZE<span className="text-orange-500">STORE</span> <span className="text-xs font-bold text-emerald-600">NIGERIA</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
                BlazeStore Nigeria Ltd • CAC RC: 1894022
                <br />
                Lekki Phase 1, Victoria Island, Lagos, Nigeria
                <br />
                azetablessingb@gmail.com • +234 807 875 3111
              </p>
            </div>

            <div className="text-left sm:text-right">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white print:text-black tracking-tight">
                INVOICE (NGN)
              </h2>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 space-y-1 mt-1">
                <div>
                  Invoice #: <span className="font-bold text-slate-900 dark:text-white print:text-black">{order.orderId}</span>
                </div>
                <div>Date: {orderDate}</div>
                <div>Currency: <strong className="text-slate-900 dark:text-white">Nigerian Naira (₦)</strong></div>
                <div>Payment Method: <span className="capitalize">{order.paymentMethod || 'Naira Card / Bank Transfer'}</span></div>
              </div>
            </div>
          </div>

          {/* Billed To / Shipped To Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-slate-200 dark:border-slate-800 text-xs">
            <div>
              <span className="font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1.5">
                Billed & Shipped To:
              </span>
              <p className="font-bold text-sm text-slate-900 dark:text-white print:text-black">
                {order.customer?.name || 'Valued Customer'}
              </p>
              <p className="text-slate-600 dark:text-slate-300 print:text-slate-700">
                {order.customer?.address || '14 Admiralty Way, Lekki Phase 1'}
              </p>
              <p className="text-slate-600 dark:text-slate-300 print:text-slate-700">
                {order.customer?.city || 'Lagos'}, {order.customer?.state || 'Lagos State'}, Nigeria
              </p>
              <p className="text-slate-600 dark:text-slate-300 print:text-slate-700 mt-1">
                {order.customer?.email} • {order.customer?.phone || '+234 803 000 0000'}
              </p>
            </div>

            <div className="sm:text-right">
              <span className="font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1.5">
                Order Status & Logistics:
              </span>
              <div className="inline-flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-md font-bold text-xs">
                <CheckCircle className="w-4 h-4 text-indigo-600" />
                <span className="capitalize">{order.status}</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 mt-2">
                Carrier: GIG Logistics / Red Star Express
              </p>
              <p className="text-slate-500 dark:text-slate-400">
                Tracking: BLZ-GIG-{order.orderId.replace(/[^0-9]/g, '') || '98402'}
              </p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="py-6 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 font-bold uppercase tracking-wider text-slate-400">
                  <th className="pb-3">Item Description</th>
                  <th className="pb-3 text-center">Qty</th>
                  <th className="pb-3 text-right">Unit Price</th>
                  <th className="pb-3 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {order.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 pr-2">
                      <div className="font-bold text-slate-900 dark:text-white print:text-black">
                        {item.name}
                      </div>
                      {item.variant && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Option: {item.variant}
                        </div>
                      )}
                    </td>
                    <td className="py-3 text-center font-medium text-slate-700 dark:text-slate-300">
                      {item.quantity}
                    </td>
                    <td className="py-3 text-right text-slate-700 dark:text-slate-300 font-semibold">
                      {formatNaira(item.price)}
                    </td>
                    <td className="py-3 text-right font-bold text-slate-900 dark:text-white print:text-black">
                      {formatNaira(item.price * item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Summary */}
          <div className="flex flex-col sm:flex-row justify-between items-start pt-6 gap-6">
            <div className="text-xs text-slate-500 max-w-xs space-y-1">
              <div className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Verified Official Nigerian Tax Receipt</span>
              </div>
              <p>
                All returns subject to our 7-day money-back guarantee across Nigeria. Thank you for shopping with BlazeStore!
              </p>
            </div>

            <div className="w-full sm:w-72 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-900 dark:text-white">{formatNaira(order.subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>Promo / Discount</span>
                  <span className="font-bold">-{formatNaira(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Courier Delivery</span>
                <span>{order.shipping > 0 ? formatNaira(order.shipping) : 'FREE'}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Nigerian VAT (7.5%)</span>
                <span>{formatNaira(vatAmount)}</span>
              </div>
              <div className="flex justify-between text-base font-black text-slate-900 dark:text-white print:text-black pt-2 border-t border-slate-200 dark:border-slate-700">
                <span>Total Amount Due</span>
                <span className="text-indigo-600 dark:text-indigo-400">
                  {formatNaira(order.total)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
