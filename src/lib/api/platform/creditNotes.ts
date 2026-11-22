'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiSend, query } from '@/lib/api/client';
import type { components } from '@/lib/api/platform.schema';
import { useAuth } from '@/lib/contexts/AuthContext';

/**
 * WO credit notes (prompt 21) on the Platform Revenue API: one ISSUED invoice, a reason, net amounts per line (never more than is
 * open), numbered at once, never edited — a wrong one is cancelled. Source FLEET.
 */

type S = components['schemas'];
export type CreditNoteDto = S['CreditNoteDto'];
export type CreditableInvoiceDto = S['CreditableInvoiceDto'];
export type CreditableLineDto = S['CreditableLineDto'];
export type IssueCreditNoteRequest = S['IssueCreditNoteRequest'];

const BASE = '/api/revenue/credit-notes';
const num = (v: number | string | null | undefined) => (v === null || v === undefined || v === '' ? 0 : Number(v));

/** API ISSUED / CANCELLED ↔ the screen's ACTIVE / CANCELLED. */
export const viewCnStatus = (s: string): 'ACTIVE' | 'CANCELLED' => (s === 'CANCELLED' ? 'CANCELLED' : 'ACTIVE');
export const apiCnStatus = (screen: string | undefined): string | undefined =>
  screen === 'ACTIVE' ? 'ISSUED' : screen === 'CANCELLED' ? 'CANCELLED' : undefined;

/** A creditable line on the grid: the credit amount defaults to what is still open. */
export interface CreditLineView {
  invoiceLineId: string;
  woNo: string;
  code: string;
  description: string;
  amount: number;
  credited: number;
  remaining: number;
  taxRate: number;
  credit: string;
}

export function toCreditLines(inv: Pick<CreditableInvoiceDto, 'lines'>): CreditLineView[] {
  return [...(inv.lines ?? [])].sort((a, b) => num(a.lineNo) - num(b.lineNo)).map((l) => ({
    invoiceLineId: l.invoiceLineId, woNo: l.orderNo ?? '', code: l.chargeCode ?? '', description: l.chargeName ?? '',
    amount: num(l.amount), credited: num(l.credited), remaining: num(l.remaining), taxRate: num(l.taxRate), credit: String(num(l.remaining)),
  }));
}

/** Per line: '' or a number 0..remaining (0 = skip). An i18n key or null. */
export function creditError(l: Pick<CreditLineView, 'credit' | 'remaining'>): string | null {
  const raw = l.credit.trim();
  if (raw === '') return null;
  const v = Number(raw);
  if (Number.isNaN(v) || v < 0) return 'woCn.rule.amount';
  if (v > l.remaining + 0.005) return 'woCn.rule.overRemaining';
  return null;
}

export const reasonError = (reason: string): string | null => {
  const n = reason.trim().length;
  return n < 3 || n > 500 ? 'woCn.rule.reason' : null;
};

/** The request: only lines with a credit > 0. Throws nothing; the caller checks the rules first. */
export function toIssueRequest(invoiceId: string, lines: CreditLineView[], reason: string, creditNoteDate?: string): IssueCreditNoteRequest {
  return {
    invoiceId,
    reason: reason.trim(),
    lines: lines.filter((l) => Number(l.credit || 0) > 0).map((l) => ({ invoiceLineId: l.invoiceLineId, amount: Number(l.credit) })),
    creditNoteDate: creditNoteDate || null,
    remarks: null,
  } as IssueCreditNoteRequest;
}

/** Nothing to credit (every line 0 / empty) — the API would answer "fully credited" / 400. */
export const nothingToCredit = (lines: CreditLineView[]) => !lines.some((l) => Number(l.credit || 0) > 0);

// ── hooks ───────────────────────────────────────────────────────────────────
function useTenant() {
  return useAuth().user?.tenantId;
}
const key = (tenant?: string, ...rest: unknown[]) => ['revenue', 'credit-notes', tenant, ...rest];

export function useCreditNotes(c: { creditNoteNo?: string; payerPartyCode?: string; status?: string; from?: string; to?: string }) {
  const tenant = useTenant();
  return useQuery({
    queryKey: key(tenant, 'list', c),
    queryFn: async () => (await apiGet<S['PagedResultOfCreditNoteDto']>(`${BASE}${query({ ...c, source: 'FLEET', page: 1, pageSize: 200 })}`)).items,
    placeholderData: keepPreviousData,
  });
}

export function useCreditNote(id: string | null) {
  const tenant = useTenant();
  return useQuery({ queryKey: key(tenant, 'one', id), queryFn: () => apiGet<CreditNoteDto>(`${BASE}/${id}`), enabled: !!id });
}

export function useCreditable(invoiceId: string | null) {
  const tenant = useTenant();
  return useQuery({ queryKey: key(tenant, 'creditable', invoiceId), queryFn: () => apiGet<CreditableInvoiceDto>(`${BASE}/creditable/${invoiceId}`), enabled: !!invoiceId });
}

function useCnMutation<V, R>(fn: (v: V) => Promise<R>) {
  const client = useQueryClient();
  const tenant = useTenant();
  return useMutation({
    mutationFn: fn,
    onSettled: () => {
      client.invalidateQueries({ queryKey: key(tenant) });
      client.invalidateQueries({ queryKey: ['revenue', 'fleet', tenant] });
    },
  });
}

export function useIssueCreditNote() {
  return useCnMutation((r: IssueCreditNoteRequest) => apiSend<CreditNoteDto>('POST', BASE, r));
}

export function useCancelCreditNote() {
  return useCnMutation(({ id, reason, rowVersion }: { id: string; reason: string; rowVersion: string }) =>
    apiSend<CreditNoteDto>('POST', `${BASE}/${id}/cancel`, { reason: reason.trim(), rowVersion }));
}
