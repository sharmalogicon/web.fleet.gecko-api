'use client';

import { Building2 } from 'lucide-react';
import { useBranchContext } from '@/lib/api/platform/branches';
import { useT } from '@/i18n/I18nContext';

/** The branch the user is working at. One branch → shown as text; several → a select. */
export function BranchSwitcher() {
  const { t } = useT();
  const { branches, current, setCurrent, isLoading } = useBranchContext();

  if (isLoading) return null;
  if (!current) {
    return <span className="text-sm text-gray-400">{t('branch.none')}</span>;
  }

  return (
    <label className="flex items-center gap-2 text-sm text-gray-700">
      <Building2 size={16} className="text-gray-500" />
      <span className="sr-only">{t('branch.label')}</span>
      {branches.length === 1 ? (
        <span className="font-medium" title={current.displayName}>{current.branchCode}</span>
      ) : (
        <select
          value={current.branchId}
          onChange={(e) => setCurrent(e.target.value)}
          aria-label={t('branch.choose')}
          className="h-9 pl-2 pr-8 rounded-lg border border-gray-300 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {branches.map((b) => (
            <option key={b.branchId} value={b.branchId}>
              {b.branchCode} · {b.displayName}
            </option>
          ))}
        </select>
      )}
    </label>
  );
}
