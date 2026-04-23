'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { User, Settings, LogOut, ChevronUp, ChevronRight, Languages } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useT } from '@/i18n/I18nContext';

interface UserMenuProps {
  collapsed: boolean;
}

export function UserMenu({ collapsed }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { lang, setLang } = useT();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setLangOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectLang = (l: 'en' | 'th') => {
    setLang(l);
    setLangOpen(false);
    setIsOpen(false);
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors",
          isOpen && "bg-gray-100"
        )}
      >
        <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center shrink-0 text-white text-sm font-bold select-none">
          S
        </div>
        {!collapsed && (
          <>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">Super Admin</p>
              <p className="text-xs text-gray-500 truncate">sa@veera.com</p>
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
            "absolute bottom-full mb-2 bg-white border border-gray-200 rounded-xl shadow-lg py-2 z-50",
            collapsed ? "left-0 w-52" : "left-0 right-0"
          )}
        >
          {/* User info header */}
          <div className="px-4 pb-2 border-b border-gray-100 mb-1">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-primary-600 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0">
                S
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">Super Admin</p>
                <p className="text-xs text-gray-500">User</p>
              </div>
            </div>
          </div>

          <Link
            href="/settings"
            className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            onClick={() => setIsOpen(false)}
          >
            <Settings size={16} className="text-gray-500" />
            Settings
          </Link>

          {/* Select Language with flyout */}
          <div className="relative">
            <button
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              onClick={() => setLangOpen(!langOpen)}
            >
              <Languages size={16} className="text-gray-500" />
              <span className="flex-1 text-left">Select Language</span>
              <ChevronRight size={14} className={cn("text-gray-400 transition-transform", langOpen && "rotate-90")} />
            </button>

            {langOpen && (
              <div className="absolute bottom-0 left-full ml-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-36 z-50">
                <button
                  onClick={() => handleSelectLang('en')}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm",
                    lang === 'en' ? "text-blue-600 font-medium bg-blue-50" : "text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <span className="text-base">🇬🇧</span>
                  English
                  {lang === 'en' && <span className="ml-auto text-blue-600">✓</span>}
                </button>
                <button
                  onClick={() => handleSelectLang('th')}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm",
                    lang === 'th' ? "text-blue-600 font-medium bg-blue-50" : "text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <span className="text-base">🇹🇭</span>
                  ภาษาไทย
                  {lang === 'th' && <span className="ml-auto text-blue-600">✓</span>}
                </button>
              </div>
            )}
          </div>

          <hr className="my-1 border-gray-100" />

          <div className="px-4 py-1.5 text-xs text-gray-400">sa@veera.com</div>

          <hr className="my-1 border-gray-100" />

          <button
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            onClick={() => setIsOpen(false)}
          >
            <LogOut size={16} className="text-gray-500" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
