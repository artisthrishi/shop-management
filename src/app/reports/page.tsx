// ✅ Context for Cursor AI – Shop Manager MVP
//
// We're building a mobile-first, multilingual, offline-capable PWA for small shopkeepers (grocery/pharmacy).
// The MVP has 4 main tabs: Home, Inventory, Reports, and Settings.
// Built using Next.js (App Router), Tailwind CSS, Supabase (for auth + DB), and deployed as a PWA.
//
// ✅ Core features implemented or in progress:
// - Supabase project is created ✅
// - Custom schema with tables: users, units, products, product_variations, sales, sale_items ✅
// - Triggers for auto stock update and invoice calculation ✅
// - Supabase client is configured via `.env.local` and `utils/supabaseClient.ts` ✅
//
// ✅ Feature roadmap:
// 1. **Home Tab** – Acts as a sales + cart page
//    - Search + add product variations to cart
//    - Show total, editable selling price per item
//    - Checkout updates stock, shows invoice preview (PDF + WhatsApp)
//
// 2. **Inventory Tab**
//    - Add new product (+ variations like ₹5/₹10 packs)
//    - View inventory list (card view with stock + min alert)
//    - Support fractional units (e.g., 1.25 kg), unit awareness
//
// 3. **Reports Tab**
//    - Show total sales, profit, top-selling items, low stock alerts
//    - Filter by today, this week, this month
//    - Export as PDF
//
// 4. **Settings Tab**
//    - Manage shop info (GST, contact)
//    - Manage users (roles: owner, staff)
//    - Backup/restore (later)
//
// ✨ We want a simple, fast UI with minimal popup dialogs. All pages should be responsive and ready for PWA deployment.

'use client';

import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { 
  getPaymentMethodStats, 
  getSalesSummary, 
  getTopSellingProductsReal, 
  getLowStockProductsReal 
} from '@/lib/database';
import { exportToPDF } from '@/lib/pdfExport';

export default function ReportsPage() {
  const { t } = useTranslation();
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'lastWeek' | 'lastMonth'>('today');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Real data states
  const [salesSummary, setSalesSummary] = useState<{
    totalSales: number;
    estimatedProfit: number;
    checkouts: number;
    itemsSold: number;
  } | null>(null);
  const [paymentStats, setPaymentStats] = useState<any>(null);
  const [topSellingProducts, setTopSellingProducts] = useState<Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Array<{
    name: string;
    currentStock: number;
    minStock: number;
  }>>([]);
  const [exportingPDF, setExportingPDF] = useState(false);

  const periods: { key: 'today' | 'lastWeek' | 'lastMonth'; label: string }[] = [
    { key: 'today', label: t('reports.filters.today') },
    { key: 'lastWeek', label: t('reports.filters.lastWeek') },
    { key: 'lastMonth', label: t('reports.filters.lastMonth') },
  ];

  // Load all report data
  useEffect(() => {
    const loadReportData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Load all data in parallel for better performance
        const [summary, payment, topProducts, lowStock] = await Promise.all([
          getSalesSummary(selectedPeriod),
          getPaymentMethodStats(selectedPeriod),
          getTopSellingProductsReal(selectedPeriod, 5),
          getLowStockProductsReal()
        ]);

        setSalesSummary(summary);
        setPaymentStats(payment);
        setTopSellingProducts(topProducts);
        setLowStockProducts(lowStock);
      } catch (error) {
        console.error('Error loading report data:', error);
        setError('Failed to load report data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadReportData();
  }, [selectedPeriod]);

  // Loading skeleton component
  const MetricCardSkeleton = () => (
    <div className="bg-white rounded-lg shadow p-4 animate-pulse">
      <div className="flex items-center">
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
          <div className="h-8 bg-gray-200 rounded w-32"></div>
        </div>
        <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
      </div>
    </div>
  );

  // Error state component
  const ErrorState = ({ message }: { message: string }) => (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
      <svg className="w-8 h-8 text-red-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
      <p className="text-red-600 font-medium">{message}</p>
      <button 
        onClick={() => window.location.reload()} 
        className="mt-2 text-red-500 hover:text-red-700 underline"
      >
        Try again
      </button>
    </div>
  );

  // Empty state component
  const EmptyState = ({ message }: { message: string }) => (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
      <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <p className="text-gray-600">{message}</p>
    </div>
  );

  // Handle PDF export
  const handleExportPDF = async () => {
    setExportingPDF(true);
    try {
      // Get period label for the title
      const periodLabel = periods.find(p => p.key === selectedPeriod)?.label || 'Report';
      const title = `Sales Report - ${periodLabel}`;

      // Export the PDF with all data
      exportToPDF(
        title,
        salesSummary,
        paymentStats,
        topSellingProducts,
        lowStockProducts
      );

      // Show success message after a short delay
      setTimeout(() => {
        setExportingPDF(false);
        alert('PDF generated successfully! Check your print dialog.');
      }, 1000);

    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
      setExportingPDF(false);
    }
  };

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('reports.title')}</h1>
      </div>

      {/* Period Filters */}
      <div className="flex space-x-2 overflow-x-auto pb-2">
        {periods.map((period) => (
          <button
            key={period.key}
            onClick={() => setSelectedPeriod(period.key)}
            disabled={loading}
            className={`flex-shrink-0 px-4 py-2 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
              selectedPeriod === period.key
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:opacity-50'
            }`}
          >
            {period.label}
            {loading && selectedPeriod === period.key && (
              <svg className="w-4 h-4 ml-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
          </button>
        ))}
      </div>

      {/* Error State */}
      {error && <ErrorState message={error} />}

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4">
        {loading ? (
          <>
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </>
        ) : salesSummary ? (
          <>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">{t('reports.totalSales')}</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(salesSummary.totalSales)}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">{t('reports.estimatedProfit')}</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(salesSummary.estimatedProfit)}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">{t('reports.checkouts')}</p>
                  <p className="text-2xl font-bold text-purple-600">{formatNumber(salesSummary.checkouts)}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">{t('reports.itemsSold')}</p>
                  <p className="text-2xl font-bold text-orange-600">{formatNumber(salesSummary.itemsSold)}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="col-span-2">
            <EmptyState message="No sales data available for the selected period." />
          </div>
        )}
      </div>

      {/* Payment Method Statistics */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{t('reports.paymentMethods', 'Payment Methods')}</h3>
        </div>
        <div className="p-4">
          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">{t('reports.loading', 'Loading...')}</p>
            </div>
          ) : paymentStats ? (
            <div className="space-y-4">
              {/* Cash */}
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{t('reports.cash', 'Cash')}</p>
                    <p className="text-sm text-gray-500">{formatNumber(paymentStats.cash.count)} {t('reports.transactions', 'transactions')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-600">{formatCurrency(paymentStats.cash.amount)}</p>
                  <p className="text-xs text-gray-500">
                    {paymentStats.total.amount > 0 ? Math.round((paymentStats.cash.amount / paymentStats.total.amount) * 100) : 0}%
                  </p>
                </div>
              </div>

              {/* Card */}
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{t('reports.card', 'Card')}</p>
                    <p className="text-sm text-gray-500">{formatNumber(paymentStats.card.count)} {t('reports.transactions', 'transactions')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-blue-600">{formatCurrency(paymentStats.card.amount)}</p>
                  <p className="text-xs text-gray-500">
                    {paymentStats.total.amount > 0 ? Math.round((paymentStats.card.amount / paymentStats.total.amount) * 100) : 0}%
                  </p>
                </div>
              </div>

              {/* UPI */}
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{t('reports.upi', 'UPI')}</p>
                    <p className="text-sm text-gray-500">{formatNumber(paymentStats.upi.count)} {t('reports.transactions', 'transactions')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-purple-600">{formatCurrency(paymentStats.upi.amount)}</p>
                  <p className="text-xs text-gray-500">
                    {paymentStats.total.amount > 0 ? Math.round((paymentStats.upi.amount / paymentStats.total.amount) * 100) : 0}%
                  </p>
                </div>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border-t">
                <div>
                  <p className="font-semibold text-gray-900">{t('reports.total', 'Total')}</p>
                  <p className="text-sm text-gray-500">{formatNumber(paymentStats.total.count)} {t('reports.transactions', 'transactions')}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{formatCurrency(paymentStats.total.amount)}</p>
                  <p className="text-xs text-gray-500">100%</p>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState message="No payment data available for the selected period." />
          )}
        </div>
      </div>

      {/* Top Selling Products */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{t('reports.topSelling')}</h3>
        </div>
        <div className="p-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between animate-pulse">
                  <div className="flex items-center">
                    <div className="w-6 h-6 bg-gray-200 rounded-full mr-3"></div>
                    <div>
                      <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
                      <div className="h-3 bg-gray-200 rounded w-20"></div>
                    </div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                </div>
              ))}
            </div>
          ) : topSellingProducts.length > 0 ? (
            <div className="space-y-3">
              {topSellingProducts.map((product, index) => (
                <div key={product.name} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="w-6 h-6 bg-blue-100 text-blue-600 text-xs font-medium rounded-full flex items-center justify-center mr-3">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">{product.name}</p>
                      <p className="text-sm text-gray-500">{formatNumber(product.quantity)} sold</p>
                    </div>
                  </div>
                  <p className="font-semibold text-green-600">{formatCurrency(product.revenue)}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No top selling products found for the selected period." />
          )}
        </div>
      </div>

      {/* Low Stock Products */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{t('reports.lowStock')}</h3>
        </div>
        <div className="p-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between animate-pulse">
                  <div>
                    <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                  </div>
                  <div className="h-6 bg-gray-200 rounded w-20"></div>
                </div>
              ))}
            </div>
          ) : lowStockProducts.length > 0 ? (
            <div className="space-y-3">
              {lowStockProducts.map((product) => (
                <div key={product.name} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-500">
                      Current: {product.currentStock} | Min: {product.minStock}
                    </p>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                    Low Stock
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="All products are well stocked! No low stock items found." />
          )}
        </div>
      </div>

      {/* Export Button */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="text-center">
          <button 
            onClick={handleExportPDF}
            disabled={loading || !salesSummary || exportingPDF}
            className="inline-flex items-center px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading || exportingPDF ? (
              <>
                <svg className="w-5 h-5 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {exportingPDF ? 'Generating PDF...' : 'Loading...'}
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export as PDF
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
} 