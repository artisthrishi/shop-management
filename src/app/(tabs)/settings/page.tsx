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
import { useState } from 'react';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { supabase } from '@/lib/supabaseClient';

export default function SettingsPage() {
  const { t } = useTranslation();
  const [shopSettings, setShopSettings] = useState({
    shopName: 'My Shop',
    contact: '+91 98765 43210',
    gstNumber: '27ABCDE1234F1Z5',
  });

  // Add user management logic
  const [users, setUsers] = useState([
    // This should be fetched from Supabase in a real app
    { id: '1', name: 'John Doe', email: 'john@example.com', role: 'owner' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'staff' },
  ]);
  const [newUser, setNewUser] = useState({ name: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Add staff user via RPC
  const handleAddUser = async () => {
    setLoading(true);
    setError('');
    const { data, error } = await supabase.rpc('add_staff_user', {
      staff_email: newUser.email,
      staff_name: newUser.name,
    });
    if (error) {
      setError(error.message);
    } else if (data) {
      setUsers([...users, data]);
      setNewUser({ name: '', email: '' });
    }
    setLoading(false);
  };

  // Delete user via RPC
  const handleDeleteUser = async (userId: string) => {
    setLoading(true);
    setError('');
    const { error } = await supabase.rpc('delete_user', {
      target_user_id: userId,
    });
    if (error) {
      setError(error.message);
    } else {
      setUsers(users.filter(u => u.id !== userId));
    }
    setLoading(false);
  };

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('settings.title')}</h1>
      </div>

      {/* Shop Information */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{t('settings.shopInfo')}</h3>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('settings.shopName')}
            </label>
            <input
              type="text"
              value={shopSettings.shopName}
              onChange={(e) => setShopSettings({ ...shopSettings, shopName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('settings.contact')}
            </label>
            <input
              type="tel"
              value={shopSettings.contact}
              onChange={(e) => setShopSettings({ ...shopSettings, contact: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('settings.gstNumber')}
            </label>
            <input
              type="text"
              value={shopSettings.gstNumber}
              onChange={(e) => setShopSettings({ ...shopSettings, gstNumber: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors">
            {t('common.save')}
          </button>
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
          <div className="flex space-x-3">
            <button className="flex-1 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors">
              <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {t('settings.backup')}
            </button>
            <button className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors">
              <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              {t('settings.restore')}
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Backup your data as JSON or CSV file. Restore from a previously saved backup file.
          </p>
        </div>
      </div>

      {/* User Management */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{t('settings.manageUsers')}</h3>
        </div>
        <div className="p-4 space-y-4">
          {/* List users */}
          <div className="space-y-3">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{user.name}</p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${user.role === 'owner' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>{t(`settings.${user.role}`)}</span>
                  {user.role !== 'owner' && (
                    <button className="text-red-600 hover:text-red-800" onClick={() => handleDeleteUser(user.id)} disabled={loading}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {/* Add user form */}
          <div className="flex flex-col gap-2">
            <input
              type="text"
              placeholder="Name"
              value={newUser.name}
              onChange={e => setNewUser({ ...newUser, name: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            />
            <input
              type="email"
              placeholder="Email"
              value={newUser.email}
              onChange={e => setNewUser({ ...newUser, email: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            />
            <button
              className="w-full px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
              onClick={handleAddUser}
              disabled={loading || !newUser.name || !newUser.email}
            >
              <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              {loading ? 'Adding...' : t('settings.addUser')}
            </button>
            {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
          </div>
        </div>
      </div>

      {/* App Info */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">App Information</h3>
        </div>
        <div className="p-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Version</span>
            <span className="text-sm font-medium text-gray-900">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Build</span>
            <span className="text-sm font-medium text-gray-900">2024.1.1</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Last Updated</span>
            <span className="text-sm font-medium text-gray-900">January 2024</span>
          </div>
        </div>
      </div>
    </div>
  );
} 