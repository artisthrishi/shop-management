// ============================================================================
// Context: Shop Manager MVP - New Sale Page
// ============================================================================
'use client';

import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { searchProducts, getShopSettingsWithDefaults } from '@/lib/database';
import { 
  formatCurrency, 
  debounce, 
  parseFractionalInput,
  parseFractionalQuantity,
  formatFractionalQuantity,
  getFractionalQuantityValue,
  getFractionalQuantityFromValue,
  type FractionalQuantity
} from '@/lib/utils';
import { useRouter } from 'next/navigation';
import Fuse from 'fuse.js';
import type { ProductVariation, CartItem } from '@/types';
import '../../../lib/i18n';

export default function NewSalePage() {
  const { t } = useTranslation();
  const router = useRouter();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [allProducts, setAllProducts] = useState<ProductVariation[]>([]);
  const [searchResults, setSearchResults] = useState<ProductVariation[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [shopName, setShopName] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [searchError, setSearchError] = useState('');
  const [cartInitialized, setCartInitialized] = useState(false);

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchResultsRef = useRef<HTMLDivElement>(null);

  // Load shop name, all products, and cart items
  useEffect(() => {
    const loadData = async () => {
      try {
        const settings = await getShopSettingsWithDefaults();
        setShopName(settings.shop_name);
        
        // Load all products for client-side search
        const products = await searchProducts('');
        setAllProducts(products);
        
        // Load cart items from localStorage
        const cartData = localStorage.getItem('cartItems');
        if (cartData) {
          setCartItems(JSON.parse(cartData));
        }
        setCartInitialized(true);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    
    loadData();
  }, []);

  // Save cart items to localStorage whenever they change
  useEffect(() => {
    // Only save/remove if cart has been initialized
    if (!cartInitialized) return;
    
    if (cartItems.length > 0) {
      localStorage.setItem('cartItems', JSON.stringify(cartItems));
    } else {
      localStorage.removeItem('cartItems');
    }
  }, [cartItems, cartInitialized]);

  // Fuse.js search configuration
  const fuse = new Fuse(allProducts, {
    keys: [
      'name',
      'products.name',
      'products.brand', 
      'products.category'
    ],
    threshold: 0.4,
    includeScore: true
  });

  // Enhanced debounced search function
  const debouncedSearch = debounce(async (query: string) => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      setSearchError('');
      return;
    }

    setLoading(true);
    setSearchError('');
    try {
      // Use Fuse.js for client-side fuzzy search
      const results = fuse.search(query).map(result => result.item);
      setSearchResults(results);
      setShowSearchResults(true);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Error searching products:', error);
      setSearchError(t('sales.searchError', 'Error searching products'));
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, 300);

  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    debouncedSearch(query);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSearchResults || searchResults.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
          addToCart(searchResults[selectedIndex]);
          setShowSearchResults(false);
          setSearchQuery('');
          setSearchResults([]);
        }
        break;
      case 'Escape':
        setShowSearchResults(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Handle search input focus
  const handleSearchFocus = () => {
    if (searchResults.length > 0) {
      setShowSearchResults(true);
    }
  };

  // Handle click outside to close search results
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node) &&
          searchResultsRef.current && !searchResultsRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Add item to cart
  const addToCart = (product: ProductVariation) => {
    const existingItem = cartItems.find(item => item.productVariation.id === product.id);
    
    if (existingItem) {
      // Update quantity if already in cart
      setCartItems(prev => prev.map(item => 
        item.productVariation.id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      // Add new item to cart
      const newItem: CartItem = {
        productVariation: product,
        quantity: 1,
        sellingPrice: product.selling_price
      };
      setCartItems(prev => [...prev, newItem]);
    }

    // Clear search after adding to cart
    setShowSearchResults(false);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedIndex(-1);
    searchInputRef.current?.focus();
  };

  // Update cart item quantity (regular units)
  const updateCartItemQuantity = (productId: number, quantity: number) => {
    const validQuantity = Math.max(0, quantity);
    setCartItems(prev => prev.map(item => 
      item.productVariation.id === productId 
        ? { ...item, quantity: validQuantity }
        : item
    ));
  };

  // Update cart item quantity (fractional units)
  const updateCartItemQuantityFractional = (productId: number, mainUnit: number, subUnit: number) => {
    const item = cartItems.find(item => item.productVariation.id === productId);
    if (!item) return;

    const unit = (item.productVariation as any).units;
    if (!unit?.fractional) return;

    const fractionalQuantity: FractionalQuantity = {
      main: mainUnit,
      sub: subUnit
    };

    const totalValue = getFractionalQuantityValue(fractionalQuantity, unit);
    const validQuantity = Math.max(0, totalValue);

    setCartItems(prev => prev.map(item => 
      item.productVariation.id === productId 
        ? { ...item, quantity: validQuantity }
        : item
    ));
  };

  // Update cart item selling price
  const updateCartItemPrice = (productId: number, price: number) => {
    setCartItems(prev => prev.map(item => 
      item.productVariation.id === productId 
        ? { ...item, sellingPrice: price }
        : item
    ));
  };

  // Remove cart item
  const removeCartItem = (productId: number) => {
    setCartItems(prev => prev.filter(item => item.productVariation.id !== productId));
  };

  // Get stock status after sale
  const getCartItemStockStatus = (item: CartItem) => {
    const currentStock = item.productVariation.current_stock;
    const remainingStock = currentStock - item.quantity;
    const minStock = item.productVariation.min_stock;

    if (remainingStock < 0) return { status: 'exceeded', color: 'error', text: t('sales.stockExceeded', 'Stock Exceeded') };
    if (remainingStock === 0) return { status: 'depleted', color: 'error', text: t('sales.outOfStock', 'Out of Stock') };
    if (remainingStock <= minStock) return { status: 'low', color: 'warning', text: t('sales.lowStock', 'Low Stock') };
    return { status: 'ok', color: 'success', text: t('sales.inStock', 'In Stock') };
  };

  // Calculate cart totals
  const subtotal = cartItems.reduce((total, item) => total + (item.quantity * item.sellingPrice), 0);
  const profit = cartItems.reduce((total, item) => {
    const cost = item.productVariation.purchase_price * item.quantity;
    const revenue = item.quantity * item.sellingPrice;
    return total + (revenue - cost);
  }, 0);
  const total = subtotal;

  // Save cart to localStorage
  useEffect(() => {
    if (cartItems.length > 0) {
      localStorage.setItem('cartItems', JSON.stringify(cartItems));
    }
  }, [cartItems]);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Fixed Header */}
      <div className="bg-white border-b border-gray-200 px-2 py-1 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
            >
              ←
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{t('sales.newSale', 'New Sale')}</h1>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-1 relative">
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            onFocus={handleSearchFocus}
            placeholder={t('sales.searchPlaceholder', 'Search products...')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700"
          />
          {loading && (
            <div className="absolute right-3 top-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            </div>
          )}
          {searchQuery && !loading && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSearchResults([]);
                setShowSearchResults(false);
                searchInputRef.current?.focus();
              }}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}

          {/* Search Results Dropdown */}
          {showSearchResults && (
            <div 
              ref={searchResultsRef}
              className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto z-50"
            >
              {searchResults.length > 0 ? (
                searchResults.map((product, index) => {
                  const isSelected = index === selectedIndex;
                  const stockStatus = getCartItemStockStatus({ productVariation: product, quantity: 1, sellingPrice: product.selling_price });
                  
                  return (
                    <div
                      key={product.id}
                      className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-blue-50 border-blue-200' 
                          : 'hover:bg-gray-50'
                      } ${index > 0 ? 'border-t border-gray-100' : ''}`}
                      onClick={() => addToCart(product)}
                      onMouseEnter={() => setSelectedIndex(index)}
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {(product as any).products?.name || 'Unknown Product'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {product.name} • {(product as any).units?.name || 'pcs'}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            stockStatus.color === 'success' ? 'bg-green-100 text-green-800' :
                            stockStatus.color === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {stockStatus.text}
                          </span>
                          <span className="text-xs text-gray-400">
                            {t('sales.stock', 'Stock')}: {product.current_stock}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-900">
                          {formatCurrency(product.selling_price)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {t('sales.cost', 'Cost')}: {formatCurrency(product.purchase_price)}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : searchQuery.length > 0 && !loading ? (
                <div className="p-4 text-center text-gray-500">
                  {t('sales.noProductsFound', 'No products found')}
                </div>
              ) : null}
            </div>
          )}

          {/* Search Error */}
          {searchError && (
            <div className="mt-2 text-sm text-red-600">
              {searchError}
            </div>
          )}
        </div>
      </div>

      {/* Scrollable Main Content */}
      <div className="flex-1 p-2 overflow-y-auto">
        {cartItems.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center h-full text-center -mt-20">
            <div className="text-6xl mb-4">🛒</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t('sales.emptyCart', 'Your cart is empty')}
            </h3>
            <p className="text-gray-600 max-w-sm">
              {t('sales.searchToAdd', 'Search for products above to add them to your cart')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {cartItems.map((item) => {
            const unit = (item.productVariation as any).units;
            const fractionalQuantity = getFractionalQuantityFromValue(item.quantity, unit);
            const stockStatus = getCartItemStockStatus(item);

            return (
              <div key={item.productVariation.id} className="bg-white border border-gray-200 rounded-lg p-3">
                {/* Row 1: Product Name • Variation [In Stock: 50] [×] */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-gray-900">
                        {(item.productVariation as any).products?.name || 'Unknown Product'}
                      </span>
                      <span className="text-gray-500">•</span>
                      <span className="text-gray-500">{item.productVariation.name}</span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        stockStatus.color === 'success' ? 'bg-green-100 text-green-800' :
                        stockStatus.color === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {t('sales.inStock', 'In Stock')}: {item.productVariation.current_stock}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeCartItem(item.productVariation.id)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    ✕
                  </button>
                </div>

                {/* Row 2: Quantity: [-] 1 [+] kg 200 gm */}
                <div className="mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">{t('sales.quantity', 'Quantity')}:</span>
                    
                    {unit?.fractional ? (
                      // Fractional unit input
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateCartItemQuantityFractional(
                            item.productVariation.id, 
                            Math.max(0, fractionalQuantity.main - 1), 
                            fractionalQuantity.sub
                          )}
                          className="w-6 h-6 bg-gray-200 text-gray-900 rounded flex items-center justify-center hover:bg-gray-300 transition-colors"
                        >
                          -
                        </button>
                        
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={fractionalQuantity.main}
                          onChange={(e) => updateCartItemQuantityFractional(
                            item.productVariation.id,
                            parseInt(e.target.value) || 0,
                            fractionalQuantity.sub
                          )}
                          className="w-12 h-6 text-center text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-gray-700"
                        />
                        
                        <span className="text-sm text-gray-600">{unit.name}</span>
                        
                        <input
                          type="number"
                          min="0"
                          max={unit.subunit_factor - 1}
                          step="any"
                          value={fractionalQuantity.sub}
                          onChange={(e) => updateCartItemQuantityFractional(
                            item.productVariation.id,
                            fractionalQuantity.main,
                            parseInt(e.target.value) || 0
                          )}
                          className="w-12 h-6 text-center text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-gray-700"
                        />
                        
                        <span className="text-sm text-gray-600">{unit.subunit_name}</span>
                        
                        <button
                          onClick={() => updateCartItemQuantityFractional(
                            item.productVariation.id, 
                            fractionalQuantity.main + 1, 
                            fractionalQuantity.sub
                          )}
                          className="w-6 h-6 bg-gray-200 text-gray-900 rounded flex items-center justify-center hover:bg-gray-300 transition-colors"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      // Regular unit input
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateCartItemQuantity(item.productVariation.id, item.quantity - 1)}
                          className="w-6 h-6 bg-gray-200 text-gray-900 rounded flex items-center justify-center hover:bg-gray-300 transition-colors"
                        >
                          -
                        </button>
                        
                        <input
                          type="number"
                          min="0"
                          max={item.productVariation.current_stock}
                          step="any"
                          value={item.quantity}
                          onChange={(e) => updateCartItemQuantity(item.productVariation.id, parseFloat(e.target.value) || 0)}
                          className="w-16 h-6 text-center text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-gray-700"
                        />
                        
                        <span className="text-sm text-gray-600">{unit?.name || 'pcs'}</span>
                        
                        <button
                          onClick={() => updateCartItemQuantity(item.productVariation.id, item.quantity + 1)}
                          className="w-6 h-6 bg-gray-200 text-gray-900 rounded flex items-center justify-center hover:bg-gray-300 transition-colors"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Row 3: Price: [₹50] per kg                             ₹300 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">{t('sales.price', 'Price')}:</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={item.sellingPrice}
                      onChange={(e) => updateCartItemPrice(item.productVariation.id, parseFloat(e.target.value) || 0)}
                      className="w-16 h-6 text-center text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-gray-700"
                    />
                    <span className="text-sm text-gray-600">per {unit?.name || 'pcs'}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">
                      {formatCurrency(item.quantity * item.sellingPrice)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        )}
      </div>

      {/* Sticky Footer */}
      {cartItems.length > 0 && (
        <div className="bg-white border-t border-gray-200 px-4 py-3 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-green-600">
              {t('sales.estimatedProfit', 'Est. Profit')}: +{formatCurrency(profit)}
            </div>
            <div className="text-sm text-gray-600">
              {t('sales.subtotal', 'Subtotal')}: <span className="font-semibold text-gray-900">{formatCurrency(subtotal)}</span>
            </div>
          </div>
          
          <button
            onClick={() => router.push('/sales/checkout')}
            className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t('sales.checkout', 'Checkout')} ({cartItems.length} {t('sales.items', 'items')})
          </button>
        </div>
      )}
    </div>
  );
} 