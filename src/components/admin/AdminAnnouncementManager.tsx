import React, { useState, useEffect } from 'react';
import { Megaphone, Save, Eye, Sparkles, CheckCircle2 } from 'lucide-react';
import { AnnouncementConfig } from '../../types';
import { api } from '../../services/api';
import { AnnouncementBar } from '../AnnouncementBar';

interface AdminAnnouncementManagerProps {
  onShowToast: (msg: string) => void;
}

export function AdminAnnouncementManager({ onShowToast }: AdminAnnouncementManagerProps) {
  const [config, setConfig] = useState<AnnouncementConfig>({
    enabled: true,
    text: '⚡ FLASH SALE: Get 20% off all orders over $50 with code',
    linkText: 'SAVE20',
    linkAction: 'coupon:SAVE20',
    badge: 'Limited Time',
    bgGradient: 'from-amber-600 to-rose-600',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getAnnouncementConfig().then((data) => {
      setConfig(data);
      setLoading(false);
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api.updateAnnouncementConfig(config);
      setConfig(updated);
      onShowToast('🚀 Announcement bar updated and live across the store!');
    } catch (e: any) {
      onShowToast(`Failed to update banner: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
            <Megaphone className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Promotional Announcement Bar Manager
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Customize the sitewide top banner to promote flash sales, new drops, and coupon codes.
            </p>
          </div>
        </div>
      </div>

      {/* Live Preview Card */}
      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Eye className="w-4 h-4 text-indigo-500" />
            <span>Live Header Preview</span>
          </span>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              config.enabled
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
            }`}
          >
            {config.enabled ? 'Visible to Customers' : 'Currently Hidden'}
          </span>
        </div>

        <div className="rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700">
          <AnnouncementBar config={config} />
        </div>
      </div>

      {/* Configuration Form */}
      <form onSubmit={handleSave} className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">
              Banner Visibility & Content
            </h4>
            <p className="text-xs text-slate-500">Enable or disable the bar across all pages</p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Banner Message Text *
            </label>
            <input
              type="text"
              required
              value={config.text}
              onChange={(e) => setConfig({ ...config, text: e.target.value })}
              className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Pill Badge (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. FLASH SALE, NEW, 24H ONLY"
              value={config.badge || ''}
              onChange={(e) => setConfig({ ...config, badge: e.target.value })}
              className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Clickable Action Label
            </label>
            <input
              type="text"
              placeholder="e.g. SAVE20, Shop Now, Learn More"
              value={config.linkText || ''}
              onChange={(e) => setConfig({ ...config, linkText: e.target.value })}
              className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Action Type / Target
            </label>
            <input
              type="text"
              placeholder="e.g. coupon:SAVE20 or /deals"
              value={config.linkAction || ''}
              onChange={(e) => setConfig({ ...config, linkAction: e.target.value })}
              className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Tip: Use <code>coupon:YOURCODE</code> to automatically copy & apply the coupon on click.
            </span>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Publishing...' : 'Save & Publish Banner'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
