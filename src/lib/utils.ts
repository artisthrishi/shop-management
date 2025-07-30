// ✅ Context for Cursor AI – Shop Manager MVP
//
// We're building a mobile-first, multilingual, offline-capable PWA for small shopkeepers (grocery/pharmacy).
// The MVP has 4 main tabs: Home, Inventory, Reports, and Settings.
// Built using Next.js (App Router), Tailwind CSS, Supabase (for auth + DB), and deployed as a PWA.
//
// ✅ Core features implemented or in progress:
// - Supabase project is created ✅
// - Custom schema with tables: users, units, products, product_variations, sales, sale_items ✅
// - Triggers for auto stock update and invoice calculation ✅
// - Supabase client is configured via `.env.local` and `utils/supabaseClient.ts` ✅
//
// ✅ Feature roadmap:
// 1. **Home Tab** – Acts as a sales + cart page
//    - Search + add product variations to cart
//    - Show total, editable selling price per item
//    - Checkout updates stock, shows invoice preview (PDF + WhatsApp)
//
// 2. **Inventory Tab**
//    - Add new product (+ variations like ₹5/₹10 packs)
//    - View inventory list (card view with stock + min alert)
//    - Support fractional units (e.g., 1.25 kg), unit awareness
//
// 3. **Reports Tab**
//    - Show total sales, profit, top-selling items, low stock alerts
//    - Filter by today, this week, this month
//    - Export as PDF
//
// 4. **Settings Tab**
//    - Manage shop info (GST, contact)
//    - Manage users (roles: owner, staff)
//    - Backup/restore (later)
//
// ✨ We want a simple, fast UI with minimal popup dialogs. All pages should be responsive and ready for PWA deployment.

import type { CartItem, ProductVariation } from '@/types';

// Utility function for conditional class names
export function classNames(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

// Currency formatting
export function formatCurrency(amount: number, currency = '₹'): string {
  return `${currency}${amount.toFixed(2)}`;
}

// Number formatting with locale
export function formatNumber(num: number, locale = 'en-IN'): string {
  return new Intl.NumberFormat(locale).format(num);
}

// Date formatting
export function formatDate(date: string | Date, locale = 'en-IN'): string {
  const d = new Date(date);
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

export function formatDateTime(date: string | Date, locale = 'en-IN'): string {
  const d = new Date(date);
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

// Cart calculations
export function calculateCartTotal(cartItems: CartItem[]): number {
  return cartItems.reduce((total, item) => {
    return total + (item.quantity * item.sellingPrice);
  }, 0);
}

export function calculateCartProfit(cartItems: CartItem[]): number {
  return cartItems.reduce((total, item) => {
    const cost = item.productVariation.purchase_price * item.quantity;
    const revenue = item.quantity * item.sellingPrice;
    return total + (revenue - cost);
  }, 0);
}

// Fractional unit parsing
export function parseFractionalInput(input: string, subunitFactor?: number): number {
  if (subunitFactor) {
    const [main, sub] = input.split(' ').map(Number);
    return (Number(main) || 0) + (Number(sub) || 0) / subunitFactor;
  }
  // Only parse as a simple number if no subunitFactor
  return parseFloat(input) || 0;
}

// Validation
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePhone(phone: string): boolean {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

export function validateGST(gst: string): boolean {
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstRegex.test(gst);
}

// Stock validation
export function isLowStock(variation: ProductVariation): boolean {
  return variation.current_stock <= variation.min_stock; // At or below minimum stock
}

export function isOutOfStock(variation: ProductVariation): boolean {
  return variation.current_stock <= 0;
}

// Date utilities
export function getTodayRange(): { start: string; end: string } {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
  
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

export function getLastWeekRange(): { start: string; end: string } {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
  
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

export function getLastMonthRange(): { start: string; end: string } {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
  
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

// Generate invoice number
export function generateInvoiceNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const time = String(now.getTime()).slice(-6);
  
  return `INV-${year}${month}${day}-${time}`;
}

// WhatsApp integration
type SaleForWhatsApp = {
  invoice_number: string;
  created_at: string | Date;
  total_amount: number;
};
type WhatsAppItem = {
  product_name: string;
  quantity: number;
  selling_price: number;
  total: number;
};

export function generateWhatsAppMessage(sale: SaleForWhatsApp, items: WhatsAppItem[]): string {
  const shopSettings = JSON.parse(localStorage.getItem('shopSettings') || '{}');
  const shopName = shopSettings.shop_name || 'Shop';
  
  let message = `*${shopName}*\n`;
  message += `Invoice: ${sale.invoice_number}\n`;
  message += `Date: ${formatDate(sale.created_at)}\n\n`;
  message += `*Items:*\n`;
  
  items.forEach(item => {
    message += `• ${item.product_name} - ${item.quantity} x ${formatCurrency(item.selling_price)} = ${formatCurrency(item.total)}\n`;
  });
  
  message += `\n*Total: ${formatCurrency(sale.total_amount)}*\n`;
  message += `Thank you for your purchase!`;
  
  return encodeURIComponent(message);
}

export function openWhatsApp(message: string, phone?: string): void {
  const whatsappUrl = phone 
    ? `https://wa.me/${phone}?text=${message}`
    : `https://wa.me/?text=${message}`;
  
  window.open(whatsappUrl, '_blank');
}

// Enhanced utility functions for database operations
export function calculateInventoryValue(stock: number, purchasePrice: number): number {
  return stock * purchasePrice;
}

export function calculateProfitMargin(sellingPrice: number, purchasePrice: number): number {
  if (purchasePrice === 0) return 0;
  return ((sellingPrice - purchasePrice) / purchasePrice) * 100;
}

export function calculateProfitAmount(sellingPrice: number, purchasePrice: number, quantity: number): number {
  return (sellingPrice - purchasePrice) * quantity;
}

// Stock status utilities
export function getStockStatus(variation: ProductVariation): 'in-stock' | 'low-stock' | 'out-of-stock' {
  if (variation.current_stock <= 0) return 'out-of-stock';
  if (variation.current_stock < variation.min_stock) return 'low-stock';
  return 'in-stock';
}

export function getStockStatusColor(status: 'in-stock' | 'low-stock' | 'out-of-stock'): string {
  switch (status) {
    case 'in-stock': return 'text-green-600';
    case 'low-stock': return 'text-yellow-600';
    case 'out-of-stock': return 'text-red-600';
    default: return 'text-gray-600';
  }
}

// Sales analytics utilities
export function calculateSalesGrowth(currentPeriod: number, previousPeriod: number): number {
  if (previousPeriod === 0) return currentPeriod > 0 ? 100 : 0;
  return ((currentPeriod - previousPeriod) / previousPeriod) * 100;
}

export function formatPercentage(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

// Search utilities
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Data validation utilities
export function isValidQuantity(quantity: number, unit: string): boolean {
  if (quantity <= 0) return false;
  
  // For fractional units like kg, allow decimals
  if (unit === 'kg' || unit === 'l' || unit === 'm') {
    return quantity > 0;
  }
  
  // For discrete units like pcs, only allow integers
  return Number.isInteger(quantity);
}

// Fractional unit utilities
export interface FractionalQuantity {
  main: number;
  sub: number;
}

export function parseFractionalQuantity(value: string, unit: any): FractionalQuantity {
  if (!unit?.fractional) {
    return { main: parseFloat(value) || 0, sub: 0 };
  }

  const parts = value.split(' ');
  if (parts.length === 2) {
    return {
      main: parseInt(parts[0]) || 0,
      sub: parseInt(parts[1]) || 0
    };
  }

  // Handle decimal input (e.g., "1.25" kg)
  const decimalValue = parseFloat(value) || 0;
  const main = Math.floor(decimalValue);
  const sub = Math.round((decimalValue - main) * (unit.subunit_factor || 1000));
  
  return { main, sub };
}

export function formatFractionalQuantity(quantity: FractionalQuantity, unit: any): string {
  if (!unit?.fractional) {
    return quantity.main.toString();
  }

  if (quantity.sub === 0) {
    return `${quantity.main} ${unit.name}`;
  }

  return `${quantity.main} ${unit.name} ${quantity.sub} ${unit.subunit_name}`;
}

export function getFractionalQuantityValue(quantity: FractionalQuantity, unit: any): number {
  if (!unit?.fractional) {
    return quantity.main;
  }

  return quantity.main + (quantity.sub / (unit.subunit_factor || 1000));
}

export function getFractionalQuantityFromValue(value: number, unit: any): FractionalQuantity {
  if (!unit?.fractional) {
    return { main: value, sub: 0 };
  }

  const main = Math.floor(value);
  const sub = Math.round((value - main) * (unit.subunit_factor || 1000));
  
  return { main, sub };
}

export function validateProductData(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data.name?.trim()) errors.push('Product name is required');
  if (!data.brand?.trim()) errors.push('Brand is required');
  if (!data.category?.trim()) errors.push('Category is required');
  
  if (data.variations?.length === 0) {
    errors.push('At least one variation is required');
  }
  
  data.variations?.forEach((variation: any, index: number) => {
    if (!variation.name?.trim()) errors.push(`Variation ${index + 1}: Name is required`);
    if (variation.purchase_price <= 0) errors.push(`Variation ${index + 1}: Purchase price must be greater than 0`);
    if (variation.selling_price <= 0) errors.push(`Variation ${index + 1}: Selling price must be greater than 0`);
    if (variation.opening_stock < 0) errors.push(`Variation ${index + 1}: Opening stock cannot be negative`);
    if (variation.min_stock < 0) errors.push(`Variation ${index + 1}: Minimum stock cannot be negative`);
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
} 