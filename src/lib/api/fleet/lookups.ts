'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api/client';
import type { components } from '@/lib/api/fleet.schema';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useT } from '@/i18n/I18nContext';

/** Fixed lists of the incident screens (prompt 14 §A): English + Thai names, codes are the screens' own. */

export type LookupOption = components['schemas']['LookupOption'];
export type LookupKind = 'accident-types' | 'accident-responsibilities' | 'violation-types';

/** The name in the UI language (Thai falls back to English when empty). */
export function lookupLabel(o: Pick<LookupOption, 'name' | 'nameLocal'>, lang: string): string {
  return lang === 'th' && o.nameLocal?.trim() ? o.nameLocal : o.name;
}

export function useLookup(kind: LookupKind) {
  const tenant = useAuth().user?.tenantId;
  const { lang } = useT();
  const q = useQuery({
    queryKey: ['fleet', 'lookups', tenant, kind],
    queryFn: () => apiGet<LookupOption[]>(`/api/fleet/lookups/${kind}`),
    staleTime: Infinity,
  });
  const options = (q.data ?? []).map((o) => ({ value: o.code, label: lookupLabel(o, lang) }));
  /** The label of a code (the code itself while loading or when unknown). */
  const labelOf = (code: string | null | undefined) => (code ? options.find((o) => o.value === code)?.label ?? code : '—');
  return { ...q, options, labelOf };
}
