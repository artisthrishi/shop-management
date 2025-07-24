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
export function parseFractionalInput(input: string): number {
  // Handle inputs like "1 kg 250g" or "1.25 kg"
  const cleanInput = input.toLowerCase().trim();
  
  // Check for mixed format like "1 kg 250g"
  const mixedMatch = cleanInput.match(/^(\d+(?:\.\d+)?)\s*(kg|l|g|ml)\s*(\d+)\s*(g|ml)$/);
  if (mixedMatch) {
    const [, main, mainUnit, sub, subUnit] = mixedMatch;
    const mainValue = parseFloat(main);
    const subValue = parseFloat(sub);
    
    if (mainUnit === 'kg' && subUnit === 'g') {
      return mainValue + (subValue / 1000);
    }
    if (mainUnit === 'l' && subUnit === 'ml') {
      return mainValue + (subValue / 1000);
    }
  }
  
  // Handle decimal format
  const decimalMatch = cleanInput.match(/^(\d+(?:\.\d+)?)\s*(kg|l|g|ml|pcs|m|cm)$/);
  if (decimalMatch) {
    return parseFloat(decimalMatch[1]);
  }
  
  // Fallback to simple number
  return parseFloat(cleanInput) || 0;
}

export function formatFractionalOutput(value: number, unit: string): string {
  if (unit === 'kg' && value >= 1) {
    const kg = Math.floor(value);
    const g = Math.round((value - kg) * 1000);
    if (g > 0) {
      return `${kg} kg ${g}g`;
    }
    return `${kg} kg`;
  }
  
  if (unit === 'l' && value >= 1) {
    const l = Math.floor(value);
    const ml = Math.round((value - l) * 1000);
    if (ml > 0) {
      return `${l} l ${ml}ml`;
    }
    return `${l} l`;
  }
  
  return `${value} ${unit}`;
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
  return variation.current_stock <= variation.opening_stock * 0.2; // 20% of opening stock
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