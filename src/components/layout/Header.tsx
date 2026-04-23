'use client';

import { Search, Bell } from 'lucide-react';
import { Breadcrumbs } from './Breadcrumbs';

export function Header() {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200 h-16 flex items-center px-6 shrink-0">
      <div className="flex items-center justify-between w-full">
        <Breadcrumbs />

        <div className="flex items-center gap-3">
          {/* Search */}
          <button className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
            <Search size={16} />
            <span className="hidden md:inline">Search</span>
            <kbd className="hidden md:inline-block px-1.5 py-0.5 text-xs bg-white border border-gray-300 rounded">
              Ctrl+K
            </kbd>
          </button>

          {/* Notifications */}
          <button
            className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Notifications"
          >
            <Bell size={20} className="text-gray-600" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error-500 rounded-full" />
          </button>
        </div>
      </div>
    </header>
  );
}
