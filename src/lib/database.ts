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

// Validation utilities
function validatePositiveNumber(value: any, fieldName: string): number {
  if (typeof value !== 'number' || value <= 0) {
    throw new Error(`${fieldName} must be a positive number`);
  }
  return value;
}

function validateNonNegativeNumber(value: any, fieldName: string): number {
  if (typeof value !== 'number' || value < 0) {
    throw new Error(`${fieldName} must be a non-negative number`);
  }
  return value;
}

function validateString(value: any, fieldName: string, required = true): string | null {
  if (required && (!value || typeof value !== 'string')) {
    throw new Error(`${fieldName} must be a non-empty string`);
  }
  if (!required && value === undefined) {
    return null;
  }
  if (value && typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string`);
  }
  return value ? value.trim() : null;
}

function validatePhoneNumber(phone: string | null): string | null {
  if (!phone) return null;
  
  const cleanPhone = phone.replace(/\s/g, '');
  if (!/^[\d\-\+\(\)]+$/.test(cleanPhone) || cleanPhone.length < 10) {
    throw new Error('Invalid phone number format: must be at least 10 digits');
  }
  return phone.trim();
}

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

// Product search with variations
export async function searchProducts(query: string): Promise<ProductVariation[]> {
  // First, get all product variations with joined data
  const { data, error } = await supabase
    .from('product_variations')
    .select(`
      *,
      products(name, brand, category),
      units(name, fractional, subunit_name, subunit_factor)
    `)
    .order('current_stock', { ascending: false });
  
  if (error) throw error;
  
  // Filter results client-side to include all search criteria
  const filteredData = (data || []).filter(item => {
    const productName = (item as any).products?.name?.toLowerCase() || '';
    const productBrand = (item as any).products?.brand?.toLowerCase() || '';
    const productCategory = (item as any).products?.category?.toLowerCase() || '';
    const variationName = item.name?.toLowerCase() || '';
    const searchTerm = query.toLowerCase();
    
    return productName.includes(searchTerm) || 
           productBrand.includes(searchTerm) || 
           productCategory.includes(searchTerm) || 
           variationName.includes(searchTerm);
  });
  
  // Return top 20 results
  return filteredData.slice(0, 20);
}

// Calculate total inventory value
export async function getTotalInventoryValue(): Promise<number> {
  const { data, error } = await supabase
    .from('product_variations')
    .select('current_stock, purchase_price');
  
  if (error) throw error;
  
  return (data || []).reduce((total, item) => {
    return total + (item.current_stock * item.purchase_price);
  }, 0);
}

// Get low stock products (current_stock <= min_stock)
export async function getLowStockProducts(): Promise<ProductVariation[]> {
  const { data, error } = await supabase
    .from('product_variations')
    .select(`
      *,
      products(name, brand, category),
      units(name, fractional, subunit_name, subunit_factor)
    `)
    .order('current_stock', { ascending: true });
  
  if (error) throw error;
  
  // Filter client-side for items where current_stock <= min_stock
  const lowStockItems = (data || []).filter(item => 
    item.current_stock <= item.min_stock
  );
  
  return lowStockItems.slice(0, 5); // Return top 5 low stock items
}

// Get today's sales
export async function getTodaySales(): Promise<Sale[]> {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
  
  const { data, error } = await supabase
    .from('sales')
    .select('*')
    .gte('created_at', startOfDay.toISOString())
    .lte('created_at', endOfDay.toISOString())
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

// Get this week's sales
export async function getWeekSales(): Promise<Sale[]> {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  
  const { data, error } = await supabase
    .from('sales')
    .select('*')
    .gte('created_at', startOfWeek.toISOString())
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

// Get this month's sales
export async function getMonthSales(): Promise<Sale[]> {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  
  const { data, error } = await supabase
    .from('sales')
    .select('*')
    .gte('created_at', startOfMonth.toISOString())
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

// Get comprehensive inventory statistics
export async function getInventoryStats() {
  const { data, error } = await supabase
    .from('product_variations')
    .select('current_stock, min_stock, purchase_price');
  
  if (error) throw error;
  
  const items = data || [];
  const totalItems = items.length;
  const totalValue = items.reduce((sum, item) => sum + (item.current_stock * item.purchase_price), 0);
  const lowStockCount = items.filter(item => item.current_stock <= item.min_stock).length;
  const outOfStockCount = items.filter(item => item.current_stock === 0).length;
  const averageStock = totalItems > 0 ? items.reduce((sum, item) => sum + item.current_stock, 0) / totalItems : 0;
  
  return {
    totalItems,
    totalValue,
    lowStockCount,
    outOfStockCount,
    averageStock
  };
}

// Get shop settings with defaults
export async function getShopSettingsWithDefaults(): Promise<ShopSettings> {
  const settings = await getShopSettings();
  
  if (settings) {
    return settings;
  }
  
  // Return default settings if none exist
  return {
    id: 1,
    shop_name: 'My Shop',
    gst_number: '',
    contact: '',
    language: 'en'
  };
}

// Get sales with detailed items
export async function getSalesWithItems(filters?: { startDate?: string; endDate?: string }): Promise<any[]> {
  let query = supabase
    .from('sales')
    .select(`
      *,
      sale_items(
        *,
        product_variations(
          *,
          products(name, brand, category),
          units(name)
        )
      )
    `)
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

// Update multiple stock levels at once
export async function updateMultipleStockLevels(updates: { id: number; newStock: number }[]) {
  const { data, error } = await supabase
    .from('product_variations')
    .upsert(
      updates.map(update => ({
        id: update.id,
        current_stock: update.newStock,
        updated_at: new Date().toISOString()
      }))
    )
    .select();
  
  if (error) throw error;
  return data || [];
}

// Get top selling products
export async function getTopSellingProducts(limit = 10) {
  const { data, error } = await supabase
    .from('sale_items')
    .select(`
      quantity,
      product_variations(
        *,
        products(name, brand, category),
        units(name)
      )
    `);
  
  if (error) throw error;
  
  // Group by product variation and sum quantities
  const productSales = (data || []).reduce((acc: any, item: any) => {
    const variationId = item.product_variations.id;
    if (!acc[variationId]) {
      acc[variationId] = {
        ...item.product_variations,
        totalQuantity: 0
      };
    }
    acc[variationId].totalQuantity += item.quantity;
    return acc;
  }, {});
  
  // Convert to array and sort by total quantity
  return Object.values(productSales)
    .sort((a: any, b: any) => b.totalQuantity - a.totalQuantity)
    .slice(0, limit);
}

// Checkout Functions
export async function getCurrentUserId(): Promise<string | null> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user?.id || null;
}

export async function generateInvoiceNumber(): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  
  // Get count of sales for today
  const { count, error } = await supabase
    .from('sales')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', today.toISOString().slice(0, 10) + 'T00:00:00')
    .lt('created_at', today.toISOString().slice(0, 10) + 'T23:59:59');
  
  if (error) throw error;
  
  const sequenceNumber = (count || 0) + 1;
  return `INV-${dateStr}-${sequenceNumber.toString().padStart(3, '0')}`;
}

export async function createSaleWithItems(
  saleData: {
    total_amount: number;
    estimated_profit: number;
    customer_name?: string;
    customer_phone?: string;
    payment_method?: string;
  },
  cartItems: Array<{
    productVariation: ProductVariation;
    quantity: number;
    sellingPrice: number;
  }>
): Promise<{ sale: Sale; saleItems: SaleItem[] }> {
  // Input validation
  if (!saleData || typeof saleData.total_amount !== 'number' || saleData.total_amount <= 0) {
    throw new Error('Invalid sale data: total_amount must be a positive number');
  }
  
  if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
    throw new Error('Invalid cart items: must be a non-empty array');
  }
  
  // Validate cart items
  for (const item of cartItems) {
    if (!item.productVariation || !item.productVariation.id) {
      throw new Error('Invalid cart item: product variation is required');
    }
    if (typeof item.quantity !== 'number' || item.quantity <= 0) {
      throw new Error(`Invalid quantity for product ${item.productVariation.name}: must be positive`);
    }
    if (typeof item.sellingPrice !== 'number' || item.sellingPrice < 0) {
      throw new Error(`Invalid selling price for product ${item.productVariation.name}: must be non-negative`);
    }
  }
  
  // Validate customer phone format if provided
  if (saleData.customer_phone && !/^[\d\s\-\+\(\)]+$/.test(saleData.customer_phone)) {
    throw new Error('Invalid customer phone number format');
  }
  
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }
    
    const invoiceNumber = await generateInvoiceNumber();
    
    // Create sale record
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        user_id: userId,
        total_amount: saleData.total_amount,
        estimated_profit: saleData.estimated_profit,
        invoice_number: invoiceNumber,
        customer_name: saleData.customer_name?.trim() || null,
        customer_phone: saleData.customer_phone?.trim() || null,
        payment_method: saleData.payment_method?.trim() || null,
        customer_contact: (saleData.customer_name || saleData.customer_phone)?.trim() || null
      })
      .select()
      .single();
    
    if (saleError) {
      console.error('Sale creation error:', saleError);
      throw new Error('Failed to create sale record');
    }
    
    if (!sale) {
      throw new Error('Sale creation failed: no data returned');
    }
    
    // Create sale items
    const saleItemsData = cartItems.map(item => ({
      sale_id: sale.id,
      product_variation_id: item.productVariation.id,
      quantity: item.quantity,
      selling_price: item.sellingPrice,
      purchase_price: item.productVariation.purchase_price,
      total: item.quantity * item.sellingPrice
    }));
    
    const { data: saleItems, error: itemsError } = await supabase
      .from('sale_items')
      .insert(saleItemsData)
      .select();
    
    if (itemsError) {
      console.error('Sale items creation error:', itemsError);
      throw new Error('Failed to create sale items');
    }
    
    return { sale, saleItems: saleItems || [] };
  } catch (error) {
    console.error('createSaleWithItems error:', error);
    throw error;
  }
}

export async function validateStockAvailability(
  cartItems: Array<{
    productVariation: ProductVariation;
    quantity: number;
  }>
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];
  
  // Input validation
  if (!cartItems || !Array.isArray(cartItems)) {
    throw new Error('Invalid cart items: must be an array');
  }
  
  if (cartItems.length === 0) {
    return { valid: true, errors: [] };
  }
  
  for (const item of cartItems) {
    // Validate item structure
    if (!item.productVariation) {
      errors.push('Invalid cart item: product variation is missing');
      continue;
    }
    
    if (!item.productVariation.id) {
      errors.push('Invalid cart item: product variation ID is missing');
      continue;
    }
    
    if (typeof item.quantity !== 'number' || item.quantity <= 0) {
      errors.push(`Invalid quantity for ${item.productVariation.name}: must be positive`);
      continue;
    }
    
    if (typeof item.productVariation.current_stock !== 'number' || item.productVariation.current_stock < 0) {
      errors.push(`Invalid stock data for ${item.productVariation.name}: stock cannot be negative`);
      continue;
    }
    
    // Check stock availability
    if (item.quantity > item.productVariation.current_stock) {
      errors.push(
        `${item.productVariation.name} - Insufficient stock. Available: ${item.productVariation.current_stock}, Requested: ${item.quantity}`
      );
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

export async function getSaleWithItems(saleId: string) {
  // Input validation
  if (!saleId || typeof saleId !== 'string') {
    throw new Error('Invalid sale ID: must be a non-empty string');
  }
  
  if (!/^\d+$/.test(saleId)) {
    throw new Error('Invalid sale ID format: must be a numeric string');
  }
  
  try {
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .select('*')
      .eq('id', saleId)
      .single();
    
    if (saleError) {
      console.error('Sale fetch error:', saleError);
      if (saleError.code === 'PGRST116') {
        throw new Error(`Sale with ID ${saleId} not found`);
      }
      throw new Error('Failed to fetch sale data');
    }
    
    if (!sale) {
      throw new Error(`Sale with ID ${saleId} not found`);
    }
    
    const { data: saleItems, error: itemsError } = await supabase
      .from('sale_items')
      .select(`
        *,
        product_variations(
          *,
          products(name, brand, category),
          units(name)
        )
      `)
      .eq('sale_id', saleId);
    
    if (itemsError) {
      console.error('Sale items fetch error:', itemsError);
      throw new Error('Failed to fetch sale items');
    }
    
    return {
      sale,
      saleItems: saleItems || []
    };
  } catch (error) {
    console.error('getSaleWithItems error:', error);
    throw error;
  }
}

export async function updateSalePhone(saleId: number, phoneNumber: string) {
  // Input validation
  if (!saleId || typeof saleId !== 'number' || saleId <= 0) {
    throw new Error('Invalid sale ID: must be a positive number');
  }
  
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    throw new Error('Invalid phone number: must be a non-empty string');
  }
  
  // Validate phone number format (basic validation)
  const cleanPhone = phoneNumber.replace(/\s/g, '');
  if (!/^[\d\-\+\(\)]+$/.test(cleanPhone) || cleanPhone.length < 10) {
    throw new Error('Invalid phone number format: must be at least 10 digits');
  }
  
  try {
    console.log('Updating sale ID:', saleId, 'with phone:', phoneNumber);
    
    // First check if the sale exists
    const { data: existingSale, error: checkError } = await supabase
      .from('sales')
      .select('id')
      .eq('id', saleId)
      .single();
    
    if (checkError) {
      console.error('Sale check error:', checkError);
      if (checkError.code === 'PGRST116') {
        throw new Error(`Sale with ID ${saleId} not found`);
      }
      throw new Error('Failed to check sale existence');
    }
    
    if (!existingSale) {
      throw new Error(`Sale with ID ${saleId} not found`);
    }
    
    console.log('Sale exists, proceeding with update');
    
    const { data, error } = await supabase
      .from('sales')
      .update({ 
        customer_phone: phoneNumber.trim(),
        customer_contact: phoneNumber.trim() // Also update contact field
      })
      .eq('id', saleId)
      .select();
    
    if (error) {
      console.error('Update error:', error);
      throw new Error('Failed to update sale phone number');
    }
    
    // Check if any rows were updated
    if (!data || data.length === 0) {
      throw new Error(`Sale with ID ${saleId} not found during update`);
    }
    
    console.log('Update successful:', data[0]);
    return data[0];
  } catch (error) {
    console.error('updateSalePhone error:', error);
    throw error;
  }
} 