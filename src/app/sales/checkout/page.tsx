'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, CreditCardIcon, BanknotesIcon } from '@heroicons/react/24/outline';
import { formatCurrency, calculateCartTotal, calculateCartProfit } from '@/lib/utils';
import { getShopSettingsWithDefaults, createSaleWithItems, validateStockAvailability } from '@/lib/database';
import type { CartItem } from '@/types';
import '../../../lib/i18n';

type PaymentMethod = 'cash' | 'card' | 'upi';

interface CustomerInfo {
  name: string;
  phone: string;
}

export default function CheckoutPage() {
  const { t } = useTranslation();
  const router = useRouter();
  
  // State
  const [shopName, setShopName] = useState('');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '',
    phone: ''
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [loading, setLoading] = useState(false);

  // Load shop settings and cart data
  useEffect(() => {
    const loadData = async () => {
      try {
        const settings = await getShopSettingsWithDefaults();
        setShopName(settings.shop_name);
        
        // Load cart items from localStorage
        const cartData = localStorage.getItem('cartItems');
        if (cartData) {
          setCartItems(JSON.parse(cartData));
        }
      } catch (error) {
        console.error('Error loading checkout data:', error);
      }
    };
    
    loadData();
  }, []);

  // Calculate totals
  const subtotal = calculateCartTotal(cartItems);
  const profit = calculateCartProfit(cartItems);
  const total = subtotal;

  const handleCompleteSale = async () => {
    setLoading(true);
    try {
      // Validate stock availability
      const stockValidation = await validateStockAvailability(cartItems);
      if (!stockValidation.valid) {
        alert(`Stock validation failed:\n${stockValidation.errors.join('\n')}`);
        return;
      }

      // Create sale with items
      const saleData = {
        total_amount: total,
        estimated_profit: profit,
        customer_name: customerInfo.name || undefined,
        customer_phone: customerInfo.phone || undefined,
        payment_method: paymentMethod
      };

      const { sale, saleItems } = await createSaleWithItems(saleData, cartItems);
      
      // Clear cart
      localStorage.removeItem('cartItems');
      
      // Show success message
      alert(`Sale completed successfully!\nInvoice: ${sale.invoice_number}\nTotal: ${formatCurrency(sale.total_amount)}`);
      
      // Redirect to home page
      router.push('/');
    } catch (error) {
      console.error('Error completing sale:', error);
      alert('Error completing sale. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4">
          <div className="text-center">
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {t('checkout.emptyCart', 'Cart is Empty')}
            </h2>
            <p className="text-gray-600 mb-6">
              {t('checkout.addItemsFirst', 'Add items to cart before checkout')}
            </p>
            <button
              onClick={() => router.push('/sales/new')}
              className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              {t('checkout.backToSales', 'Back to Sales')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/sales/new')}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{t('checkout.title', 'Checkout')}</h1>
              <p className="text-sm text-gray-500">{shopName}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto">
        <div className="space-y-6">
          
          {/* Customer Information */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-base font-semibold text-gray-900 mb-3">
              {t('checkout.customerInfo', 'Customer Information')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('checkout.customerName', 'Customer Name')}
                </label>
                <input
                  type="text"
                  value={customerInfo.name}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700"
                  placeholder={t('checkout.enterCustomerName', 'Enter customer name')}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('checkout.phoneNumber', 'Phone Number')}
                </label>
                <input
                  type="tel"
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700"
                  placeholder={t('checkout.enterPhone', 'Enter phone number')}
                />
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-base font-semibold text-gray-900 mb-3">
              {t('checkout.paymentMethod', 'Payment Method')}
            </h2>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setPaymentMethod('cash')}
                className={`p-3 border rounded-lg text-center transition-colors ${
                  paymentMethod === 'cash'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <BanknotesIcon className="w-6 h-6 text-green-600 mx-auto mb-1" />
                <div className="font-medium text-gray-900 text-sm">{t('checkout.cash', 'Cash')}</div>
              </button>
              
              <button
                onClick={() => setPaymentMethod('card')}
                className={`p-3 border rounded-lg text-center transition-colors ${
                  paymentMethod === 'card'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <CreditCardIcon className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                <div className="font-medium text-gray-900 text-sm">{t('checkout.card', 'Card')}</div>
              </button>
              
              <button
                onClick={() => setPaymentMethod('upi')}
                className={`p-3 border rounded-lg text-center transition-colors ${
                  paymentMethod === 'upi'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="w-6 h-6 bg-purple-600 rounded flex items-center justify-center text-white text-xs font-bold mx-auto mb-1">UPI</div>
                <div className="font-medium text-gray-900 text-sm">{t('checkout.upi', 'UPI')}</div>
              </button>
            </div>


          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {t('checkout.orderSummary', 'Order Summary')}
            </h2>
            
            {/* Cart Items */}
            <div className="space-y-3 mb-4">
              {cartItems.map((item) => (
                <div key={item.productVariation.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div className="flex-1">
                    <div className="font-medium text-sm text-gray-900">
                      {(item.productVariation as any).products?.name || 'Unknown Product'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {item.productVariation.name} × {item.quantity}
                    </div>
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    {formatCurrency(item.quantity * item.sellingPrice)}
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="space-y-2 pt-4 border-t border-gray-200">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('checkout.subtotal', 'Subtotal')}</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold pt-2 border-t border-gray-200">
                <span className="text-gray-900">{t('checkout.total', 'Total')}</span>
                <span className="text-gray-900">{formatCurrency(total)}</span>
              </div>
              <div className="flex justify-between text-sm text-green-600">
                <span>{t('checkout.estimatedProfit', 'Est. Profit')}</span>
                <span>+{formatCurrency(profit)}</span>
              </div>
            </div>
          </div>

          {/* Complete Sale Button */}
          <button
            onClick={handleCompleteSale}
            disabled={loading}
            className="w-full bg-green-600 text-white font-semibold py-4 px-6 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg"
          >
            {loading ? t('checkout.processing', 'Processing...') : t('checkout.completeSale', 'Complete Sale')}
          </button>
        </div>
      </div>
    </div>
  );
} 