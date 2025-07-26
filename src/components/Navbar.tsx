// ============================================================================
// Context: Shop Manager MVP - Mobile-first, multilingual, offline-capable PWA
// Navbar component for bottom navigation (Home, Inventory, Reports, Settings)
// ============================================================================

'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { HomeIcon, ArchiveBoxIcon, ChartBarIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';

const navItems = [
  {
    labelKey: 'nav.home',
    href: '/', // Changed from '/home' to '/'
    icon: HomeIcon,
  },
  {
    labelKey: 'nav.inventory',
    href: '/inventory',
    icon: ArchiveBoxIcon,
  },
  {
    labelKey: 'nav.reports',
    href: '/reports',
    icon: ChartBarIcon,
  },
  {
    labelKey: 'nav.settings',
    href: '/settings',
    icon: Cog6ToothIcon,
  },
];

export default function Navbar() {
  const pathname = usePathname();
  const { t } = useTranslation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-md md:hidden">
      <ul className="flex justify-between items-center h-16 px-2">
        {navItems.map(({ labelKey, href, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`flex flex-col items-center justify-center py-2 transition-colors ${
                  active ? 'text-blue-600' : 'text-gray-500'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="h-6 w-6 mb-1" />
                <span className="text-xs font-medium">{t(labelKey)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
} 