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

// ── list + view on the WO invoice page's "Source" filter (owner-approved proposal 2026-11-22) ──
export type InvoiceSource = 'WO' | 'SUBCON';
export const INVOICE_SOURCES: InvoiceSource[] = ['WO', 'SUBCON'];
/** The URL value → a known source (anything else = WO invoices, the page's default). */
export const toInvoiceSource = (v: string | null | undefined): InvoiceSource => (v === 'SUBCON' ? 'SUBCON' : 'WO');

/** The screen's filters → the list call: receipt no / customer → `search` (receipt no first), dates = Thai days on the paid date. */
export function subconQuery(p: { receiptNo: string; customerName: string; dateFrom: string; dateTo: string }) {
  return { search: p.receiptNo.trim() || p.customerName.trim() || undefined, from: p.dateFrom || undefined, to: p.dateTo || undefined };
}

export function useSubconInvoices(c: { search?: string; from?: string; to?: string }, enabled: boolean) {
  const tenant = useAuth().user?.tenantId;
  return useQuery({
    queryKey: ['revenue', 'subcon-invoices', tenant, 'list', c],
    queryFn: async () => (await apiGet<S['PagedResultOfSubconDeductionInvoiceDto']>(`/api/revenue/subcon-deduction-invoices${query({ ...c, page: 1, pageSize: 200 })}`)).items,
    enabled,
  });
}

export function useSubconInvoice(id: string | null) {
  const tenant = useAuth().user?.tenantId;
  return useQuery({
    queryKey: ['revenue', 'subcon-invoices', tenant, 'one', id],
    queryFn: () => apiGet<SubconDeductionInvoiceDto>(`/api/revenue/subcon-deduction-invoices/${id}`),
    enabled: !!id,
  });
}
