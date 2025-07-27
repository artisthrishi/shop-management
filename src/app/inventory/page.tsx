'use client';

import { useTranslation } from 'react-i18next';
import { useState, useContext, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PlusIcon, MagnifyingGlassIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import Fuse from 'fuse.js';
import ProductForm from '@/components/ProductForm';
import { ModalContext } from '@/components/ClientProviders';
import { getAllProductsWithVariations, updateProductVariationStock } from '@/lib/database';
import toast from 'react-hot-toast';
import type { Product, ProductVariation, ProductFormData } from '@/types';

type EnrichedVariation = ProductVariation & {
  productName: string;
  productBrand: string;
  productCategory: string;
};

export default function InventoryPage() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showProductForm, setShowProductForm] = useState(false);
  const { setModalOpen } = useContext(ModalContext);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stockModal, setStockModal] = useState<{ open: boolean; variation: ProductVariation | null }>({ open: false, variation: null });
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
        product_variations: (p.product_variations || []).map((v: ProductVariation) => ({
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

  // Fuzzy search configuration
  const fuseOptions = {
    keys: [
      { name: 'name', weight: 1 },
      { name: 'product_variations.name', weight: 0.8 }
    ],
    threshold: 0.3, // 0.0 = exact, 1.0 = very fuzzy
    includeScore: true,
    minMatchCharLength: 2,
    shouldSort: true
  };

  // Unified filter and sort logic
  const filteredAndSortedProducts = useMemo(() => {
    let filteredProducts = products;

    // Apply fuzzy search if query exists
    if (searchQuery.trim()) {
      const fuse = new Fuse(products, fuseOptions);
      const searchResults = fuse.search(searchQuery.trim());
      filteredProducts = searchResults.map(result => result.item);
    }

    // Apply stock filter
    if (stockFilter !== 'all') {
      filteredProducts = filteredProducts.filter((product) => {
        const hasMatchingVariation = (product.product_variations || []).some((v) => {
          switch (stockFilter) {
            case 'low': return v.current_stock <= v.min_stock;
            case 'out': return v.current_stock === 0;
            case 'in': return v.current_stock > 0;
            default: return true;
          }
        });
        return hasMatchingVariation;
      });
    }

    // Then, sort products and their variations
    return filteredProducts
      .map((product) => {
        // Sort variations within each product
        const originalVariations = [...(product.product_variations || [])];
        const sortedVariations = originalVariations.sort((a: ProductVariation, b: ProductVariation) => {
          if (stockSort === 'low-high') return a.current_stock - b.current_stock;
          if (stockSort === 'high-low') return b.current_stock - a.current_stock;
          if (priceSort === 'low-high') return a.selling_price - b.selling_price;
          if (priceSort === 'high-low') return b.selling_price - a.selling_price;
          return 0;
        });

        return {
          ...product,
          product_variations: sortedVariations,
        };
      })
      .sort((a: Product, b: Product) => {
        // Sort products based on their representative variation (first variation after internal sorting)
        if ((a.product_variations || []).length === 0 || (b.product_variations || []).length === 0) return 0;
        
        const aRep = a.product_variations![0];
        const bRep = b.product_variations![0];
        
        let comparison = 0;
        if (stockSort === 'low-high') {
          comparison = aRep.current_stock - bRep.current_stock;
        }
        if (stockSort === 'high-low') {
          comparison = bRep.current_stock - aRep.current_stock;
        }
        if (priceSort === 'low-high') {
          comparison = aRep.selling_price - bRep.selling_price;
        }
        if (priceSort === 'high-low') {
          comparison = bRep.selling_price - aRep.selling_price;
        }
        
        return comparison;
      });
  }, [products, searchQuery, stockFilter, stockSort, priceSort]);

  // Helper type guard
  function isGroupedProduct(obj: unknown): obj is { id: number; name: string; brand: string; category: string; location: string; variations: EnrichedVariation[] } {
    return typeof obj === 'object' && obj !== null && Array.isArray((obj as { variations?: unknown }).variations);
  }



  const handleSaveProduct = (product: { name: string; brand: string; category: string; created_by: string | null }) => {
    setShowProductForm(false);
    setSelectedProduct(null);
    loadProducts();
  };

  const handleEditProduct = (product: Product | { id: number; name: string; brand: string; category: string; location: string; variations: EnrichedVariation[] }) => {
    if (isGroupedProduct(product)) {
      if (product.variations.length > 0) {
        router.push(`/inventory/${product.variations[0].product_id}`);
      }
    } else {
      router.push(`/inventory/${product.id}`);
    }
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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error updating stock');
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

  // Helper to map Product to Partial<ProductFormData>
  function mapProductToFormData(product: Product | null): Partial<ProductFormData> | undefined {
    if (!product) return undefined;
    return {
      name: product.name,
      brand: product.brand,
      category: product.category,
      variations: (product.product_variations || []).map(v => ({
        name: v.name,
        unit_id: v.unit_id,
        purchase_price: v.purchase_price,
        selling_price: v.selling_price,
        opening_stock: v.opening_stock,
        min_stock: v.min_stock,
        location: v.location,
      })),
      id: product.id,
    };
  }

  return (
    <div className="p-4 space-y-4 bg-gray-200 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-2xl font-bold text-gray-900">{t('inventory.title', 'Inventory')}</h1>
        <button
          onClick={() => setShowProductForm(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          {t('inventory.addProduct', 'Add Product')}
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder={t('inventory.search', 'Search products...')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-gray-600 whitespace-nowrap">Filter:</span>

        {/* Stock Filter Dropdown */}
        <select
          value={stockFilter}
          onChange={(e) => setStockFilter(e.target.value)}
          className="w-16 sm:w-20 px-2 py-1 text-xs sm:text-sm text-gray-700 border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">{t('inventory.stock', 'Stock')}</option>
          <option value="low">{t('inventory.lowStock', 'Low')}</option>
          <option value="out">{t('inventory.outOfStock', 'Out')}</option>
          <option value="in">{t('inventory.inStock', 'In')}</option>
        </select>

        {/* Stock Sort Dropdown */}
        <select
          value={stockSort}
          onChange={(e) => {
            setStockSort(e.target.value);
            if (e.target.value !== 'none') {
              setPriceSort('none');
            }
          }}
          className="w-16 sm:w-20 px-2 py-1 text-xs sm:text-sm text-gray-700 border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="none">{t('inventory.sort', 'Sort')}</option>
          <option value="low-high">{t('inventory.lowToHigh', 'Low→High')}</option>
          <option value="high-low">{t('inventory.highToLow', 'High→Low')}</option>
        </select>

        {/* Price Sort Dropdown */}
        <select
          value={priceSort}
          onChange={(e) => {
            setPriceSort(e.target.value);
            if (e.target.value !== 'none') {
              setStockSort('none');
            }
          }}
          className="w-16 sm:w-20 px-2 py-1 text-xs sm:text-sm text-gray-700 border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
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

      {/* Sticky Table Headers */}
      {!loading && !error && filteredAndSortedProducts.length > 0 && (
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
          <div className="grid grid-cols-12 gap-1 px-2 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide text-xs">
            <div className="col-span-4 text-xs"></div>
            <div className="col-span-2 text-center text-xs">Stock</div>
            <div className="col-span-2 text-center text-xs">Min</div>
            <div className="col-span-2 text-center text-xs">Price</div>
            <div className="col-span-2 text-center text-xs">Action</div>
          </div>
        </div>
      )}

      {/* Products List */}
      {!loading && !error && (
        <div className="space-y-2">
          {filteredAndSortedProducts.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-lg shadow-2xl cursor-pointer hover:shadow-2xl transition-shadow"
              onClick={() => handleEditProduct(product)}
            >
              {/* Product Header */}
              <div className="p-2 border-b border-gray-200 bg-gray-100">
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
                  {product.brand && (
                    <span className="text-sm text-gray-500">{product.brand}</span>
                  )}
                </div>
              </div>

              {/* Variations Table */}
              <div className="overflow-hidden">
                {isGroupedProduct(product)
                  ? product.variations.map((variation: EnrichedVariation, index: number) => {
                      const v = variation;
                      const isLowStock = v.current_stock <= v.min_stock;
                      const isOutOfStock = v.current_stock === 0;
                      
                      return (
                        <div
                          key={v.id}
                          className={`grid grid-cols-12 gap-1 px-2 py-2 items-center ${
                            index !== (product.variations?.length || 0) - 1 ? 'border-b border-gray-100' : ''
                          } hover:bg-gray-50`}
                        >
                          {/* Variation Name */}
                          <div className="col-span-4">
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-900">{v.name}</span>
                              {(isLowStock || isOutOfStock) && (
                                <span className={`inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-medium rounded-full mt-1 whitespace-nowrap ${
                                  isOutOfStock 
                                    ? 'bg-red-100 text-red-800' 
                                    : 'bg-orange-100 text-orange-800'
                                }`}>
                                  {isOutOfStock 
                                    ? t('inventory.outOfStock', 'OUT OF STOCK') 
                                    : t('inventory.lowStock', 'LOW STOCK')
                                  }
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Stock */}
                          <div className="col-span-2 text-center">
                            <span className={`text-sm font-medium ${
                              isLowStock ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {v.current_stock} {v.unit || ''}
                            </span>
                          </div>

                          {/* Min Stock */}
                          <div className="col-span-2 text-center">
                            <span className="text-sm text-gray-600">
                              {v.min_stock} {v.unit || ''}
                            </span>
                          </div>

                          {/* Price */}
                          <div className="col-span-2 text-center">
                            <span className="text-sm font-medium text-gray-900">
                              ₹{v.selling_price}
                            </span>
                          </div>

                          {/* Update Button */}
                          <div className="col-span-2 text-center">
                            <button
                              className="flex items-center justify-center gap-1 w-auto h-8 px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                              onClick={(e) => {
                                e.stopPropagation();
                                openStockModal(v);
                              }}
                              title={t('inventory.updateStock', 'Update Stock')}
                              aria-label={`Update stock for ${v.name}`}
                            >
                              <ArrowPathIcon className="w-3 h-3" />
                              <span>{t('inventory.stock', 'Stock')}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  : (product.product_variations || []).map((variation: ProductVariation, index: number) => {
                      const v = variation;
                      const isLowStock = v.current_stock <= v.min_stock;
                      const isOutOfStock = v.current_stock === 0;
                      
                      return (
                        <div
                          key={v.id}
                          className={`grid grid-cols-12 gap-1 px-2 py-2 items-center ${
                            index !== (product.product_variations?.length || 0) - 1 ? 'border-b border-gray-100' : ''
                          } hover:bg-gray-50`}
                        >
                          {/* Variation Name */}
                          <div className="col-span-4">
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-900">{v.name}</span>
                              {(isLowStock || isOutOfStock) && (
                                <span className={`inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-medium rounded-full mt-1 whitespace-nowrap ${
                                  isOutOfStock 
                                    ? 'bg-red-100 text-red-800' 
                                    : 'bg-orange-100 text-orange-800'
                                }`}>
                                  {isOutOfStock 
                                    ? t('inventory.outOfStock', 'OUT OF STOCK') 
                                    : t('inventory.lowStock', 'LOW STOCK')
                                  }
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Stock */}
                          <div className="col-span-2 text-center">
                            <span className={`text-sm font-medium ${
                              isLowStock ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {v.current_stock} {v.unit || ''}
                            </span>
                          </div>

                          {/* Min Stock */}
                          <div className="col-span-2 text-center">
                            <span className="text-sm text-gray-600">
                              {v.min_stock} {v.unit || ''}
                            </span>
                          </div>

                          {/* Price */}
                          <div className="col-span-2 text-center">
                            <span className="text-sm font-medium text-gray-900">
                              ₹{v.selling_price}
                            </span>
                          </div>

                          {/* Update Button */}
                          <div className="col-span-2 text-center">
                            <button
                              className="flex items-center justify-center gap-1 w-auto h-8 px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                              onClick={(e) => {
                                e.stopPropagation();
                                openStockModal(v);
                              }}
                              title={t('inventory.updateStock', 'Update Stock')}
                              aria-label={`Update stock for ${v.name}`}
                            >
                              <ArrowPathIcon className="w-3 h-3" />
                              <span>{t('inventory.stock', 'Stock')}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                }
              </div>
            </div>
          ))}
          {filteredAndSortedProducts.length === 0 && (
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
          initialData={mapProductToFormData(selectedProduct)}
        />
      )}
    </div>
  );
} 