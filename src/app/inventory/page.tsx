'use client';

import { useTranslation } from 'react-i18next';
import { useState, useContext, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PlusIcon, MagnifyingGlassIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import Fuse from 'fuse.js';
import ProductForm from '@/components/ProductForm';
import { ModalContext } from '@/components/ClientProviders';
import { getAllProductsWithVariations, updateProductVariationStock, getUnits } from '@/lib/database';
import { parseFractionalInput } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { Product, ProductVariation, ProductFormData, Unit } from '@/types';

type EnrichedVariation = ProductVariation & {
  productName: string;
  productBrand: string;
  productCategory: string;
  units?: Unit;
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
  const [stockUpdateLoading, setStockUpdateLoading] = useState(false);
  const [stockValidationError, setStockValidationError] = useState<string | null>(null);
  const [stockInputTouched, setStockInputTouched] = useState(false);
  const [units, setUnits] = useState<Unit[]>([]);
  
  // Unit-specific stock input states
  const [mainStock, setMainStock] = useState('');
  const [subStock, setSubStock] = useState('');
  const [stockInput, setStockInput] = useState(''); // For simple units
  
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
    try {
      setLoading(true);
      const [productsData, unitsData] = await Promise.all([
        getAllProductsWithVariations(),
        getUnits(),
      ]);
      
      console.log('Products data:', productsData); // Debug log
      
      setProducts(productsData);
      setUnits(unitsData);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Ensure units are loaded
  useEffect(() => {
    if (units.length === 0) {
      getUnits().then(setUnits).catch(console.error);
    }
  }, [units.length]);

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

  // Filter and sort products
  const filteredAndSortedProducts = useMemo(() => {
    let filteredProducts = products;
    
    // Apply search filter
    if (searchQuery.trim()) {
      const fuse = new Fuse(products, fuseOptions);
      const searchResults = fuse.search(searchQuery.trim());
      filteredProducts = searchResults.map(result => result.item);
    }
    
    // Apply stock filter
    if (stockFilter !== 'all') {
      filteredProducts = filteredProducts.filter(product => {
        return product.product_variations?.some(variation => {
          const stock = variation.current_stock || 0;
          const minStock = variation.min_stock || 0;
          
          switch (stockFilter) {
            case 'lowStock':
              return stock <= minStock && stock > 0;
            case 'outOfStock':
              return stock === 0;
            case 'inStock':
              return stock > 0;
            default:
              return true;
          }
        });
      });
    }
    
    // Sort products based on their variations
    if (stockSort !== 'none' || priceSort !== 'none') {
      filteredProducts = filteredProducts.map(product => {
        // First, sort variations within each product
        const sortedVariations = [...(product.product_variations || [])].sort((a, b) => {
          if (stockSort !== 'none') {
            const stockA = a.current_stock || 0;
            const stockB = b.current_stock || 0;
            return stockSort === 'lowToHigh' ? stockA - stockB : stockB - stockA;
          } else if (priceSort !== 'none') {
            const priceA = a.selling_price || 0;
            const priceB = b.selling_price || 0;
            return priceSort === 'lowToHigh' ? priceA - priceB : priceB - priceA;
          }
          return 0;
        });
        
        return { ...product, product_variations: sortedVariations };
      });
      
      // Then, sort products based on their first (representative) variation
      filteredProducts.sort((a, b) => {
        const variationA = a.product_variations?.[0];
        const variationB = b.product_variations?.[0];
        
        if (!variationA || !variationB) return 0;
        
        if (stockSort !== 'none') {
          const stockA = variationA.current_stock || 0;
          const stockB = variationB.current_stock || 0;
          return stockSort === 'lowToHigh' ? stockA - stockB : stockB - stockA;
        } else if (priceSort !== 'none') {
          const priceA = variationA.selling_price || 0;
          const priceB = variationB.selling_price || 0;
          return priceSort === 'lowToHigh' ? priceA - priceB : priceB - priceA;
        }
        return 0;
      });
    }
    
    return filteredProducts;
  }, [products, searchQuery, stockFilter, stockSort, priceSort]);

  // Group products by their main product
  const groupedProducts = useMemo(() => {
    const groups: { [key: string]: EnrichedVariation[] } = {};
    
    filteredAndSortedProducts.forEach(product => {
      const productKey = `${product.id}-${product.name}`;
      
      if (!groups[productKey]) {
        groups[productKey] = [];
      }
      
      product.product_variations?.forEach(variation => {
        groups[productKey].push({
          ...variation,
          productName: product.name,
          productBrand: product.brand,
          productCategory: product.category,
        });
      });
    });
    
    return Object.entries(groups).map(([key, variations]) => {
      const [id, name] = key.split('-', 2);
      const firstVariation = variations[0];
      return {
        id: parseInt(id),
        name,
        brand: firstVariation.productBrand,
        category: firstVariation.productCategory,
        location: '', // We'll add this later if needed
        variations,
      };
    });
  }, [filteredAndSortedProducts]);

  // Type guard for grouped products
  function isGroupedProduct(obj: unknown): obj is { id: number; name: string; brand: string; category: string; location: string; variations: EnrichedVariation[] } {
    return obj !== null && typeof obj === 'object' && 'variations' in obj;
  }

  const handleSaveProduct = (product: { name: string; brand: string; category: string; created_by: string | null }) => {
    loadProducts();
    setShowProductForm(false);
    setSelectedProduct(null);
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
    
    // Initialize stock input with current stock value
    const unit = units.find(u => u.id === variation.unit_id);
    console.log('Opening stock modal:', { variation, units: units.length, unit });
    
    // Pre-fill with current stock value
    if (unit?.subunit_name && unit?.subunit_factor) {
      // For units with subunits, convert stored value to UI state
      const totalStock = variation.current_stock || 0;
      const mainStockValue = Math.floor(totalStock);
      const subStockValue = Math.round((totalStock - mainStockValue) * unit.subunit_factor);
      
      setMainStock(mainStockValue.toString());
      setSubStock(subStockValue.toString());
      setStockInput('');
    } else {
      // For simple units
      setStockInput((variation.current_stock || 0).toString());
      setMainStock('');
      setSubStock('');
    }
    
    setStockValidationError(null);
    setStockInputTouched(false);
  };

  const closeStockModal = () => {
    setStockModal({ open: false, variation: null });
    setStockInput('');
    setMainStock('');
    setSubStock('');
    setStockValidationError(null);
    setStockInputTouched(false);
  };

  const handleStockInputChange = (value: string) => {
    setStockInput(value);
    setStockInputTouched(true);
    
    // Validate input
    const unit = stockModal.variation ? units.find(u => u.id === stockModal.variation!.unit_id) : undefined;
    const error = validateStockInput(value, unit);
    setStockValidationError(error);
  };

  const handleMainStockChange = (value: string) => {
    setMainStock(value);
    setStockInputTouched(true);
    
    const unit = stockModal.variation ? units.find(u => u.id === stockModal.variation!.unit_id) : undefined;
    const error = validateStockInput('', unit);
    setStockValidationError(error);
  };

  const handleSubStockChange = (value: string) => {
    setSubStock(value);
    setStockInputTouched(true);
    
    const unit = stockModal.variation ? units.find(u => u.id === stockModal.variation!.unit_id) : undefined;
    const error = validateStockInput('', unit);
    setStockValidationError(error);
  };

  const handleStockUpdate = async () => {
    if (!stockModal.variation) return;
    
    const unit = units.find(u => u.id === stockModal.variation!.unit_id);
    let newStockValue = 0;
    
    // Calculate new stock value based on unit type
    if (unit?.subunit_name && unit?.subunit_factor) {
      // For units with subunits
      const validationError = validateStockInput('', unit);
      if (validationError) {
        setStockValidationError(validationError);
        return;
      }
      
      const stockInput = `${mainStock || 0} ${subStock || 0}`;
      newStockValue = parseFractionalInput(stockInput, unit.subunit_factor);
    } else {
      // For simple units
      const validationError = validateStockInput(stockInput, unit);
      if (validationError) {
        setStockValidationError(validationError);
        return;
      }
      
      newStockValue = parseFractionalInput(stockInput);
    }
    
    if (isNaN(newStockValue)) {
      setStockValidationError('Invalid stock value');
      return;
    }
    
    setStockUpdateLoading(true);
    try {
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

  // Stock validation function
  const validateStockInput = (value: string, unit?: Unit): string | null => {
    // For units with subunits (like kg+gm)
    if (unit?.subunit_name && unit?.subunit_factor) {
      const mainValue = parseFloat(mainStock);
      const subValue = parseFloat(subStock);
      
      if (isNaN(mainValue) || isNaN(subValue)) {
        return 'Please enter valid numbers for both fields';
      }
      
      if (mainValue < 0 || subValue < 0) {
        return 'Values cannot be negative';
      }
      
      if (mainValue > 999999 || subValue > 999999) {
        return 'Values are too high (max: 999,999)';
      }
      
      // Check subunit doesn't exceed factor
      if (subValue >= unit.subunit_factor) {
        return `${unit.subunit_name} cannot exceed ${unit.subunit_factor - 1}`;
      }
      
      return null;
    }
    
    // For simple units
    if (!value.trim()) {
      return 'Stock value is required';
    }
    
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      return 'Please enter a valid number';
    }
    
    if (numValue < 0) {
      return 'Stock cannot be negative';
    }
    
    if (numValue > 999999) {
      return 'Stock value is too high (max: 999,999)';
    }
    
    // Check for decimal places (max 2)
    const decimalPlaces = value.split('.')[1]?.length || 0;
    if (decimalPlaces > 2) {
      return 'Maximum 2 decimal places allowed';
    }
    
    return null;
  };

  // Helper function to check if stock input is valid for button state
  const isStockInputValid = (): boolean => {
    const unit = stockModal.variation ? units.find(u => u.id === stockModal.variation!.unit_id) : undefined;
    
    if (unit?.subunit_name && unit?.subunit_factor) {
      return !mainStock.trim() || !subStock.trim();
    } else {
      return !stockInput.trim();
    }
  };

  // Helper to map Product to Partial<ProductFormData>
  function mapProductToFormData(product: Product | null): Partial<ProductFormData> | undefined {
    if (!product) return undefined;
    return {
      id: product.id,
      name: product.name,
      brand: product.brand,
      category: product.category,
      variations: product.product_variations?.map(v => ({
        name: v.name,
        unit_id: v.unit_id,
        purchase_price: v.purchase_price,
        selling_price: v.selling_price,
        opening_stock: v.opening_stock,
        min_stock: v.min_stock,
        location: v.location,
      })) || [],
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
          <option value="lowStock">{t('inventory.lowStock', 'Low')}</option>
          <option value="outOfStock">{t('inventory.outOfStock', 'Out')}</option>
          <option value="inStock">{t('inventory.inStock', 'In')}</option>
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
          <option value="lowToHigh">{t('inventory.lowToHigh', 'Low→High')}</option>
          <option value="highToLow">{t('inventory.highToLow', 'High→Low')}</option>
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
          <option value="lowToHigh">{t('inventory.lowToHigh', 'Low→High')}</option>
          <option value="highToLow">{t('inventory.highToLow', 'High→Low')}</option>
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
                              {v.current_stock} {v.units?.name || ''}
                            </span>
                          </div>

                          {/* Min Stock */}
                          <div className="col-span-2 text-center">
                            <span className="text-sm text-gray-600">
                              {v.min_stock}
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
                              {v.current_stock} {v.units?.name || ''}
                            </span>
                          </div>

                          {/* Min Stock */}
                          <div className="col-span-2 text-center">
                            <span className="text-sm text-gray-600">
                              {v.min_stock}
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
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {t('inventory.updateStock', 'Update Stock')}
            </h3>
            <div className="mb-4">
              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                <p className="text-sm text-gray-600 mb-1">
                  {t('inventory.product', 'Product')}: {(() => {
                    const product = products.find(p => 
                      p.product_variations?.some(v => v.id === stockModal.variation?.id)
                    );
                    return product?.name || 'Unknown';
                  })()}
                </p>
                <p className="text-gray-900 font-medium">{stockModal.variation?.name}</p>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                {t('inventory.currentStock', 'Current Stock')}: {stockModal.variation?.current_stock} {stockModal.variation?.unit || ''}
              </p>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  {t('inventory.newStock', 'New Stock Level')}
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Enter the new total stock level
                </p>
                {(() => {
                  const unit = stockModal.variation ? units.find(u => u.id === stockModal.variation!.unit_id) : undefined;
                  const hasSubunit = unit?.subunit_name && unit?.subunit_factor;
                  
                  // Show loading state if units are not loaded yet
                  if (units.length === 0) {
                    return (
                      <div className="space-y-2">
                        <div className="animate-pulse bg-gray-200 h-10 rounded"></div>
                        <div className="text-xs text-gray-500">Loading units...</div>
                      </div>
                    );
                  }
                  
                  if (hasSubunit) {
                    return (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            className={`w-20 border rounded px-3 py-2 focus:outline-none focus:ring-2 transition-colors text-gray-900 placeholder-gray-500 ${
                              stockValidationError && stockInputTouched
                                ? 'border-red-500 focus:ring-red-500 bg-red-50'
                                : 'border-gray-300 focus:ring-blue-500'
                            }`}
                            value={mainStock}
                            onChange={(e) => handleMainStockChange(e.target.value)}
                            onBlur={() => setStockInputTouched(true)}
                            placeholder={unit?.name}
                          />
                          <span className="text-gray-700 text-sm font-medium">{unit?.name}</span>
                          <input
                            type="number"
                            className={`w-20 border rounded px-3 py-2 focus:outline-none focus:ring-2 transition-colors text-gray-900 placeholder-gray-500 ${
                              stockValidationError && stockInputTouched
                                ? 'border-red-500 focus:ring-red-500 bg-red-50'
                                : 'border-gray-300 focus:ring-blue-500'
                            }`}
                            value={subStock}
                            onChange={(e) => handleSubStockChange(e.target.value)}
                            onBlur={() => setStockInputTouched(true)}
                            max={unit?.subunit_factor ? unit.subunit_factor - 1 : undefined}
                            placeholder={unit?.subunit_name}
                          />
                          <span className="text-gray-700 text-sm font-medium">{unit?.subunit_name}</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          Parsed: {(() => {
                            const parsed = parseFractionalInput(`${mainStock || 0} ${subStock || 0}`, unit?.subunit_factor);
                            return isNaN(parsed) ? <span className="text-red-600">Invalid</span> : parsed;
                          })()} {unit?.name}
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div className="space-y-2">
                        <input
                          type="number"
                          className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 transition-colors text-gray-900 placeholder-gray-500 ${
                            stockValidationError && stockInputTouched
                              ? 'border-red-500 focus:ring-red-500 bg-red-50'
                              : 'border-gray-300 focus:ring-blue-500'
                          }`}
                          value={stockInput}
                          onChange={(e) => handleStockInputChange(e.target.value)}
                          onBlur={() => setStockInputTouched(true)}
                          step="0.01"
                          placeholder={t('inventory.enterNewStock', 'Enter new stock level')}
                        />
                        <div className="text-xs text-gray-500">
                          Unit: {unit?.name || (units.length === 0 ? 'Loading...' : 'Unknown')}
                        </div>
                      </div>
                    );
                  }
                })()}
                {stockValidationError && stockInputTouched && (
                  <p className="text-red-600 text-sm flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {stockValidationError}
                  </p>
                )}
                {!stockValidationError && stockInputTouched && (
                  <div className="space-y-2">
                    <p className="text-green-600 text-sm flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Valid stock value
                    </p>
                    {(() => {
                      const unit = stockModal.variation ? units.find(u => u.id === stockModal.variation!.unit_id) : undefined;
                      let newStock = 0;
                      
                      if (unit?.subunit_name && unit?.subunit_factor) {
                        const stockInput = `${mainStock || 0} ${subStock || 0}`;
                        newStock = parseFractionalInput(stockInput, unit.subunit_factor);
                      } else {
                        newStock = parseFractionalInput(stockInput);
                      }
                      
                      if (!isNaN(newStock)) {
                        const currentStock = stockModal.variation?.current_stock || 0;
                        const difference = newStock - currentStock;
                        return (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-sm text-blue-800">
                              <span className="font-medium">Will change:</span> {currentStock} → {newStock} {unit?.name || ''}
                            </p>
                            <p className={`text-lg font-bold ${difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {difference >= 0 ? '+' : ''}{difference} {unit?.name || ''} {difference >= 0 ? 'added' : 'removed'}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                className={`flex-1 px-4 py-2 rounded-lg font-medium focus:outline-none focus:ring-2 transition-colors ${
                  stockValidationError || isStockInputValid()
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
                }`}
                onClick={handleStockUpdate}
                disabled={stockUpdateLoading || !!stockValidationError || isStockInputValid()}
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