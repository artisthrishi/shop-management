import { storeOfflineProducts, getOfflineProducts, isDataStale } from './offlineStorage';
import { searchProducts, getUnits, getShopSettingsWithDefaults } from './database';

export interface OfflineDataStatus {
  products: {
    cached: boolean;
    lastUpdated: number;
    count: number;
  };
  units: {
    cached: boolean;
    lastUpdated: number;
    count: number;
  };
  shopSettings: {
    cached: boolean;
    lastUpdated: number;
  };
}

// Cache essential data for offline use
export async function cacheEssentialData(): Promise<void> {
  try {
    console.log('[Offline] Caching essential data...');
    
    // Cache products
    const products = await searchProducts('');
    if (products && products.length > 0) {
      await storeOfflineProducts(products);
      console.log('[Offline] Products cached:', products.length);
    }
    
    // Cache units
    const units = await getUnits();
    if (units && units.length > 0) {
      localStorage.setItem('offline_units', JSON.stringify({
        data: units,
        lastUpdated: Date.now()
      }));
      console.log('[Offline] Units cached:', units.length);
    }
    
    // Cache shop settings
    const shopSettings = await getShopSettingsWithDefaults();
    if (shopSettings) {
      localStorage.setItem('offline_shop_settings', JSON.stringify({
        data: shopSettings,
        lastUpdated: Date.now()
      }));
      console.log('[Offline] Shop settings cached');
    }
    
    console.log('[Offline] Essential data caching complete');
  } catch (error) {
    console.error('[Offline] Failed to cache essential data:', error);
  }
}

// Get cached products for offline search
export async function getCachedProducts(): Promise<any[]> {
  try {
    const products = await getOfflineProducts();
    if (products && products.length > 0) {
      console.log('[Offline] Using cached products:', products.length);
      return products;
    }
    return [];
  } catch (error) {
    console.error('[Offline] Failed to get cached products:', error);
    return [];
  }
}

// Get cached units
export function getCachedUnits(): any[] {
  try {
    const unitsData = localStorage.getItem('offline_units');
    if (unitsData) {
      const { data, lastUpdated } = JSON.parse(unitsData);
      if (!isDataStale(lastUpdated)) {
        console.log('[Offline] Using cached units:', data.length);
        return data;
      }
    }
    return [];
  } catch (error) {
    console.error('[Offline] Failed to get cached units:', error);
    return [];
  }
}

// Get cached shop settings
export function getCachedShopSettings(): any {
  try {
    const settingsData = localStorage.getItem('offline_shop_settings');
    if (settingsData) {
      const { data, lastUpdated } = JSON.parse(settingsData);
      if (!isDataStale(lastUpdated)) {
        console.log('[Offline] Using cached shop settings');
        return data;
      }
    }
    return null;
  } catch (error) {
    console.error('[Offline] Failed to get cached shop settings:', error);
    return null;
  }
}

// Check if we have fresh cached data
export function hasFreshCachedData(): boolean {
  try {
    const productsData = localStorage.getItem('offline_products');
    const unitsData = localStorage.getItem('offline_units');
    const settingsData = localStorage.getItem('offline_shop_settings');
    
    if (!productsData || !unitsData || !settingsData) {
      return false;
    }
    
    const products = JSON.parse(productsData);
    const units = JSON.parse(unitsData);
    const settings = JSON.parse(settingsData);
    
    return !isDataStale(products.lastUpdated) && 
           !isDataStale(units.lastUpdated) && 
           !isDataStale(settings.lastUpdated);
  } catch (error) {
    console.error('[Offline] Failed to check cached data freshness:', error);
    return false;
  }
}

// Get offline data status
export function getOfflineDataStatus(): OfflineDataStatus {
  try {
    const productsData = localStorage.getItem('offline_products');
    const unitsData = localStorage.getItem('offline_units');
    const settingsData = localStorage.getItem('offline_shop_settings');
    
    return {
      products: {
        cached: !!productsData,
        lastUpdated: productsData ? JSON.parse(productsData).lastUpdated : 0,
        count: productsData ? JSON.parse(productsData).length : 0,
      },
      units: {
        cached: !!unitsData,
        lastUpdated: unitsData ? JSON.parse(unitsData).lastUpdated : 0,
        count: unitsData ? (JSON.parse(unitsData).data?.length || 0) : 0,
      },
      shopSettings: {
        cached: !!settingsData,
        lastUpdated: settingsData ? JSON.parse(settingsData).lastUpdated : 0,
      },
    };
  } catch (error) {
    console.error('[Offline] Failed to get data status:', error);
    return {
      products: { cached: false, lastUpdated: 0, count: 0 },
      units: { cached: false, lastUpdated: 0, count: 0 },
      shopSettings: { cached: false, lastUpdated: 0 },
    };
  }
}

// Clear all cached data
export function clearCachedData(): void {
  try {
    localStorage.removeItem('offline_products');
    localStorage.removeItem('offline_units');
    localStorage.removeItem('offline_shop_settings');
    console.log('[Offline] All cached data cleared');
  } catch (error) {
    console.error('[Offline] Failed to clear cached data:', error);
  }
} 