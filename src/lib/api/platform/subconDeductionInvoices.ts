'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet, query } from '@/lib/api/client';
import type { components } from '@/lib/api/platform.schema';
import { useAuth } from '@/lib/contexts/AuthContext';

/**
 * SCT tax invoices for subcontractor deductions (prompt 23): one per subcontractor per PAID Trucking statement, issued
 * automatically. Read-only; a wrong one is corrected with a credit note (prompt 21).
 */

type S = components['schemas'];
export type SubconDeductionInvoiceDto = S['SubconDeductionInvoiceDto'];

/** A recharge shows the tax invoice once it is DEDUCTED in mode DEDUCTION. */
export const needsTaxInvoice = (r: { rechargeMode: string; status: string } | undefined) => !!r && r.rechargeMode === 'DEDUCTION' && r.status === 'DEDUCTED';

/** The first invoice naming the recharge (null when none yet: the statement is not PAID). */
export function taxInvoiceFor(items: Pick<SubconDeductionInvoiceDto, 'invoiceId' | 'invoiceNo' | 'settlementNo' | 'settledAt'>[] | undefined) {
  return items?.[0] ?? null;
}

export function useSubconTaxInvoice(rechargeNo: string | null | undefined, enabled: boolean) {
  const tenant = useAuth().user?.tenantId;
  return useQuery({
    queryKey: ['revenue', 'subcon-invoices', tenant, rechargeNo],
    queryFn: async () =>
      taxInvoiceFor((await apiGet<S['PagedResultOfSubconDeductionInvoiceDto']>(`/api/revenue/subcon-deduction-invoices${query({ rechargeNo: rechargeNo ?? undefined, page: 1, pageSize: 1 })}`)).items),
    enabled: enabled && !!rechargeNo,
    retry: false,
  });
}
