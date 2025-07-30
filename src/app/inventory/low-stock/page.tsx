// ============================================================================
// Context: Shop Manager MVP - Low Stock Items Page
// ============================================================================
'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getLowStockProducts, getInventoryStats } from '@/lib/database';
import { formatCurrency } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import type { ProductVariation } from '@/types';


import { getStockStatus, getStockStatusColor } from '@/lib/utils';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Progress from '@/components/ui/Progress';
import EmptyState from '@/components/ui/EmptyState';
import StatsCard from '@/components/ui/StatsCard';
import '../../../lib/i18n'; // Import i18n configuration

export default function LowStockPage() {
  const { t } = useTranslation();
  const router = useRouter();

  const [lowStockItems, setLowStockItems] = useState<ProductVariation[]>([]);
  const [inventoryStats, setInventoryStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [items, stats] = await Promise.all([
          getLowStockProducts(),
          getInventoryStats()
        ]);
        
        setLowStockItems(items);
        setInventoryStats(stats);
      } catch (error) {
        console.error('Error fetching low stock items:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getStatusText = (item: ProductVariation) => {
    const status = getStockStatus(item);
    switch (status) {
      case 'out-of-stock':
        return t('inventory.outOfStock', 'Out of Stock');
      case 'low-stock':
        return t('inventory.lowStock', 'Low Stock');
      default:
        return t('inventory.inStock', 'In Stock');
    }
  };

  const getStatusIcon = (item: ProductVariation) => {
    const status = getStockStatus(item);
    switch (status) {
      case 'out-of-stock':
        return '🔴';
      case 'low-stock':
        return '🟡';
      default:
        return '🟢';
    }
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('inventory.lowStockItems', 'Low Stock Items')}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {lowStockItems.length} {t('inventory.itemsNeedRestock', 'items need restock')}
          </p>
        </div>
        <button
          onClick={() => router.back()}
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          {t('common.back', 'Back')}
        </button>
      </div>

      {/* Stats Summary */}
      {inventoryStats && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <StatsCard
            title={t('inventory.lowStock', 'Low Stock')}
            value={inventoryStats.lowStockCount}
            color="yellow"
          />
          <StatsCard
            title={t('inventory.outOfStock', 'Out of Stock')}
            value={inventoryStats.outOfStockCount}
            color="red"
          />
          <StatsCard
            title={t('inventory.totalItems', 'Total Items')}
            value={inventoryStats.totalItems}
            color="blue"
          />
        </div>
      )}

      {/* Low Stock Items List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('inventory.itemsNeedingRestock', 'Items Needing Restock')}
          </h2>
        </div>
        
        {lowStockItems.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {lowStockItems.map((item) => (
              <div key={item.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{getStatusIcon(item)}</span>
                      <div>
                                                 <div className="flex items-center space-x-2">
                           <span className="font-medium text-gray-900">
                             {(item as any).products?.name || 'Unknown Product'}
                           </span>
                           <span className="text-sm text-gray-500">
                             ({item.name})
                           </span>
                         </div>
                         {(item as any).products?.brand && (
                           <p className="text-xs text-gray-500 mt-1">
                             {t('inventory.brand', 'Brand')}: {(item as any).products.brand}
                           </p>
                         )}
                        <p className="text-xs text-gray-500">
                          {t('inventory.location', 'Location')}: {item.location}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`text-sm font-semibold ${getStockStatusColor(getStockStatus(item))}`}>
                      {getStatusText(item)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {t('inventory.currentStock', 'Current')}: {item.current_stock}
                    </div>
                    <div className="text-xs text-gray-500">
                      {t('inventory.minStock', 'Min')}: {item.min_stock}
                    </div>
                    <div className="text-xs text-gray-500">
                      {t('inventory.unit', 'Unit')}: {item.units?.name || 'pcs'}
                    </div>
                  </div>
                </div>
                
                {/* Stock Progress Bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{t('inventory.stockLevel', 'Stock Level')}</span>
                    <span>{item.current_stock} / {item.min_stock}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        item.current_stock === 0 
                          ? 'bg-red-500' 
                          : item.current_stock <= item.min_stock 
                            ? 'bg-yellow-500' 
                            : 'bg-green-500'
                      }`}
                      style={{ 
                        width: `${Math.min((item.current_stock / item.min_stock) * 100, 100)}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="🎉"
            title={t('inventory.allStocked', 'All Items Stocked!')}
            description={t('inventory.noRestockNeeded', 'No items need restocking at the moment.')}
          />
        )}
      </div>

      {/* Action Buttons */}
      {lowStockItems.length > 0 && (
        <div className="flex gap-4">
          <button
            onClick={() => router.push('/inventory')}
            className="flex-1 bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            {t('inventory.manageInventory', 'Manage Inventory')}
          </button>
          <button
            onClick={() => router.push('/inventory/new')}
            className="flex-1 bg-green-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
          >
            {t('inventory.addProduct', 'Add Product')}
          </button>
        </div>
      )}
    </div>
  );
} 