// ============================================================================
// Context: Shop Manager MVP - Home (Sales/Cart) Page (Tabs Layout)
// ============================================================================
'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  getShopSettingsWithDefaults, 
  getTodaySales, 
  getSales, 
  getTotalInventoryValue, 
  getLowStockProducts,
  getInventoryStats
} from '@/lib/database';
import { formatCurrency } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import type { Sale, ProductVariation } from '@/types';
import StatsCard from '@/components/ui/StatsCard';
import '../lib/i18n'; // Import i18n configuration

export default function HomePage() {
  const { t } = useTranslation();
  const router = useRouter();

  // State for shop name and stats
  const [shopName, setShopName] = useState('My Shop');
  const [todaysRevenue, setTodaysRevenue] = useState(0);
  const [estimatedProfit, setEstimatedProfit] = useState(0);
  const [totalInventoryValue, setTotalInventoryValue] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all data in parallel for better performance
        const [settings, todaySales, allSales, inventoryValue, lowStockProducts, inventoryStats] = await Promise.all([
          getShopSettingsWithDefaults(),
          getTodaySales(),
          getSales(),
          getTotalInventoryValue(),
          getLowStockProducts(),
          getInventoryStats()
        ]);
        
        // Set shop name
        setShopName(settings.shop_name);
        
        // Calculate today's stats
        const todayRevenue = todaySales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
        const todayProfit = todaySales.reduce((sum, sale) => sum + (sale.estimated_profit || 0), 0);
        
        setTodaysRevenue(todayRevenue);
        setEstimatedProfit(todayProfit);
        setTotalInventoryValue(inventoryValue);
        setLowStockCount(lowStockProducts.length);
        setRecentSales(allSales.slice(0, 5)); // Show last 5 sales
        
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
          <div className="h-12 bg-gray-200 rounded mb-6"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">{shopName}</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatsCard
          title={t('home.todaysRevenue', 'Today\'s Revenue')}
          value={formatCurrency(todaysRevenue)}
          color="green"
          onClick={() => router.push('/sales/new')}
        />
        <StatsCard
          title={t('home.estimatedProfit', 'Estimated Profit')}
          value={formatCurrency(estimatedProfit)}
          color="blue"
          onClick={() => router.push('/sales/new')}
        />
        <StatsCard
          title={t('home.totalInventoryValue', 'Total Inventory Value')}
          value={formatCurrency(totalInventoryValue)}
          color="purple"
          onClick={() => router.push('/inventory')}
        />
        <StatsCard
          title={t('home.restockAlert', 'Restock Alert')}
          value={lowStockCount > 0 ? lowStockCount : '✓'}
          subtitle={lowStockCount > 0 ? t('home.itemsNeedRestock', 'items need restock') : t('home.allStocked', 'all stocked')}
          color={lowStockCount > 0 ? 'red' : 'green'}
          onClick={lowStockCount > 0 ? () => router.push('/inventory/low-stock') : undefined}
        />
      </div>

      {/* Add Sale Button */}
      <div className="mb-6">
        <button
          className="w-full bg-blue-600 text-white font-semibold py-4 px-6 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors text-lg shadow-sm"
          onClick={() => router.push('/sales/new')}
        >
          {t('home.addSale', 'Add Sale')}
        </button>
      </div>

      {/* Sales History */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{t('home.recentSales', 'Recent Sales')}</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {recentSales.length > 0 ? (
            recentSales.map((sale) => (
              <div key={sale.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900">
                        {t('home.invoice', 'Invoice')} #{sale.invoice_number}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDate(sale.created_at)}
                      </span>
                    </div>
                    {sale.customer_contact && (
                      <p className="text-xs text-gray-500 mt-1">
                        {t('home.customer', 'Customer')}: {sale.customer_contact}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">
                      {formatCurrency(sale.total_amount)}
                    </div>
                    <div className="text-xs text-green-600">
                      +{formatCurrency(sale.estimated_profit)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-gray-500">
              {t('home.noRecentSales', 'No recent sales')}
            </div>
          )}
        </div>
        {recentSales.length > 0 && (
          <div className="p-4 border-t border-gray-100">
            <button
              className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium"
              onClick={() => router.push('/reports')}
            >
              {t('home.viewAllSales', 'View All Sales')} →
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 