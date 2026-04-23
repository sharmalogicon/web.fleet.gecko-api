'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useT } from '@/i18n/I18nContext';
import type { NavItem as NavItemType } from '@/lib/navigation';

interface NavItemProps {
  item: NavItemType;
  pathname: string;
  collapsed: boolean;
}

export function NavItem({ item, pathname, collapsed }: NavItemProps) {
  const { t } = useT();
  const hasSubItems = item.items && item.items.length > 0;
  const isActive =
    pathname === item.href ||
    (hasSubItems && item.items?.some((sub) => pathname.startsWith(sub.href)));

  const [isOpen, setIsOpen] = useState(isActive ?? false);

  const Icon = item.icon;

  if (hasSubItems) {
    return (
      <div className="mb-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
            "hover:bg-gray-100",
            isActive && "bg-primary-50 text-primary-700"
          )}
        >
          <Icon size={20} className="shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left text-sm font-medium">
                {t(item.titleKey)}
              </span>
              <ChevronRight
                size={16}
                className={cn("transition-transform", isOpen && "rotate-90")}
              />
            </>
          )}
        </button>

        {!collapsed && isOpen && (
          <div className="ml-9 mt-1 space-y-1">
            {item.items?.map((subItem) => (
              <Link
                key={subItem.href}
                href={subItem.href}
                className={cn(
                  "block px-3 py-1.5 text-sm rounded-lg transition-colors",
                  "hover:bg-gray-100 text-gray-600",
                  pathname === subItem.href &&
                    "bg-primary-50 text-primary-700 font-medium"
                )}
              >
                {t(subItem.titleKey)}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={item.href!}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors mb-1",
        "hover:bg-gray-100",
        isActive && "bg-primary-50 text-primary-700"
      )}
    >
      <Icon size={20} className="shrink-0" />
      {!collapsed && (
        <span className="text-sm font-medium">{t(item.titleKey)}</span>
      )}
    </Link>
  );
}
