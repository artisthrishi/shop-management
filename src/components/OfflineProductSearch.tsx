'use client';

import { useState, useEffect } from 'react';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';
import { getCachedProducts } from '@/lib/offlineDataManager';
import { searchProducts } from '@/lib/database';
import type { ProductVariation } from '@/types';
import Fuse from 'fuse.js';

interface OfflineProductSearchProps {
  searchTerm: string;
  onResultsChange: (results: ProductVariation[]) => void;
  onLoadingChange: (loading: boolean) => void;
}

export default function OfflineProductSearch({
  searchTerm,
  onResultsChange,
  onLoadingChange,
}: OfflineProductSearchProps) {
  const { isOnline } = useConnectionStatus();
  const [cachedProducts, setCachedProducts] = useState<ProductVariation[]>([]);
  const [fuse, setFuse] = useState<Fuse<ProductVariation> | null>(null);

  // Initialize cached products and Fuse.js
  useEffect(() => {
    const initializeCachedSearch = async () => {
      try {
        const products = await getCachedProducts();
        setCachedProducts(products);
        
        if (products.length > 0) {
          const fuseOptions = {
            keys: [
              'name',
              'product.name',
              'product.brand',
              'product.category',
            ],
            threshold: 0.3,
            includeScore: true,
          };
          
          const fuseInstance = new Fuse(products, fuseOptions);
          setFuse(fuseInstance);
          console.log('[Offline] Fuse.js initialized with', products.length, 'products');
        }
      } catch (error) {
        console.error('[Offline] Failed to initialize cached search:', error);
      }
    };

    initializeCachedSearch();
  }, []);

  // Search products (online or offline)
  useEffect(() => {
    const performSearch = async () => {
      if (!searchTerm.trim()) {
        onResultsChange([]);
        return;
      }

      onLoadingChange(true);

      try {
        if (isOnline) {
          // Online search - use database
          console.log('[Search] Online search for:', searchTerm);
          const results = await searchProducts(searchTerm);
          onResultsChange(results || []);
        } else {
          // Offline search - use cached data with Fuse.js
          console.log('[Search] Offline search for:', searchTerm);
          if (fuse && cachedProducts.length > 0) {
            const searchResults = fuse.search(searchTerm);
            const results = searchResults
              .slice(0, 20) // Limit results
              .map(result => result.item);
            onResultsChange(results);
          } else {
            onResultsChange([]);
          }
        }
      } catch (error) {
        console.error('[Search] Search failed:', error);
        onResultsChange([]);
      } finally {
        onLoadingChange(false);
      }
    };

    performSearch();
  }, [searchTerm, isOnline, fuse, cachedProducts, onResultsChange, onLoadingChange]);

  return null; // This is a utility component, no UI
} 