// ============================================================================
// Context: Shop Manager MVP - Home (Sales/Cart) Page (Tabs Layout)
// ============================================================================
'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getShopSettings, getSales } from '@/lib/database';
import { formatCurrency } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const { t } = useTranslation();
  const router = useRouter();

  // State for shop name and stats
  const [shopName, setShopName] = useState('My Shop');
  const [todaysRevenue, setTodaysRevenue] = useState(0);
  const [estimatedProfit, setEstimatedProfit] = useState(0);
  const [salesCount, setSalesCount] = useState(0);

  useEffect(() => {
    // Fetch shop name
    getShopSettings().then(settings => {
      if (settings?.shop_name) setShopName(settings.shop_name);
    });

    // Fetch today's sales (placeholder: replace with real logic)
    // You can filter by today's date using getSales({ startDate, endDate })
    getSales().then(sales => {
      setSalesCount(sales.length);
      // Placeholder: sum up total_amount and estimated_profit for today
      setTodaysRevenue(sales.reduce((sum, s) => sum + (s.total_amount || 0), 0));
      setEstimatedProfit(sales.reduce((sum, s) => sum + (s.estimated_profit || 0), 0));
    });
  }, []);

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-gray-900">{shopName}</h1>
      </div>

      {/* Quick Stats */}
      <div className="flex gap-4 mb-2">
        <div className="flex-1 bg-white rounded-lg shadow p-4 flex flex-col items-center">
          <span className="text-sm text-gray-500">{t('home.todaysRevenue', 'Today\'s Revenue')}</span>
          <span className="text-xl font-bold text-green-600">{formatCurrency(todaysRevenue)}</span>
        </div>
        <div className="flex-1 bg-white rounded-lg shadow p-4 flex flex-col items-center">
          <span className="text-sm text-gray-500">{t('home.estimatedProfit', 'Estimated Profit')}</span>
          <span className="text-xl font-bold text-blue-600">{formatCurrency(estimatedProfit)}</span>
        </div>
        <div className="flex-1 bg-white rounded-lg shadow p-4 flex flex-col items-center">
          <span className="text-sm text-gray-500">{t('home.salesCount', 'No. of Sales')}</span>
          <span className="text-xl font-bold text-orange-600">{salesCount}</span>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          className="inline-flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-800 font-medium rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors text-lg"
          onClick={() => router.push('/reports')}
        >
          {t('home.seeSalesHistory', 'See Sales History')}
        </button>
        <button
          className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors text-lg"
          onClick={() => router.push('/sales/new')}
        >
          {t('home.addSale', 'Add Sale')}
        </button>
      </div>
    </div>
  );
} 