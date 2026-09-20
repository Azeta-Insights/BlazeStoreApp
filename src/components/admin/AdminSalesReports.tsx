import React, { useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  RotateCcw,
  Percent,
  Download,
  Calendar,
  AlertCircle,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { SalesAnalytics, AdminRole } from '../../types';
import { formatNaira } from '../../lib/currency';

interface AdminSalesReportsProps {
  analytics: SalesAnalytics | null;
  isLoading: boolean;
  onRefresh: () => void;
  adminRole: AdminRole;
  isDarkMode: boolean;
}

const COLORS = ['#7C6FE0', '#38BDF8', '#F472B6', '#34D399', '#FBBF24', '#A78BFA'];

export const AdminSalesReports: React.FC<AdminSalesReportsProps> = ({
  analytics,
  isLoading,
  onRefresh,
  adminRole,
  isDarkMode,
}) => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('7d');

  if (isLoading || !analytics) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-3">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#7C6FE0] border-t-transparent" />
        <p className="text-xs font-semibold text-[#8A8A94]">Loading real-time sales metrics...</p>
      </div>
    );
  }

  const exportCSV = () => {
    const rows = [
      ['Metric', 'Value'],
      ['Gross Revenue (NGN)', `₦${analytics.grossRevenue.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`],
      ['Net Revenue (NGN)', `₦${analytics.netRevenue.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`],
      ['Total Orders', analytics.totalOrders],
      ['Total Refunds', analytics.totalRefunds],
      ['Refund Amount Total (NGN)', `₦${analytics.refundAmountTotal.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`],
      ['Average Order Value (NGN)', `₦${analytics.averageOrderValue.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`],
      ['Total Products', analytics.totalProducts],
      ['Low Stock SKUs', analytics.lowStockCount],
      ['Registered Customers', analytics.totalCustomers],
      [],
      ['Daily Revenue Timeline'],
      ['Date', 'Revenue (NGN)', 'Orders', 'Refunds (NGN)'],
      ...analytics.dailyRevenue.map((d) => [d.date, d.revenue, d.orders, d.refunds]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `blazestore_sales_report_ngn_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const refundRate = analytics.grossRevenue > 0
    ? ((analytics.refundAmountTotal / analytics.grossRevenue) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black tracking-tight">Sales Reports &amp; Revenue Analytics (NGN ₦)</h2>
            <span className="rounded-full bg-[#10B981]/15 px-2.5 py-0.5 text-xs font-bold text-[#10B981]">
              Live Store Data
            </span>
          </div>
          <p className="text-xs text-[#8A8A94] mt-0.5">
            Real-time analytics, revenue distribution in Naira, order tracking, and refund impact.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Time Range Selector */}
          <div className={`flex rounded-xl p-1 border ${isDarkMode ? 'bg-[#202024] border-[#27272A]' : 'bg-[#FAF9FC] border-[#EDEDF2]'}`}>
            {(['7d', '30d', 'all'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition capitalize cursor-pointer ${
                  timeRange === r
                    ? 'bg-[#7C6FE0] text-white shadow-xs'
                    : 'text-[#8A8A94] hover:text-[#1F1F23] dark:hover:text-white'
                }`}
              >
                {r === 'all' ? 'All Time' : `Last ${r.toUpperCase()}`}
              </button>
            ))}
          </div>

          {adminRole === 'owner' ? (
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 rounded-xl bg-[#7C6FE0] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#6D60D6] transition cursor-pointer"
              title="Export raw revenue and ledger data (Owner Exclusive)"
            >
              <Download className="h-4 w-4" />
              <span>Export CSV</span>
            </button>
          ) : (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 border border-[#EDEDF2] dark:border-[#27272A] text-[11px] font-bold text-[#8A8A94]"
              title="Raw revenue data export is restricted to Store Owners under RBAC policy"
            >
              <Download className="h-3.5 w-3.5 opacity-50" />
              <span>Raw Export (Owner Only)</span>
            </div>
          )}
        </div>
      </div>

      {/* KPI Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Revenue */}
        <div
          className={`rounded-2xl p-5 border transition-all ${
            isDarkMode ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-[#EDEDF2] shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#8A8A94] uppercase tracking-wider">Gross Sales</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7C6FE0]/15 text-[#7C6FE0]">
              <span className="font-bold text-base">₦</span>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black tracking-tight">{formatNaira(analytics.grossRevenue)}</span>
            <div className="flex items-center gap-1 text-[11px] font-bold text-[#4CAF50] mt-1">
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>Net: {formatNaira(analytics.netRevenue)}</span>
            </div>
          </div>
        </div>

        {/* Total Orders */}
        <div
          className={`rounded-2xl p-5 border transition-all ${
            isDarkMode ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-[#EDEDF2] shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#8A8A94] uppercase tracking-wider">Total Orders</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#38BDF8]/15 text-[#0284C7]">
              <ShoppingBag className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black tracking-tight">{analytics.totalOrders}</span>
            <div className="flex items-center gap-1 text-[11px] font-bold text-[#8A8A94] mt-1">
              <span>Avg Value: {formatNaira(analytics.averageOrderValue)}</span>
            </div>
          </div>
        </div>

        {/* Refunds Issued */}
        <div
          className={`rounded-2xl p-5 border transition-all ${
            isDarkMode ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-[#EDEDF2] shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#8A8A94] uppercase tracking-wider">Total Refunds</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FB7185]/15 text-[#E11D48]">
              <RotateCcw className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black tracking-tight text-[#E11D48]">
              {formatNaira(analytics.refundAmountTotal)}
            </span>
            <div className="flex items-center gap-1 text-[11px] font-bold text-[#8A8A94] mt-1">
              <span>{analytics.totalRefunds} refunds ({refundRate}% rate)</span>
            </div>
          </div>
        </div>

        {/* Catalog Health */}
        <div
          className={`rounded-2xl p-5 border transition-all ${
            isDarkMode ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-[#EDEDF2] shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#8A8A94] uppercase tracking-wider">Catalog Health</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#34D399]/15 text-[#059669]">
              <Package className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black tracking-tight">{analytics.totalProducts} SKUs</span>
            <div className="flex items-center gap-1 text-[11px] font-bold text-[#D97706] mt-1">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>{analytics.lowStockCount} Low stock / {analytics.outOfStockCount} Out</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue & Sales Trend Chart (2 Cols) */}
        <div
          className={`lg:col-span-2 rounded-2xl p-5 border ${
            isDarkMode ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-[#EDEDF2] shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm">Revenue & Orders Timeline</h3>
              <p className="text-[11px] text-[#8A8A94]">Daily gross revenue in Naira (₦) compared to refund deductions</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#7C6FE0]" />
                <span className="text-[#8A8A94]">Revenue</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#FB7185]" />
                <span className="text-[#8A8A94]">Refunds</span>
              </div>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.dailyRevenue} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7C6FE0" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#7C6FE0" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="refundGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FB7185" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#FB7185" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#27272A' : '#EDEDF2'} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#8A8A94' }}
                  axisLine={{ stroke: isDarkMode ? '#27272A' : '#EDEDF2' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#8A8A94' }}
                  axisLine={{ stroke: isDarkMode ? '#27272A' : '#EDEDF2' }}
                  tickFormatter={(val) => `₦${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDarkMode ? '#1E1E22' : '#FFFFFF',
                    borderColor: isDarkMode ? '#333' : '#EDEDF2',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                  formatter={(val: any) => [formatNaira(Number(val))]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#7C6FE0"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#revenueGrad)"
                  name="Revenue"
                />
                <Area
                  type="monotone"
                  dataKey="refunds"
                  stroke="#FB7185"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#refundGrad)"
                  name="Refunds"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sales by Category (1 Col) */}
        <div
          className={`rounded-2xl p-5 border ${
            isDarkMode ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-[#EDEDF2] shadow-xs'
          }`}
        >
          <h3 className="font-bold text-sm">Category Revenue Distribution</h3>
          <p className="text-[11px] text-[#8A8A94] mb-2">Sales split across store categories</p>

          {analytics.categorySales.length > 0 ? (
            <>
              <div className="h-56 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.categorySales}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {analytics.categorySales.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDarkMode ? '#1E1E22' : '#FFFFFF',
                        borderColor: isDarkMode ? '#333' : '#EDEDF2',
                        borderRadius: '12px',
                        fontSize: '12px',
                      }}
                      formatter={(val: any) => [formatNaira(Number(val)), 'Sales']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend Table */}
              <div className="space-y-1.5 mt-1">
                {analytics.categorySales.slice(0, 4).map((cat, idx) => (
                  <div key={cat.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                      />
                      <span className="font-medium text-[#52525B] dark:text-[#A1A1AA] truncate">{cat.name}</span>
                    </div>
                    <span className="font-bold">{formatNaira(cat.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-56 flex flex-col items-center justify-center text-center p-4 border border-dashed rounded-xl border-[#EDEDF2] dark:border-[#27272A] mt-2">
              <Package className="h-8 w-8 text-[#8A8A94] opacity-50 mb-2" />
              <p className="text-xs font-bold text-[#52525B] dark:text-[#A1A1AA]">No Category Sales Yet</p>
              <p className="text-[11px] text-[#8A8A94] mt-1 max-w-[200px]">
                Real-time sales distribution will populate as orders are completed in the storefront.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Top-Selling Products Table */}
      <div
        className={`rounded-2xl border overflow-hidden ${
          isDarkMode ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-[#EDEDF2] shadow-xs'
        }`}
      >
        <div className="p-5 border-b border-[#EDEDF2] dark:border-[#27272A] flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm">Top-Performing Products</h3>
            <p className="text-[11px] text-[#8A8A94]">Catalog items ranked by revenue and order volume</p>
          </div>
          <span className="text-xs font-bold text-[#7C6FE0] bg-[#7C6FE0]/10 px-3 py-1 rounded-full">
            Top 5 Leaderboard
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`border-b text-[11px] font-bold uppercase tracking-wider text-[#8A8A94] ${isDarkMode ? 'bg-[#202024] border-[#27272A]' : 'bg-[#FAF9FC] border-[#EDEDF2]'}`}>
              <tr>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4 text-center">Units Sold</th>
                <th className="py-3 px-4 text-center">Remaining Stock</th>
                <th className="py-3 px-4 text-right">Total Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDEDF2] dark:divide-[#27272A]">
              {analytics.topProducts.length > 0 ? (
                analytics.topProducts.map((p, index) => (
                  <tr key={p.id} className="hover:bg-black/2 dark:hover:bg-white/2 transition">
                    <td className="py-3.5 px-4 font-semibold">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#7C6FE0]/15 text-[10px] font-bold text-[#7C6FE0]">
                          #{index + 1}
                        </span>
                        <span>{p.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold">{p.salesCount} units</td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.stock > 10
                            ? 'bg-[#E3F2DD] text-[#2E7D32]'
                            : p.stock > 0
                            ? 'bg-[#FEF3C7] text-[#D97706]'
                            : 'bg-[#FCE7F3] text-[#BE185D]'
                        }`}
                      >
                        {p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-[#7C6FE0]">
                      {formatNaira(p.revenue)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-[#8A8A94]">
                    No sales recorded yet. Place customer orders to generate real-time leaderboards.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
