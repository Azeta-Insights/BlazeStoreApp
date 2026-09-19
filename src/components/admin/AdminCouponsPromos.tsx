import React, { useState, useEffect } from 'react';
import {
  Tag,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  Percent,
  DollarSign,
  Calendar,
  Copy,
  Check,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { Coupon, AdminRole } from '../../types';
import { api } from '../../services/api';
import { formatNaira } from '../../lib/currency';

interface AdminCouponsPromosProps {
  adminRole: AdminRole;
  onShowToast: (msg: string) => void;
}

export function AdminCouponsPromos({ adminRole, onShowToast }: AdminCouponsPromosProps) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Form State
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState(15);
  const [minOrderAmount, setMinOrderAmount] = useState(10000);
  const [maxDiscountAmount, setMaxDiscountAmount] = useState<number | ''>('');
  const [usageLimit, setUsageLimit] = useState<number | ''>(500);
  const [expiryDate, setExpiryDate] = useState('');
  const [description, setDescription] = useState('');

  const loadCoupons = async () => {
    try {
      setLoading(true);
      const list = await api.getCoupons();
      setCoupons(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const handleCopy = (couponCode: string) => {
    navigator.clipboard?.writeText(couponCode);
    setCopiedCode(couponCode);
    setTimeout(() => setCopiedCode(null), 2000);
    onShowToast(`Copied code: ${couponCode}`);
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      onShowToast('Please enter a coupon code.');
      return;
    }

    try {
      const created = await api.createCoupon({
        code: cleanCode,
        discountType,
        discountValue: Number(discountValue),
        minOrderAmount: Number(minOrderAmount) || 0,
        maxDiscountAmount: maxDiscountAmount !== '' ? Number(maxDiscountAmount) : undefined,
        usageLimit: usageLimit !== '' ? Number(usageLimit) : undefined,
        expiryDate: expiryDate || undefined,
        description: description.trim() || `${discountValue}${discountType === 'percentage' ? '%' : ' NGN'} store discount`,
        isActive: true,
      });

      setCoupons((prev) => [created, ...prev]);
      setIsModalOpen(false);
      onShowToast(`🎉 Coupon "${cleanCode}" created successfully!`);

      // Reset form
      setCode('');
      setDiscountValue(15);
      setMinOrderAmount(10000);
      setMaxDiscountAmount('');
      setDescription('');
    } catch (err: any) {
      onShowToast(`Failed to create coupon: ${err.message}`);
    }
  };

  const handleToggleActive = async (coupon: Coupon) => {
    try {
      const updated = await api.updateCoupon(coupon.id, { isActive: !coupon.isActive });
      setCoupons((prev) => prev.map((c) => (c.id === coupon.id ? updated : c)));
      onShowToast(updated.isActive ? `Activated coupon "${coupon.code}"` : `Deactivated coupon "${coupon.code}"`);
    } catch (e) {
      onShowToast('Failed to update coupon status.');
    }
  };

  const handleDelete = async (couponId: string, codeStr: string) => {
    try {
      await api.deleteCoupon(couponId);
      setCoupons((prev) => prev.filter((c) => c.id !== couponId));
      onShowToast(`🗑️ Deleted coupon "${codeStr}"`);
    } catch (e) {
      onShowToast('Failed to delete coupon.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Tag className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Promotions & Coupon Codes
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Create custom discounts, percent-offs, and minimum spend promo campaigns.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Coupon</span>
        </button>
      </div>

      {/* Coupons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {coupons.map((coupon) => {
          const isCopied = copiedCode === coupon.code;
          const isExpired = coupon.expiryDate && new Date(coupon.expiryDate) < new Date();

          return (
            <div
              key={coupon.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                coupon.isActive && !isExpired
                  ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-400 shadow-2xs'
                  : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-70'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(coupon.code)}
                      className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 font-mono font-black text-indigo-700 dark:text-indigo-300 text-sm tracking-wider hover:scale-105 transition-all cursor-pointer"
                    >
                      <span>{coupon.code}</span>
                      {isCopied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                      )}
                    </button>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      coupon.isActive && !isExpired
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                        : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                    }`}
                  >
                    {isExpired ? 'Expired' : coupon.isActive ? 'Active' : 'Paused'}
                  </span>
                </div>

                <div className="flex items-baseline gap-1 my-2">
                  <span className="text-2xl font-black text-slate-900 dark:text-white">
                    {coupon.discountType === 'percentage'
                      ? `${coupon.discountValue}% OFF`
                      : `${formatNaira(coupon.discountValue)} OFF`}
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">
                  {coupon.description}
                </p>

                <div className="text-[11px] text-slate-500 space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                  {coupon.minOrderAmount ? (
                    <p>• Min. Cart Spend: <strong>{formatNaira(coupon.minOrderAmount)}</strong></p>
                  ) : (
                    <p>• No minimum spend requirement</p>
                  )}
                  {coupon.usageLimit && (
                    <p>
                      • Usage: <strong>{coupon.usedCount}</strong> / {coupon.usageLimit} redeemed
                    </p>
                  )}
                  {coupon.expiryDate && (
                    <p className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>Expires: {new Date(coupon.expiryDate).toLocaleDateString()}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => handleToggleActive(coupon)}
                  className={`text-xs font-bold cursor-pointer transition-colors ${
                    coupon.isActive ? 'text-amber-600 hover:text-amber-700' : 'text-emerald-600 hover:text-emerald-700'
                  }`}
                >
                  {coupon.isActive ? 'Pause Code' : 'Activate Code'}
                </button>

                <button
                  onClick={() => handleDelete(coupon.id, coupon.code)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                  title="Delete coupon"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Coupon Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Create Promotional Coupon
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Coupon Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FLASH30, VIPFALL, FREESHIP"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2.5 font-mono text-sm uppercase rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold tracking-wider"
                />
              </div>

              {/* Discount Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Discount Type
                  </label>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDiscountType('percentage')}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        discountType === 'percentage'
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400'
                          : 'border-slate-200 dark:border-slate-700 text-slate-500'
                      }`}
                    >
                      <Percent className="w-3.5 h-3.5" /> Percentage
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType('fixed')}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        discountType === 'fixed'
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400'
                          : 'border-slate-200 dark:border-slate-700 text-slate-500'
                      }`}
                    >
                      <span className="font-bold text-xs">₦</span> Fixed Amount
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Discount Value {discountType === 'percentage' ? '(%)' : '(₦)'} *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={discountType === 'percentage' ? 100 : 1000000}
                    required
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Min. Order Amount (₦)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={minOrderAmount}
                    onChange={(e) => setMinOrderAmount(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Usage Limit (Optional)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 500"
                    value={usageLimit}
                    onChange={(e) => setUsageLimit(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Expiration Date (Optional)
                </label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Campaign Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. 20% off all summer apparel and accessories"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md"
                >
                  Create & Launch Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
