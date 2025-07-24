'use client';

import { useTranslation } from 'react-i18next';
import { useState, useContext, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PlusIcon, MagnifyingGlassIcon, FunnelIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import ProductForm from '@/components/ProductForm';
import { ModalContext } from '@/components/ClientProviders';
import { getAllProductsWithVariations, updateProductVariationStock } from '@/lib/database';
import toast from 'react-hot-toast';
import type { Product, ProductVariation } from '@/types';

export default function InventoryPage() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showProductForm, setShowProductForm] = useState(false);
  const { setModalOpen } = useContext(ModalContext);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stockModal, setStockModal] = useState({ open: false, variation: null });
  const [newStock, setNewStock] = useState('');
  const [stockUpdateLoading, setStockUpdateLoading] = useState(false);
  
  // Filter states
  const [stockFilter, setStockFilter] = useState('all');
  const [priceSort, setPriceSort] = useState('none');
  const [stockSort, setStockSort] = useState('none');
  
  const router = useRouter();

  useEffect(() => {
    setModalOpen(showProductForm);
    return () => setModalOpen(false);
  }, [showProductForm, setModalOpen]);

  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllProductsWithVariations();
      const processedData = data.map((p) => ({
        ...p,
        product_variations: (p.product_variations || []).map((v) => ({
          ...v,
          current_stock: v.current_stock || 0,
          min_stock: v.min_stock || 0,
          selling_price: v.selling_price || 0,
        })),
      }));
      setProducts(processedData);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Error loading products';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return stockFilter !== 'all' || stockSort !== 'none' || priceSort !== 'none' || searchQuery.trim() !== '';
  }, [stockFilter, stockSort, priceSort, searchQuery]);

  // Create variation-level data when filters are active
  const createVariationLevelData = useCallback(() => {
    const allVariations = products.flatMap((product: Product) => 
      (product.product_variations || []).map((v: ProductVariation) => ({
        ...v,
        productId: product.id,
        productName: product.name || '',
        productBrand: product.brand || '',
        productCategory: product.category || '',
        productLocation: product.location || '',
      }))
    );

    return allVariations
      .filter(v => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return true;
        
        const productMatch = v.productName.toLowerCase().includes(query);
        const variationMatch = v.name.toLowerCase().includes(query);
        if (!productMatch && !variationMatch) return false;

        // Apply stock level filter
        switch (stockFilter) {
          case 'low': return v.current_stock <= v.min_stock;
          case 'out': return v.current_stock === 0;
          case 'in': return v.current_stock > 0;
          default: return true;
        }
      })
      .sort((a, b) => {
        // Apply stock sort
        if (stockSort === 'low-high') return a.current_stock - b.current_stock;
        if (stockSort === 'high-low') return b.current_stock - a.current_stock;
        
        // Apply price sort
        if (priceSort === 'low-high') return a.selling_price - b.selling_price;
        if (priceSort === 'high-low') return b.selling_price - a.selling_price;
        
        return 0;
      });
  }, [products, searchQuery, stockFilter, stockSort, priceSort]);

  // Group variations by product for display
  const groupVariationsByProduct = useCallback((variations: any[]) => {
    const grouped: { [key: number]: any } = {};
    variations.forEach((v: any) => {
      if (!grouped[v.productId]) {
        grouped[v.productId] = {
          id: v.productId,
          name: v.productName,
          brand: v.productBrand,
          category: v.productCategory,
          location: v.productLocation,
          variations: []
        };
      }
      grouped[v.productId].variations.push(v);
    });
    return Object.values(grouped);
  }, []);

  // Original filtering logic for when no filters are active
  const filteredProducts = useMemo(() => {
    return products
      .filter((product: Product) => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return true;
        
        const productMatch = product.name.toLowerCase().includes(query);
        const variationMatch = (product.product_variations || []).some((v: ProductVariation) => v.name.toLowerCase().includes(query));
        const textMatch = productMatch || variationMatch;
        
        if (!textMatch) return false;
        
        // Apply stock level filter
        switch (stockFilter) {
          case 'low':
            return (product.product_variations || []).some((v: ProductVariation) => v.current_stock <= v.min_stock);
          case 'out':
            return (product.product_variations || []).some((v: ProductVariation) => v.current_stock === 0);
          case 'in':
            return (product.product_variations || []).some((v: ProductVariation) => v.current_stock > 0);
          default:
            return true;
        }
      })
      .map((product: Product) => ({
        ...product,
        product_variations: [...(product.product_variations || [])].sort((a: ProductVariation, b: ProductVariation) => {
          // Apply stock sort
          if (stockSort === 'low-high') return a.current_stock - b.current_stock;
          if (stockSort === 'high-low') return b.current_stock - a.current_stock;
          
          // Apply price sort
          if (priceSort === 'low-high') return a.selling_price - b.selling_price;
          if (priceSort === 'high-low') return b.selling_price - a.selling_price;
          
          return 0;
        })
      }))
      .sort((a: Product, b: Product) => {
        // Sort products by their best matching variation's values
        if (((a.product_variations || []).length) === 0 || ((b.product_variations || []).length) === 0) return 0;
        
        // Apply stock sort - use the variation with lowest/highest stock
        if (stockSort === 'low-high') {
          const aMinStock = Math.min(...(a.product_variations || []).map((v: ProductVariation) => v.current_stock));
          const bMinStock = Math.min(...(b.product_variations || []).map((v: ProductVariation) => v.current_stock));
          return aMinStock - bMinStock;
        }
        if (stockSort === 'high-low') {
          const aMaxStock = Math.max(...(a.product_variations || []).map((v: ProductVariation) => v.current_stock));
          const bMaxStock = Math.max(...(b.product_variations || []).map((v: ProductVariation) => v.current_stock));
          return bMaxStock - aMaxStock;
        }
        
        // Apply price sort - use the variation with highest/lowest price
        if (priceSort === 'low-high') {
          const aMinPrice = Math.min(...(a.product_variations || []).map((v: ProductVariation) => v.selling_price));
          const bMinPrice = Math.min(...(b.product_variations || []).map((v: ProductVariation) => v.selling_price));
          return aMinPrice - bMinPrice;
        }
        if (priceSort === 'high-low') {
          const aMaxPrice = Math.max(...(a.product_variations || []).map((v: ProductVariation) => v.selling_price));
          const bMaxPrice = Math.max(...(b.product_variations || []).map((v: ProductVariation) => v.selling_price));
          return bMaxPrice - aMaxPrice;
        }
        
        return 0;
      });
  }, [products, searchQuery, stockFilter, stockSort, priceSort]);

  // Get display data based on filter state
  const displayData = useMemo(() => {
    return hasActiveFilters 
      ? groupVariationsByProduct(createVariationLevelData())
      : filteredProducts;
  }, [hasActiveFilters, groupVariationsByProduct, createVariationLevelData, filteredProducts]);

  const totalValue = displayData.reduce(
    (sum: number, product: Product) =>
      sum +
      (product.product_variations || []).reduce(
        (vSum: number, v: ProductVariation) => vSum + v.current_stock * v.selling_price,
        0
      ),
    0
  );

  const lowStockCount = displayData.reduce(
    (count: number, product: Product) =>
      count +
      (product.product_variations || []).filter((v: ProductVariation) => v.current_stock <= v.min_stock).length,
    0
  );

  const handleSaveProduct = (product: Product) => {
    setShowProductForm(false);
    setSelectedProduct(null);
    loadProducts();
  };

  const handleEditProduct = (product: Product) => {
    router.push(`/inventory/${product.id}`);
  };

  const handleCloseProductForm = () => {
    setShowProductForm(false);
    setSelectedProduct(null);
  };

  const openStockModal = (variation: ProductVariation) => {
    setStockModal({ open: true, variation });
    setNewStock(variation.current_stock.toString());
  };

  const closeStockModal = () => {
    setStockModal({ open: false, variation: null });
    setNewStock('');
  };

  const handleStockUpdate = async () => {
    if (!stockModal.variation || !newStock) return;
    
    setStockUpdateLoading(true);
    try {
      const newStockValue = parseFloat(newStock);
      if (isNaN(newStockValue) || newStockValue < 0) {
        throw new Error('Invalid stock value');
      }
      
      await updateProductVariationStock(stockModal.variation.id, newStockValue);
      await loadProducts();
      closeStockModal();
      toast.success('Stock updated successfully!');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setStockUpdateLoading(false);
    }
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSearchQuery('');
    setStockFilter('all');
    setStockSort('none');
    setPriceSort('none');
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-gray-900">{t('inventory.title')}</h1>
        <button
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          onClick={() => { setShowProductForm(true); setSelectedProduct(null); }}
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          {t('inventory.addProduct')}
        </button>
      </div>

      {/* Top Cards */}
      <div className="flex gap-4 mb-2">
        <div className="flex-1 bg-white rounded-lg shadow p-4 flex flex-col items-center">
          <span className="text-sm text-gray-500">{t('inventory.totalValue', 'Total Value')}</span>
          <span className="text-xl font-bold text-green-600">₹{totalValue.toLocaleString('en-IN')}</span>
        </div>
        <div className="flex-1 bg-white rounded-lg shadow p-4 flex flex-col items-center">
          <span className="text-sm text-gray-500">{t('inventory.lowStockAlert', 'Low Stock')}</span>
          <span className="text-xl font-bold text-red-600">{lowStockCount}</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder={t('inventory.searchPlaceholder', 'Search products...')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 -mt-2">
        <span className="text-sm font-medium text-gray-700">{t('inventory.filter', 'Filter')}:</span>
        
        {/* Debug Info - Remove this later */}
        <span className="text-xs text-gray-500 ml-2">
          (Stock: {stockFilter}, Sort: {stockSort}, Price: {priceSort})
        </span>
        
        {/* Stock Filter & Sort Dropdown */}
        <select
          value={`${stockFilter}-${stockSort}`}
          onChange={(e) => {
            const [filter, sort] = e.target.value.split('-');
            setStockFilter(filter);
            setStockSort(sort);
          }}
          className="px-2 py-1 text-sm text-gray-700 border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-0"
        >
          <option value="all-none">{t('inventory.stock', 'Stock')}</option>
          <option value="low-none">{t('inventory.low', 'Low')}</option>
          <option value="out-none">{t('inventory.outOfStock', 'Out')}</option>
          <option value="in-none">{t('inventory.inStock', 'In')}</option>
          <option value="all-low-high">{t('inventory.lowToHigh', 'Low→High')}</option>
          <option value="all-high-low">{t('inventory.highToLow', 'High→Low')}</option>
        </select>

        {/* Price Sort Dropdown */}
        <select
          value={priceSort}
          onChange={(e) => setPriceSort(e.target.value)}
          className="px-2 py-1 text-sm text-gray-700 border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-0"
        >
          <option value="none">{t('inventory.price', 'Price')}</option>
          <option value="low-high">{t('inventory.lowToHigh', 'Low→High')}</option>
          <option value="high-low">{t('inventory.highToLow', 'High→Low')}</option>
        </select>

        {/* Clear Filters Button */}
        {(searchQuery || stockFilter !== 'all' || stockSort !== 'none' || priceSort !== 'none') && (
          <button
            onClick={clearAllFilters}
            className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
            title={t('inventory.clearAllFilters', 'Clear all filters')}
          >
            {t('inventory.clear', 'Clear')}
          </button>
        )}
      </div>

      {/* Loading/Error States */}
      {loading && <div className="text-center text-gray-500 py-8">{t('common.loading', 'Loading...')}</div>}
      {error && <div className="text-center text-red-500 py-4">{error}</div>}

      {/* Products List */}
      {!loading && !error && (
        <div className="grid grid-cols-1 gap-4">
          {displayData.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-lg shadow cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleEditProduct(product)}
            >
              <div className="p-3 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
                {product.brand && (
                  <p className="text-sm text-gray-500">Brand: {product.brand}</p>
                )}
              </div>
              <div className="p-3">
                {(product.product_variations || []).map((variation, index) => {
                  const v = variation as ProductVariation;
                  return (
                    <div
                      key={v.id}
                      className={`flex items-center justify-between py-2 ${
                        index !== (product.product_variations?.length || 0) - 1 ? 'border-b border-gray-100' : ''
                      }`}
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{v.name}</p>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className={`text-sm font-medium ${
                            v.current_stock <= v.min_stock ? 'text-red-600' : 'text-green-600'
                          }`}>
                            Stock: {v.current_stock} {v.unit || ''}
                          </span>
                          <span className="text-sm text-gray-500">
                            Min: {v.min_stock} {v.unit || ''}
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            ₹{v.selling_price}
                          </span>
                        </div>
                        {v.current_stock <= v.min_stock && (
                          <span className="inline-block mt-1 px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                            {v.current_stock === 0 
                              ? t('inventory.outOfStock', 'OUT OF STOCK') 
                              : t('inventory.lowStock', 'LOW STOCK')
                            }
                          </span>
                        )}
                      </div>
                      <button
                        className="flex flex-col items-center justify-center w-14 h-14 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={(e) => {
                          e.stopPropagation();
                          openStockModal(v);
                        }}
                        title={t('inventory.updateStock', 'Update Stock')}
                        aria-label={`Update stock for ${v.name}`}
                      >
                        <ArrowPathIcon className="w-4 h-4 mb-1" />
                        <span className="leading-tight text-xs">
                          {t('inventory.update', 'Update')}<br />{t('inventory.stock', 'Stock')}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {displayData.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              {t('inventory.noProducts', 'No products found')}
            </div>
          )}
        </div>
      )}

      {/* Update Stock Modal */}
      {stockModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {t('inventory.updateStock', 'Update Stock')}
            </h3>
            <div className="mb-4">
              <p className="text-gray-700 mb-2">{stockModal.variation?.name}</p>
              <p className="text-sm text-gray-500 mb-4">
                {t('inventory.currentStock', 'Current Stock')}: {stockModal.variation?.current_stock} {stockModal.variation?.unit || ''}
              </p>
              <input
                type="number"
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newStock}
                onChange={(e) => setNewStock(e.target.value)}
                min="0"
                step="0.01"
                placeholder={t('inventory.enterNewStock', 'Enter new stock value')}
              />
            </div>
            <div className="flex space-x-3">
              <button
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                onClick={handleStockUpdate}
                disabled={stockUpdateLoading}
              >
                {stockUpdateLoading ? t('common.updating', 'Updating...') : t('common.update', 'Update')}
              </button>
              <button
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                onClick={closeStockModal}
              >
                {t('common.cancel', 'Cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ProductForm Modal */}
      {showProductForm && (
        <ProductForm
          onClose={handleCloseProductForm}
          onSave={handleSaveProduct}
          initialData={selectedProduct}
        />
      )}
    </div>
  );
} 