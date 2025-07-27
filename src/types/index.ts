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

// Database types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'staff';
  created_at: string;
}

export interface Unit {
  id: number;
  name: string;
  fractional: boolean;
  full_name?: string;
  subunit_name?: string;
  subunit_factor?: number;
}

export interface Product {
  id: number;
  name: string;
  category: string;
  brand: string;
  created_at: string;
  created_by: string | null;
  product_variations?: ProductVariation[];
}

export interface ProductVariation {
  id: number;
  product_id: number;
  name: string;
  unit_id: number;
  purchase_price: number;
  selling_price: number;
  opening_stock: number;
  current_stock: number;
  min_stock: number;
  location: string;
  created_by: string | null;
  unit?: string; // for UI display
  units?: Unit; // joined unit data
}

export interface Sale {
  id: number;
  user_id: string;
  created_at: string;
  total_amount: number;
  estimated_profit: number;
  invoice_number: string;
  customer_contact: string;
}

export interface SaleItem {
  id: number;
  sale_id: number;
  product_variation_id: number;
  quantity: number;
  selling_price: number;
  purchase_price: number;
  total: number;
}

export interface ShopSettings {
  id: number;
  shop_name: string;
  contact: string;
  gst_number: string;
  language: string;
}

// UI types
export interface CartItem {
  productVariation: ProductVariation;
  quantity: number;
  sellingPrice: number;
}

export interface Language {
  code: string;
  name: string;
  nativeName: string;
}

// Form types
export interface ProductFormData {
  name: string;
  category: string;
  brand: string;
  variations: ProductVariationFormData[];
  id?: number;
}

export interface ProductVariationFormData {
  name: string;
  unit_id: number;
  purchase_price: number;
  selling_price: number;
  opening_stock: number;
  min_stock: number;
  location: string;
}

// Report types
export interface ReportFilters {
  period: 'today' | 'lastWeek' | 'lastMonth';
  startDate?: string;
  endDate?: string;
}

export interface SalesReport {
  totalSales: number;
  estimatedProfit: number;
  checkouts: number;
  itemsSold: number;
  topSellingProducts: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
  lowStockProducts: ProductVariation[];
} 