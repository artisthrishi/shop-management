'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeftIcon, PrinterIcon, ShareIcon } from '@heroicons/react/24/outline';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getSaleWithItems, getShopSettingsWithDefaults, updateSalePhone } from '@/lib/database';
import type { Sale, SaleItem, ProductVariation, ShopSettings } from '@/types';
import '../../../../lib/i18n';

interface InvoiceData {
  sale: Sale;
  saleItems: (SaleItem & {
    product_variations: ProductVariation & {
      products: { name: string; brand: string; category: string };
      units: { name: string };
    };
  })[];
  shopSettings: ShopSettings;
}

export default function InvoicePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const saleId = params.id as string;

  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [customerPhone, setCustomerPhone] = useState('');
  const [updatingPhone, setUpdatingPhone] = useState(false);

  useEffect(() => {
    const loadInvoiceData = async () => {
      try {
        setLoading(true);
        
        // Load sale data and shop settings in parallel
        const [saleData, shopSettings] = await Promise.all([
          getSaleWithItems(saleId),
          getShopSettingsWithDefaults()
        ]);

        setInvoiceData({
          sale: saleData.sale,
          saleItems: saleData.saleItems,
          shopSettings
        });
      } catch (err) {
        console.error('Error loading invoice data:', err);
        setError('Failed to load invoice data');
      } finally {
        setLoading(false);
      }
    };

    if (saleId) {
      loadInvoiceData();
    }
  }, [saleId]);

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    if (!invoiceData) return;
    
    const phone = invoiceData.sale.customer_phone;
    
    if (phone) {
      // Direct to customer
      const message = generateWhatsAppMessage(invoiceData);
      const formattedPhone = phone.replace(/\D/g, '');
      const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    } else {
      // Show phone input modal
      setShowPhoneModal(true);
    }
  };

  const handleSendWithPhone = async () => {
    if (!customerPhone.trim()) {
      alert('Please enter a valid phone number');
      return;
    }
    
    if (!invoiceData) return;
    
    setUpdatingPhone(true);
    try {
      // Try to update sale with customer phone number (optional)
      try {
        await updateSalePhone(invoiceData.sale.id, customerPhone);
        console.log('Successfully updated sale with phone number');
      } catch (updateError) {
        console.log('Could not update sale in database, but continuing with WhatsApp share');
      }
      
      // Send WhatsApp message
      const message = generateWhatsAppMessage({
        sale: { ...invoiceData.sale, customer_phone: customerPhone },
        saleItems: invoiceData.saleItems,
        shopSettings: invoiceData.shopSettings
      });
      
      const formattedPhone = customerPhone.replace(/\D/g, '');
      const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
      
      window.open(whatsappUrl, '_blank');
      setShowPhoneModal(false);
      setCustomerPhone('');
      
      // Show success message
      alert('WhatsApp message sent successfully!');
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      alert('Error sending WhatsApp message. Please try again.');
    } finally {
      setUpdatingPhone(false);
    }
  };

  const generateWhatsAppMessage = (data: InvoiceData): string => {
    const { sale, saleItems, shopSettings } = data;
    
    let message = `*${shopSettings.shop_name}*\n`;
    message += `Invoice: ${sale.invoice_number}\n`;
    message += `Date: ${formatDate(sale.created_at)}\n`;
    if (sale.customer_name) message += `Customer: ${sale.customer_name}\n`;
    if (sale.customer_phone) message += `Phone: ${sale.customer_phone}\n`;
    message += `Payment: ${sale.payment_method || 'Cash'}\n\n`;
    message += `*Items:*\n`;
    
    saleItems.forEach(item => {
      const productName = item.product_variations.products.name;
      const variationName = item.product_variations.name;
      const unitName = item.product_variations.units.name;
      message += `• ${productName} - ${variationName} (${item.quantity} ${unitName}) = ${formatCurrency(item.total)}\n`;
    });
    
    message += `\n*Total: ${formatCurrency(sale.total_amount)}*\n`;
    message += `Thank you for your purchase!`;
    
    return message;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('invoice.loading', 'Loading invoice...')}</p>
        </div>
      </div>
    );
  }

  if (error || !invoiceData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4">
          <div className="text-center">
            <div className="text-6xl mb-4">❌</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {t('invoice.error', 'Invoice Not Found')}
            </h2>
            <p className="text-gray-600 mb-6">
              {error || t('invoice.notFound', 'The requested invoice could not be found.')}
            </p>
            <button
              onClick={() => router.push('/')}
              className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              {t('invoice.backToHome', 'Back to Home')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { sale, saleItems, shopSettings } = invoiceData;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Hidden on print */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 print:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{t('invoice.title', 'Invoice')}</h1>
              <p className="text-sm text-gray-500">{sale.invoice_number}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
              title={t('invoice.print', 'Print Invoice')}
            >
              <PrinterIcon className="w-5 h-5" />
            </button>
            <button
              onClick={handleShare}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
              title={t('invoice.share', 'Share via WhatsApp')}
            >
              <ShareIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Invoice Content */}
      <div className="max-w-4xl mx-auto p-4 print:p-0">
        {/* Action Buttons - Hidden on print */}
        <div className="mb-4 print:hidden">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handlePrint}
              className="bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <PrinterIcon className="w-5 h-5" />
              {t('invoice.downloadPDF', 'Download PDF')}
            </button>
            <button
              onClick={handleShare}
              className="bg-green-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
            >
              <ShareIcon className="w-5 h-5" />
              {t('invoice.shareWhatsApp', 'Share WhatsApp')}
            </button>
          </div>
        </div>
        
        <div className="bg-white shadow-lg rounded-lg overflow-hidden print:shadow-none print:rounded-none">
          {/* Invoice Header */}
          <div className="p-6 border-b border-gray-200 print:p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 mb-2 print:text-xl">
                  {shopSettings.shop_name}
                </h1>
                {shopSettings.contact && (
                  <p className="text-gray-600 text-sm mb-1">
                    📞 {shopSettings.contact}
                  </p>
                )}
                {shopSettings.gst_number && (
                  <p className="text-gray-600 text-sm">
                    🏢 GST: {shopSettings.gst_number}
                  </p>
                )}
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-gray-900 mb-1">
                  {t('invoice.invoice', 'INVOICE')}
                </div>
                <div className="text-sm text-gray-600">
                  {sale.invoice_number}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {formatDate(sale.created_at)}
                </div>
              </div>
            </div>
          </div>

          {/* Customer & Payment Info */}
          <div className="p-6 border-b border-gray-200 print:p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">
                  {t('invoice.customerInfo', 'Customer Information')}
                </h3>
                {sale.customer_name && (
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="font-medium">Name:</span> {sale.customer_name}
                  </p>
                )}
                {sale.customer_phone && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Phone:</span> {sale.customer_phone}
                  </p>
                )}
                {!sale.customer_name && !sale.customer_phone && (
                  <p className="text-sm text-gray-500 italic">
                    {t('invoice.walkInCustomer', 'Walk-in Customer')}
                  </p>
                )}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">
                  {t('invoice.paymentInfo', 'Payment Information')}
                </h3>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Method:</span> {sale.payment_method || 'Cash'}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Status:</span> Paid
                </p>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="p-6 print:p-4">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 text-sm font-semibold text-gray-900">
                      {t('invoice.item', 'Item')}
                    </th>
                    <th className="text-right py-3 px-2 text-sm font-semibold text-gray-900">
                      {t('invoice.quantity', 'Qty')}
                    </th>
                    <th className="text-right py-3 px-2 text-sm font-semibold text-gray-900">
                      {t('invoice.price', 'Price')}
                    </th>
                    <th className="text-right py-3 px-2 text-sm font-semibold text-gray-900">
                      {t('invoice.total', 'Total')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {saleItems.map((item, index) => (
                    <tr key={item.id} className={index !== saleItems.length - 1 ? 'border-b border-gray-100' : ''}>
                      <td className="py-3 px-2">
                        <div>
                          <div className="font-medium text-sm text-gray-900">
                            {item.product_variations.products.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {item.product_variations.name} ({item.product_variations.units.name})
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-right text-sm text-gray-900">
                        {item.quantity}
                      </td>
                      <td className="py-3 px-2 text-right text-sm text-gray-900">
                        {formatCurrency(item.selling_price)}
                      </td>
                      <td className="py-3 px-2 text-right text-sm font-medium text-gray-900">
                        {formatCurrency(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="p-6 border-t border-gray-200 print:p-4">
            <div className="flex justify-end">
              <div className="w-48">
                <div className="flex justify-between py-2">
                  <span className="text-sm text-gray-600">{t('invoice.subtotal', 'Subtotal')}:</span>
                  <span className="text-sm font-medium text-gray-900">{formatCurrency(sale.total_amount)}</span>
                </div>
                <div className="flex justify-between py-2 border-t border-gray-200">
                  <span className="text-base font-semibold text-gray-900">{t('invoice.total', 'Total')}:</span>
                  <span className="text-base font-bold text-gray-900">{formatCurrency(sale.total_amount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 bg-gray-50 print:p-4 print:bg-transparent">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">
                {t('invoice.thankYou', 'Thank you for your purchase!')}
              </p>
              <p className="text-xs text-gray-500">
                {t('invoice.visitAgain', 'Please visit again')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Phone Input Modal */}
      {showPhoneModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">
              {t('invoice.enterPhone', 'Enter Customer Phone Number')}
            </h3>
            <p className="text-gray-600 mb-4">
              {t('invoice.phoneNotProvided', 'Phone number not provided during checkout. Please enter it to send the invoice.')}
            </p>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder={t('invoice.phonePlaceholder', 'Enter phone number')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowPhoneModal(false);
                  setCustomerPhone('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={updatingPhone}
              >
                {t('invoice.cancel', 'Cancel')}
              </button>
              <button
                onClick={handleSendWithPhone}
                disabled={updatingPhone}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {updatingPhone ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    {t('invoice.sending', 'Sending...')}
                  </div>
                ) : (
                  t('invoice.sendWhatsApp', 'Send via WhatsApp')
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            margin: 1cm;
            size: A4;
          }
          body {
            background: white !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
} 