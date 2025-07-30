// Offline storage utilities for PWA functionality

export interface OfflineSale {
  id: string;
  timestamp: number;
  data: any;
  synced: boolean;
  syncAttempts?: number;
}

export interface OfflineProduct {
  id: string;
  data: any;
  lastUpdated: number;
}

// Store offline sales
export async function storeOfflineSale(saleData: any): Promise<string> {
  const saleId = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const offlineSale: OfflineSale = {
    id: saleId,
    timestamp: Date.now(),
    data: saleData,
    synced: false,
    syncAttempts: 0,
  };

  try {
    const existingSales = await getOfflineSales();
    existingSales.push(offlineSale);
    localStorage.setItem('offline_sales', JSON.stringify(existingSales));
    
    console.log('[Offline] Sale stored locally:', saleId);
    return saleId;
  } catch (error) {
    console.error('[Offline] Failed to store sale:', error);
    throw error;
  }
}

// Get all offline sales
export async function getOfflineSales(): Promise<OfflineSale[]> {
  try {
    const sales = localStorage.getItem('offline_sales');
    return sales ? JSON.parse(sales) : [];
  } catch (error) {
    console.error('[Offline] Failed to get offline sales:', error);
    return [];
  }
}

// Remove offline sale after successful sync
export async function removeOfflineSale(saleId: string): Promise<void> {
  try {
    const sales = await getOfflineSales();
    const filteredSales = sales.filter(sale => sale.id !== saleId);
    localStorage.setItem('offline_sales', JSON.stringify(filteredSales));
    
    console.log('[Offline] Sale removed after sync:', saleId);
  } catch (error) {
    console.error('[Offline] Failed to remove offline sale:', error);
  }
}

// Store products for offline access
export async function storeOfflineProducts(products: any[]): Promise<void> {
  try {
    const offlineProducts: OfflineProduct[] = products.map(product => ({
      id: product.id,
      data: product,
      lastUpdated: Date.now(),
    }));

    localStorage.setItem('offline_products', JSON.stringify(offlineProducts));
    console.log('[Offline] Products stored locally:', products.length);
  } catch (error) {
    console.error('[Offline] Failed to store products:', error);
  }
}

// Get offline products
export async function getOfflineProducts(): Promise<any[]> {
  try {
    const products = localStorage.getItem('offline_products');
    if (!products) return [];
    
    const offlineProducts: OfflineProduct[] = JSON.parse(products);
    return offlineProducts.map(p => p.data);
  } catch (error) {
    console.error('[Offline] Failed to get offline products:', error);
    return [];
  }
}

// Check if data is stale (older than 24 hours)
export function isDataStale(timestamp: number): boolean {
  const oneDay = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  return Date.now() - timestamp > oneDay;
}

// Clear all offline data
export async function clearOfflineData(): Promise<void> {
  try {
    localStorage.removeItem('offline_sales');
    localStorage.removeItem('offline_products');
    console.log('[Offline] All offline data cleared');
  } catch (error) {
    console.error('[Offline] Failed to clear offline data:', error);
  }
}

// Get offline storage statistics
export async function getOfflineStats(): Promise<{
  salesCount: number;
  productsCount: number;
  totalSize: number;
}> {
  try {
    const sales = await getOfflineSales();
    const products = await getOfflineProducts();
    
    const salesSize = JSON.stringify(sales).length;
    const productsSize = JSON.stringify(products).length;
    const totalSize = salesSize + productsSize;
    
    return {
      salesCount: sales.length,
      productsCount: products.length,
      totalSize,
    };
  } catch (error) {
    console.error('[Offline] Failed to get stats:', error);
    return { salesCount: 0, productsCount: 0, totalSize: 0 };
  }
} 