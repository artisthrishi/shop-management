// ============================================================================
// Context: Shop Manager MVP - Home (Sales/Cart) Page
// ============================================================================
'use client';

import { useTranslation } from 'react-i18next';

export default function HomePage() {
  const { t } = useTranslation();

  return (
    <main className="p-4">
      <h1 className="text-2xl font-bold mb-4">{t('nav.home')}</h1>
      <p className="text-gray-600">{t('home.welcome', 'Welcome to your shop sales page!')}</p>
      {/* Add sales/cart UI here */}
    </main>
  );
} 