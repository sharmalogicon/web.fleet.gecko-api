'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Truck } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { NavItem } from '@/components/navigation/NavItem';
import { UserMenu } from '@/components/navigation/UserMenu';
import { useUIStore } from '@/lib/stores/useUIStore';
import { NAVIGATION } from '@/lib/navigation';

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-white border-r border-gray-200",
        "transition-all duration-300 flex flex-col",
        sidebarCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo / Brand */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 h-16 shrink-0">
        <Link href="/dashboard" className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center shrink-0">
            <Truck size={16} className="text-white" />
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <span className="text-base font-bold text-gray-900 block truncate">GECKO</span>
              <span className="text-xs text-gray-500 block truncate">Fleet Management</span>
            </div>
          )}
        </Link>

        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-md hover:bg-gray-100 transition-colors shrink-0"
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <ChevronRight size={16} className="text-gray-500" />
          ) : (
            <ChevronLeft size={16} className="text-gray-500" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 scrollbar-thin">
        {NAVIGATION.map((item) => (
          <NavItem
            key={item.title}
            item={item}
            pathname={pathname}
            collapsed={sidebarCollapsed}
          />
        ))}
      </nav>

      {/* User Menu */}
      <div className="border-t border-gray-200 p-3 shrink-0">
        <UserMenu collapsed={sidebarCollapsed} />
      </div>
    </aside>
  );
}
