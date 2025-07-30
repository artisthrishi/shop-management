import { storeOfflineSale, getOfflineSales, removeOfflineSale } from './offlineStorage';
import { createSaleWithItems } from './database';
import { requestBackgroundSync } from './serviceWorker';

export interface OfflineSaleData {
  id: string;
  timestamp: number;
  data: {
    total_amount: number;
    estimated_profit: number;
    customer_name?: string;
    customer_phone?: string;
    payment_method?: string;
    cartItems: Array<{
      productVariation: any;
      quantity: number;
      sellingPrice: number;
    }>;
  };
  synced: boolean;
  syncAttempts: number;
}

// Store a sale for offline sync
export async function storeSaleForSync(saleData: any, cartItems: any[]): Promise<string> {
  try {
    const offlineSaleData = {
      total_amount: saleData.total_amount,
      estimated_profit: saleData.estimated_profit,
      customer_name: saleData.customer_name,
      customer_phone: saleData.customer_phone,
      payment_method: saleData.payment_method,
      cartItems: cartItems,
    };

    const saleId = await storeOfflineSale(offlineSaleData);
    console.log('[Offline] Sale stored for sync:', saleId);
    
    // Request background sync
    await requestBackgroundSync('sync-sales');
    
    return saleId;
  } catch (error) {
    console.error('[Offline] Failed to store sale for sync:', error);
    throw error;
  }
}

// Sync all offline sales
export async function syncOfflineSales(): Promise<{
  success: number;
  failed: number;
  total: number;
}> {
  try {
    console.log('[Offline] Starting offline sales sync...');
    
    const offlineSales = await getOfflineSales();
    if (offlineSales.length === 0) {
      console.log('[Offline] No offline sales to sync');
      return { success: 0, failed: 0, total: 0 };
    }

    let successCount = 0;
    let failedCount = 0;

    for (const offlineSale of offlineSales) {
      try {
        console.log('[Offline] Syncing sale:', offlineSale.id);
        
        // Create the sale in the database
        const result = await createSaleWithItems(
          offlineSale.data,
          offlineSale.data.cartItems
        );

        if (result && result.sale) {
          // Remove from offline storage after successful sync
          await removeOfflineSale(offlineSale.id);
          successCount++;
          console.log('[Offline] Sale synced successfully:', offlineSale.id);
        } else {
          failedCount++;
          console.error('[Offline] Sale sync failed - no result:', offlineSale.id);
        }
      } catch (error) {
        failedCount++;
        console.error('[Offline] Sale sync failed:', offlineSale.id, error);
        
        // Increment sync attempts
        offlineSale.syncAttempts = (offlineSale.syncAttempts || 0) + 1;
        
        // If too many attempts, mark as failed permanently
        if (offlineSale.syncAttempts >= 3) {
          console.error('[Offline] Sale permanently failed after 3 attempts:', offlineSale.id);
        }
      }
    }

    const result = { success: successCount, failed: failedCount, total: offlineSales.length };
    console.log('[Offline] Sync complete:', result);
    return result;
  } catch (error) {
    console.error('[Offline] Failed to sync offline sales:', error);
    return { success: 0, failed: 0, total: 0 };
  }
}

// Get pending sync count
export async function getPendingSyncCount(): Promise<number> {
  try {
    const offlineSales = await getOfflineSales();
    return offlineSales.length;
  } catch (error) {
    console.error('[Offline] Failed to get pending sync count:', error);
    return 0;
  }
}

// Get offline sales summary
export async function getOfflineSalesSummary(): Promise<{
  count: number;
  totalAmount: number;
  totalProfit: number;
  oldestSale: Date | null;
}> {
  try {
    const offlineSales = await getOfflineSales();
    
    if (offlineSales.length === 0) {
      return { count: 0, totalAmount: 0, totalProfit: 0, oldestSale: null };
    }

    const totalAmount = offlineSales.reduce((sum, sale) => sum + sale.data.total_amount, 0);
    const totalProfit = offlineSales.reduce((sum, sale) => sum + sale.data.estimated_profit, 0);
    const oldestSale = new Date(Math.min(...offlineSales.map(sale => sale.timestamp)));

    return {
      count: offlineSales.length,
      totalAmount,
      totalProfit,
      oldestSale,
    };
  } catch (error) {
    console.error('[Offline] Failed to get sales summary:', error);
    return { count: 0, totalAmount: 0, totalProfit: 0, oldestSale: null };
  }
}

// Check if a sale can be created offline
export function canCreateOfflineSale(): boolean {
  // For now, always allow offline sales
  // In the future, we could add checks for:
  // - Available storage space
  // - Maximum offline sales limit
  // - Data freshness requirements
  return true;
}

// Validate offline sale data
export function validateOfflineSale(saleData: any, cartItems: any[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!saleData || typeof saleData.total_amount !== 'number' || saleData.total_amount <= 0) {
    errors.push('Invalid total amount');
  }

  if (!saleData || typeof saleData.estimated_profit !== 'number') {
    errors.push('Invalid estimated profit');
  }

  if (!cartItems || cartItems.length === 0) {
    errors.push('No items in cart');
  }

  // Validate each cart item
  cartItems.forEach((item, index) => {
    if (!item.productVariation || !item.productVariation.id) {
      errors.push(`Item ${index + 1}: Invalid product variation`);
    }
    if (typeof item.quantity !== 'number' || item.quantity <= 0) {
      errors.push(`Item ${index + 1}: Invalid quantity`);
    }
    if (typeof item.sellingPrice !== 'number' || item.sellingPrice <= 0) {
      errors.push(`Item ${index + 1}: Invalid selling price`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
} 