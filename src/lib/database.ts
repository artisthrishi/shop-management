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

import { supabase } from './supabaseClient';
import type { 
  User, 
  Product, 
  ProductVariation, 
  Sale, 
  SaleItem, 
  ShopSettings,
  Unit 
} from '@/types';

// Units
export async function getUnits(): Promise<Unit[]> {
  const { data, error } = await supabase
    .from('units')
    .select('id, name, fractional, full_name, subunit_name, subunit_factor')
    .order('name');
  
  if (error) throw error;
  return data || [];
}

// Products
export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('name');
  
  if (error) throw error;
  return data || [];
}

export async function getProductWithVariations(productId: number) {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      product_variations (*)
    `)
    .eq('id', productId)
    .single();
  
  if (error) throw error;
  return data;
}

export async function createProduct(product: { name: string; brand: string; category: string; created_by: string | null }) {
  const { data, error } = await supabase
    .from('products')
    .insert(product)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Product Variations
export async function getProductVariations(productId?: number): Promise<ProductVariation[]> {
  let query = supabase
    .from('product_variations')
    .select('*')
    .order('name');
  
  if (productId) {
    query = query.eq('product_id', productId);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createProductVariation(variation: Omit<ProductVariation, 'id'>) {
  const { data, error } = await supabase
    .from('product_variations')
    .insert(variation)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateProductVariationStock(id: number, newStock: number) {
  const { data, error } = await supabase
    .from('product_variations')
    .update({ current_stock: newStock })
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Update a product variation
export async function updateProductVariation(id: number, updates: Partial<ProductVariation>) {
  const { data, error } = await supabase
    .from('product_variations')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Delete a product variation
export async function deleteProductVariation(id: number) {
  const { error } = await supabase
    .from('product_variations')
    .delete()
    .eq('id', id);
  if (error) throw error;
  return true;
}

// Sales
export async function getSales(filters?: { startDate?: string; endDate?: string }): Promise<Sale[]> {
  let query = supabase
    .from('sales')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (filters?.startDate) {
    query = query.gte('created_at', filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte('created_at', filters.endDate);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createSale(sale: Omit<Sale, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('sales')
    .insert(sale)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function createSaleItems(items: Omit<SaleItem, 'id'>[]) {
  const { data, error } = await supabase
    .from('sale_items')
    .insert(items)
    .select();
  
  if (error) throw error;
  return data || [];
}

// Shop Settings
export async function getShopSettings(): Promise<ShopSettings | null> {
  const { data, error } = await supabase
    .from('shop_settings')
    .select('*')
    .single();
  
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
  return data;
}

export async function updateShopSettings(settings: Partial<ShopSettings>) {
  const { data, error } = await supabase
    .from('shop_settings')
    .upsert(settings)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Users
export async function getUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('name');
  
  if (error) throw error;
  return data || [];
}

export async function createUser(user: Omit<User, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('users')
    .insert(user)
    .select()
    .single();
  
  if (error) throw error;
  return data;
} 

// Fetch all products with their variations
export async function getAllProductsWithVariations() {
  const { data, error } = await supabase
    .from('products')
    .select(`*, product_variations(*, units(name))`)
    .order('name');
  if (error) throw error;
  return data || [];
} 