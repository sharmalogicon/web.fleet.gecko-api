'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

function formatSegment(segment: string): string {
  return segment
    .replace(/-/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

export function Breadcrumbs() {
  const pathname = usePathname();

  const segments = pathname
    .split('/')
    .filter((s) => s && !s.startsWith('('));

  if (segments.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Home size={16} />
        <span className="font-medium text-gray-900">Dashboard</span>
      </div>
    );
  }

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center gap-2 text-sm">
        <li>
          <Link href="/dashboard" className="text-gray-500 hover:text-gray-700 transition-colors">
            <Home size={16} />
          </Link>
        </li>
        {segments.map((segment, index) => {
          const href = '/' + segments.slice(0, index + 1).join('/');
          const isLast = index === segments.length - 1;
          const label = formatSegment(segment);

          return (
            <li key={href} className="flex items-center gap-2">
              <ChevronRight size={14} className="text-gray-400" />
              {isLast ? (
                <span className="font-medium text-gray-900">{label}</span>
              ) : (
                <Link
                  href={href}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
