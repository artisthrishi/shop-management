'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HomeIcon, CubeIcon, ChartBarIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';

export default function NavigationBar() {
  const pathname = usePathname();
  
  // Hide navigation on login page and sales pages
  if (pathname === '/login' || pathname.startsWith('/sales')) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex justify-around">
        <Link href="/" className="flex flex-col items-center py-2 px-3 text-xs font-medium text-gray-500 hover:text-gray-700">
          <HomeIcon className="h-6 w-6 mb-1" />
          <span>Home</span>
        </Link>
        <Link href="/inventory" className="flex flex-col items-center py-2 px-3 text-xs font-medium text-gray-500 hover:text-gray-700">
          <CubeIcon className="h-6 w-6 mb-1" />
          <span>Inventory</span>
        </Link>
        <Link href="/reports" className="flex flex-col items-center py-2 px-3 text-xs font-medium text-gray-500 hover:text-gray-700">
          <ChartBarIcon className="h-6 w-6 mb-1" />
          <span>Reports</span>
        </Link>
        <Link href="/settings" className="flex flex-col items-center py-2 px-3 text-xs font-medium text-gray-500 hover:text-gray-700">
          <Cog6ToothIcon className="h-6 w-6 mb-1" />
          <span>Settings</span>
        </Link>
      </div>
    </nav>
  );
} 