'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { User, Settings, LogOut, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface UserMenuProps {
  collapsed: boolean;
}

export function UserMenu({ collapsed }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors",
          isOpen && "bg-gray-100"
        )}
      >
        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center shrink-0">
          <User size={16} className="text-primary-600" />
        </div>
        {!collapsed && (
          <>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">Admin User</p>
              <p className="text-xs text-gray-500">Fleet Manager</p>
            </div>
            <ChevronUp
              size={16}
              className={cn(
                "text-gray-400 transition-transform shrink-0",
                !isOpen && "rotate-180"
              )}
            />
          </>
        )}
      </button>

      {isOpen && (
        <div
          className={cn(
            "absolute bottom-full mb-2 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50",
            collapsed ? "left-0 w-48" : "left-0 right-0"
          )}
        >
          <Link
            href="/profile"
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            onClick={() => setIsOpen(false)}
          >
            <User size={16} />
            Profile
          </Link>
          <Link
            href="/settings"
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            onClick={() => setIsOpen(false)}
          >
            <Settings size={16} />
            Settings
          </Link>
          <hr className="my-1 border-gray-200" />
          <button
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-error-600 hover:bg-gray-50"
            onClick={() => setIsOpen(false)}
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
