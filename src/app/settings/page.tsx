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

'use client';

import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { getShopSettings, updateShopSettings, exportShopData, importShopData } from '@/lib/database';
import { supabase } from '@/lib/supabaseClient';
import type { ShopSettings } from '@/types';

export default function SettingsPage() {
  const { t } = useTranslation();
  
  // Real data states
  const [shopSettings, setShopSettings] = useState<ShopSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    shop_name: '',
    contact: '',
    gst_number: '',
    language: 'en'
  });

  // Load shop settings from database
  useEffect(() => {
    const loadShopSettings = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const settings = await getShopSettings();
        
        if (settings) {
          setShopSettings(settings);
          setFormData({
            shop_name: settings.shop_name || '',
            contact: settings.contact || '',
            gst_number: settings.gst_number || '',
            language: settings.language || 'en'
          });
        } else {
          // Set default values if no settings exist
          setFormData({
            shop_name: 'My Shop',
            contact: '',
            gst_number: '',
            language: 'en'
          });
        }
      } catch (error) {
        console.error('Error loading shop settings:', error);
        setError('Failed to load shop settings. Please try again.');
      } finally {
    setLoading(false);
      }
    };

    loadShopSettings();
  }, []);

  // Handle form input changes
  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Save shop settings
  const handleSaveSettings = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate required fields
      if (!formData.shop_name.trim()) {
        setError('Shop name is required');
        setSaving(false);
        return;
      }

      // Check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (!user) {
        setError('You must be logged in to save settings');
        setSaving(false);
        return;
      }

      // Check if user has owner role in the users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (userError || !userData || userData.role !== 'owner') {
        setError('Only shop owners can save settings');
        setSaving(false);
        return;
      }

      // Update shop settings in database
      const updatedSettings = await updateShopSettings({
        shop_name: formData.shop_name.trim(),
        contact: formData.contact.trim(),
        gst_number: formData.gst_number.trim(),
        language: formData.language
      });


      setShopSettings(updatedSettings);
      setSuccess('Settings saved successfully!');
      
      // Immediately update form data with the returned settings
      setFormData({
        shop_name: updatedSettings.shop_name || '',
        contact: updatedSettings.contact || '',
        gst_number: updatedSettings.gst_number || '',
        language: updatedSettings.language || 'en'
      });
      

      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (error) {
      console.error('Error saving shop settings:', error);
      setError('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Export shop data
  const handleExportData = async () => {
    setExporting(true);
    setError(null);
    setSuccess(null);

    try {
      // Check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (!user) {
        setError('You must be logged in to export data');
        setExporting(false);
        return;
      }

      // Check if user has owner role
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (userError || !userData || userData.role !== 'owner') {
        setError('Only shop owners can export data');
        setExporting(false);
        return;
      }

      // Export data
      const exportData = await exportShopData();
      
      // Create and download file
      const fileName = `shop-backup-${new Date().toISOString().split('T')[0]}.json`;
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setSuccess('Data exported successfully!');
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (error) {
      console.error('Error exporting data:', error);
      setError('Failed to export data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // Import shop data
  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setError(null);
    setSuccess(null);

    try {
      // Check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (!user) {
        setError('You must be logged in to import data');
        setImporting(false);
        return;
      }

      // Check if user has owner role
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (userError || !userData || userData.role !== 'owner') {
        setError('Only shop owners can import data');
        setImporting(false);
        return;
      }

      // Read and parse the file
      const text = await file.text();
      let importData;
      
      try {
        importData = JSON.parse(text);
      } catch (parseError) {
        setError('Invalid backup file format. Please select a valid JSON file.');
        setImporting(false);
        return;
      }

      // Validate the import data structure
      if (!importData.timestamp || !importData.products || !importData.product_variations) {
        setError('Invalid backup file. Missing required data.');
        setImporting(false);
        return;
      }

      // Show confirmation dialog
      const confirmed = window.confirm(
        'This will import data from the backup file. Existing data may be overwritten. Do you want to continue?'
      );

      if (!confirmed) {
        setImporting(false);
        return;
      }

      // Import the data
      await importShopData(importData);
      
      setSuccess('Data imported successfully! The page will refresh to show the updated data.');
      
      // Refresh the page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('Error importing data:', error);
      setError(`Failed to import data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setImporting(false);
      // Clear the file input
      event.target.value = '';
    }
  };

  // Loading skeleton component
  const SettingsSkeleton = () => (
    <div className="space-y-4 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
      <div className="h-10 bg-gray-200 rounded"></div>
      <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
      <div className="h-10 bg-gray-200 rounded"></div>
      <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
      <div className="h-10 bg-gray-200 rounded"></div>
    </div>
  );

  // Error state component
  const ErrorState = ({ message }: { message: string }) => (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
      <svg className="w-8 h-8 text-red-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
      <p className="text-red-600 font-medium">{message}</p>
      <button 
        onClick={() => window.location.reload()} 
        className="mt-2 text-red-500 hover:text-red-700 underline"
      >
        Try again
      </button>
    </div>
  );

  // Success notification
  const SuccessNotification = ({ message }: { message: string }) => (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
      <svg className="w-8 h-8 text-green-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className="text-green-600 font-medium">{message}</p>
    </div>
  );

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('settings.title')}</h1>


      </div>

      {/* Error State */}
      {error && <ErrorState message={error} />}

      {/* Success Notification */}
      {success && <SuccessNotification message={success} />}

      {/* Shop Information */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{t('settings.shopInfo')}</h3>
        </div>
        <div className="p-4 space-y-4">
          {/* Owner-only notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-blue-700 text-sm">
                Only shop owners can save settings. Staff members can view but not edit.
              </p>
            </div>
          </div>
          {loading ? (
            <SettingsSkeleton />
          ) : (
            <>
          <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">
                  {t('settings.shopName')} *
            </label>
            <input
              type="text"
                  value={formData.shop_name}
                  onChange={(e) => handleInputChange('shop_name', e.target.value)}
                  disabled={saving}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 placeholder-gray-500"
                  placeholder="Enter shop name"
            />
          </div>
          <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">
              {t('settings.contact')}
            </label>
            <input
              type="tel"
                  value={formData.contact}
                  onChange={(e) => handleInputChange('contact', e.target.value)}
                  disabled={saving}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 placeholder-gray-500"
                  placeholder="+91 0000000000"
            />
          </div>
          <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">
              {t('settings.gstNumber')}
            </label>
            <input
              type="text"
                  value={formData.gst_number}
                  onChange={(e) => handleInputChange('gst_number', e.target.value)}
                  disabled={saving}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 placeholder-gray-500"
                  placeholder="27ABCDE1234F1Z5"
            />
          </div>
              <button 
                onClick={handleSaveSettings}
                disabled={saving || !formData.shop_name.trim()}
                className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <svg className="w-4 h-4 mr-2 inline animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Saving...
                  </>
                ) : (
                  t('common.save')
                )}
          </button>
            </>
          )}
        </div>
      </div>

      {/* Language Settings */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{t('settings.language')}</h3>
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Select your preferred language</p>
              <p className="text-xs text-gray-500 mt-1">Language preference will be saved locally</p>
            </div>
            <LanguageSwitcher />
          </div>
        </div>
      </div>

      {/* Data Backup & Restore */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{t('settings.dataBackup')}</h3>
        </div>
        <div className="p-4 space-y-4">
          {/* Owner-only notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-yellow-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <p className="text-yellow-700 text-sm">
                Only shop owners can export data. This will download all your shop data as a JSON file.
              </p>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button 
              onClick={handleExportData}
              disabled={exporting}
              className="flex-1 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? (
                <>
                  <svg className="w-4 h-4 mr-2 inline animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Exporting...
                </>
              ) : (
                <>
              <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {t('settings.backup')}
                </>
              )}
            </button>
            <label className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
              <input
                type="file"
                accept=".json"
                onChange={handleImportData}
                disabled={importing}
                className="hidden"
              />
              {importing ? (
                <>
                  <svg className="w-4 h-4 mr-2 inline animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Importing...
                </>
              ) : (
                <>
              <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              {t('settings.restore')}
                </>
              )}
            </label>
          </div>
          <p className="text-xs text-gray-500">
            Backup your data as JSON file. Restore from a previously saved backup file.
          </p>
        </div>
      </div>

      {/* App Info */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">App Information</h3>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Version</span>
            <span className="text-sm font-medium text-gray-900">1.0.0</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Build</span>
            <span className="text-sm font-medium text-gray-900">2024.1.1</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Last Updated</span>
            <span className="text-sm font-medium text-gray-900">January 2024</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Platform</span>
            <span className="text-sm font-medium text-gray-900">PWA (Progressive Web App)</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Offline Support</span>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span className="text-sm font-medium text-gray-900">Available</span>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Languages</span>
            <span className="text-sm font-medium text-gray-900">English, Hindi, Marathi</span>
          </div>
        </div>
      </div>


    </div>
  );
} 