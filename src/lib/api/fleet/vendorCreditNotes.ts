'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiGet, apiSend, query } from '@/lib/api/client';
import type { components } from '@/lib/api/fleet.schema';
import { useAuth } from '@/lib/contexts/AuthContext';

/**
 * Vendor credit notes (prompt 15 §C). DRAFT → APPROVED → EXPORTED; CANCELLED. Lines: RTV_LINE (a posted vendor-return
 * line, credited once), INVOICE_LINE (price correction on an invoice line, never more than the line), MANUAL.
 */

type S = components['schemas'];
export type VendorCreditNoteDto = S['VendorCreditNoteDto'];
export type VendorCreditNoteLineDto = S['VendorCreditNoteLineDto'];
export type SaveVendorCreditNoteRequest = S['SaveVendorCreditNoteRequest'];
export type VendorCreditNoteLineInput = S['VendorCreditNoteLineInput'];
export type VendorReturnDto = S['VendorReturnDto'];

const BASE = '/api/fleet/vendor-credit-notes';
export const CN_STATUSES = ['DRAFT', 'APPROVED', 'EXPORTED', 'CANCELLED'] as const;
export const CN_REASONS = ['RETURN', 'PRICE', 'DAMAGE', 'OTHER'] as const;
export const CN_STATUS_TONE: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  APPROVED: 'bg-green-100 text-green-700',
  EXPORTED: 'bg-indigo-100 text-indigo-700',
  CANCELLED: 'bg-red-100 text-red-600',
};

const num = (v: number | string | null | undefined): number => (v === null || v === undefined || v === '' ? 0 : Number(v));
const text = (v: string | null | undefined): string | null => {
  const s = v?.trim();
  return s ? s : null;
};
const r2 = (x: number) => Math.round(x * 100) / 100;
const optNumber = z.preprocess(
  (v) => (v === '' || v === null || v === undefined || (typeof v === 'number' && Number.isNaN(v)) ? undefined : Number(v)),
  z.number().optional(),
);

// ── form ────────────────────────────────────────────────────────────────────
const lineSchema = z.object({
  source: z.enum(['RTV_LINE', 'INVOICE_LINE', 'MANUAL']),
  sourceLineId: z.string().optional(),
  transactionNo: z.string().optional(),
  equipmentCode: z.string().optional(),
  glCode: z.string().max(40).optional(),
  code: z.string().optional(),
  description: z.string().max(500).optional(),
  qty: optNumber,
  unitPrice: optNumber,
  lineAmount: z.number().optional(),
}).superRefine((l, ctx) => {
  if (l.source === 'MANUAL') {
    if (!l.description?.trim()) ctx.addIssue({ code: 'custom', path: ['description'], message: 'vinv.rule.description' });
    if (!l.qty || l.qty <= 0) ctx.addIssue({ code: 'custom', path: ['qty'], message: 'vinv.rule.qty' });
    if (l.unitPrice === undefined || l.unitPrice < 0) ctx.addIssue({ code: 'custom', path: ['unitPrice'], message: 'vinv.rule.price' });
  }
});
export type CnLineValues = z.infer<typeof lineSchema>;

/** The screen's field names: `creditNoteNo` = the supplier's credit note no (ours is `documentNo`, read-only). */
export const cnFormSchema = z.object({
  documentNo: z.string().optional(),
  branchId: z.string().min(1, 'vinv.rule.branch'),
  creditNoteNo: z.string().trim().max(60).optional(),
  creditNoteDate: z.string().min(1, 'vcn.rule.date'),
  vendorCode: z.string().trim().min(1, 'vinv.rule.supplier'),
  vendorName: z.string().optional(),
  creditTerm: z.string().optional(),
  vendorInvoiceId: z.string().optional(),
  vendorInvoiceNo: z.string().optional(),
  vendorReturnId: z.string().optional(),
  vendorReturnNo: z.string().optional(),
  reasonCode: z.string().optional(),
  discountType: z.enum(['PERCENT', 'AMOUNT']),
  discount: z.coerce.number().min(0, 'vinv.rule.discount'),
  taxType: z.string(),
  vat: z.coerce.number().min(0, 'vinv.rule.vat').max(100, 'vinv.rule.vat'),
  remarks: z.string().max(1000).optional(),
  lines: z.array(lineSchema).min(1, 'vinv.rule.lines'),
});
export type CnFormValues = z.infer<typeof cnFormSchema>;

export const newCnForm = (branchId = '', supplier = ''): CnFormValues => ({
  documentNo: '', branchId, creditNoteNo: '', creditNoteDate: new Date().toISOString().slice(0, 10), vendorCode: supplier, vendorName: '',
  creditTerm: '', vendorInvoiceId: '', vendorInvoiceNo: '', vendorReturnId: '', vendorReturnNo: '', reasonCode: 'RETURN',
  discountType: 'AMOUNT', discount: 0, taxType: 'VAT', vat: 7, remarks: '', lines: [],
});

export const NEW_CN_MANUAL_LINE: CnLineValues = { source: 'MANUAL', description: '', qty: 1, unitPrice: 0, glCode: '' };

export function lineToValues(l: VendorCreditNoteLineDto): CnLineValues {
  return {
    source: (['RTV_LINE', 'INVOICE_LINE', 'MANUAL'] as const).find((s) => s === l.source) ?? 'MANUAL',
    sourceLineId: l.sourceLineId ?? undefined,
    transactionNo: l.sourceDocNo ?? undefined,
    equipmentCode: l.assetCode ?? undefined,
    glCode: l.glCode ?? '',
    code: l.itemCode ?? undefined,
    description: l.description,
    qty: num(l.qty),
    unitPrice: num(l.unitPrice),
    lineAmount: num(l.lineAmount),
  };
}

/** A posted return line → RTV_LINE (qty / price empty = the return's). */
export function lineFromReturn(ret: Pick<VendorReturnDto, 'documentNo'>, l: VendorReturnDto['lines'][number]): CnLineValues {
  return {
    source: 'RTV_LINE', sourceLineId: l.vendorReturnLineId, transactionNo: ret.documentNo, code: l.itemCode ?? undefined, description: l.description,
    lineAmount: num(l.creditAmount),
  };
}

export function toFormValues(d: VendorCreditNoteDto): CnFormValues {
  return {
    documentNo: d.documentNo,
    branchId: d.branchId,
    creditNoteNo: d.vendorCreditNoteNo ?? '',
    creditNoteDate: d.creditNoteDate?.slice(0, 10),
    vendorCode: d.supplierPartyCode,
    vendorName: d.supplierName ?? '',
    creditTerm: d.paymentTermCode ?? '',
    vendorInvoiceId: d.vendorInvoiceId ?? '',
    vendorInvoiceNo: d.vendorInvoiceNo ?? '',
    vendorReturnId: d.vendorReturnId ?? '',
    vendorReturnNo: d.vendorReturnNo ?? '',
    reasonCode: d.reasonCode ?? '',
    discountType: d.discountType === 'PERCENT' ? 'PERCENT' : 'AMOUNT',
    discount: num(d.discountValue),
    taxType: num(d.taxRate) > 0 || d.taxCode ? 'VAT' : 'NONE',
    vat: num(d.taxRate),
    remarks: d.remarks ?? '',
    lines: [...d.lines].sort((a, b) => num(a.lineNo) - num(b.lineNo)).map(lineToValues),
  };
}

export function toLineInput(l: CnLineValues): VendorCreditNoteLineInput {
  const manual = l.source === 'MANUAL';
  return {
    source: l.source,
    sourceLineId: manual ? null : l.sourceLineId ?? null,
    qty: l.qty ?? null,
    unitPrice: l.unitPrice ?? null,
    description: manual ? text(l.description) : null,
    glCode: text(l.glCode),
  };
}

/** Tax type NONE → rate 0. Totals are never sent. */
export function toRequest(v: CnFormValues, current?: VendorCreditNoteDto): SaveVendorCreditNoteRequest {
  const vat = v.taxType === 'NONE' ? 0 : v.vat;
  return {
    branchId: current?.branchId ?? v.branchId,
    supplierPartyCode: v.vendorCode.trim().toUpperCase(),
    creditNoteDate: v.creditNoteDate,
    vendorCreditNoteNo: text(v.creditNoteNo),
    vendorInvoiceId: text(v.vendorInvoiceId),
    vendorReturnId: text(v.vendorReturnId),
    reasonCode: text(v.reasonCode),
    paymentTermCode: text(v.creditTerm),
    documentDate: current?.documentDate ?? null,
    currencyCode: current?.currencyCode ?? null,
    exchangeRate: current?.exchangeRate ?? 1,
    discountType: v.discountType,
    discountValue: v.discount,
    taxCode: v.taxType === 'NONE' ? null : current?.taxCode ?? null,
    taxRate: vat,
    remarks: text(v.remarks),
    lines: v.lines.map(toLineInput),
    rowVersion: current?.rowVersion ?? null,
  };
}

export function cnTotals(v: Pick<CnFormValues, 'lines' | 'discountType' | 'discount' | 'vat' | 'taxType'>) {
  const subtotal = r2(v.lines.reduce((s, l) => s + (l.qty !== undefined && l.unitPrice !== undefined ? l.qty * l.unitPrice : l.lineAmount ?? 0), 0));
  const discount = r2(v.discountType === 'PERCENT' ? (subtotal * num(v.discount)) / 100 : num(v.discount));
  const tax = v.taxType === 'NONE' ? 0 : r2(((subtotal - discount) * num(v.vat)) / 100);
  return { subtotal, discount, tax, total: r2(subtotal - discount + tax) };
}

export const CN_API_TO_FORM = {
  supplierpartycode: 'vendorCode', vendorcreditnoteno: 'creditNoteNo', creditnotedate: 'creditNoteDate', vendorinvoiceid: 'vendorInvoiceNo',
  vendorreturnid: 'vendorReturnNo', reasoncode: 'reasonCode', paymenttermcode: 'creditTerm', discountvalue: 'discount', taxrate: 'vat',
  remarks: 'remarks', lines: 'lines', branchid: 'branchId',
} as const;

export function cnActions(d: VendorCreditNoteDto | undefined, can: { manage: boolean; approve: boolean }) {
  const s = d?.status ?? 'NEW';
  return {
    save: (s === 'NEW' || s === 'DRAFT') && can.manage,
    approve: s === 'DRAFT' && can.approve,
    cancel: (s === 'DRAFT' || s === 'APPROVED') && can.manage,
  };
}

export interface CnRow {
  vendorCreditNoteID: string;
  creditNoteNo: string;
  supplierDocNo?: string;
  creditNoteDate: string;
  vendorName: string;
  vendorCode: string;
  nettAmount: number;
  discountType: string;
  discount: number;
  vendorInvoiceNo?: string;
  status: string;
}

export function toRow(d: VendorCreditNoteDto): CnRow {
  return {
    vendorCreditNoteID: d.vendorCreditNoteId, creditNoteNo: d.documentNo, supplierDocNo: d.vendorCreditNoteNo ?? undefined,
    creditNoteDate: d.creditNoteDate, vendorName: d.supplierName || d.supplierPartyCode, vendorCode: d.supplierPartyCode, nettAmount: num(d.totalAmount),
    discountType: d.discountType ?? 'AMOUNT', discount: num(d.discountValue), vendorInvoiceNo: d.vendorInvoiceNo ?? undefined, status: d.status,
  };
}

// ── calls + hooks ───────────────────────────────────────────────────────────
function useTenant() {
  return useAuth().user?.tenantId;
}

const keys = {
  all: (tenant?: string) => ['fleet', 'vendor-credit-notes', tenant] as const,
  list: (tenant: string | undefined, c: object) => ['fleet', 'vendor-credit-notes', tenant, 'list', c] as const,
  one: (tenant: string | undefined, id: string) => ['fleet', 'vendor-credit-notes', tenant, 'one', id] as const,
};

export function useVendorCreditNotes(c: { search?: string; supplierPartyCode?: string; status?: string; vendorInvoiceId?: string; from?: string; to?: string }) {
  const tenant = useTenant();
  return useQuery({
    queryKey: keys.list(tenant, c),
    queryFn: async () => (await apiGet<S['PagedResultOfVendorCreditNoteDto']>(`${BASE}${query({ ...c, page: 1, pageSize: 200 })}`)).items,
    placeholderData: keepPreviousData,
  });
}

export function useVendorCreditNote(id: string | null) {
  const tenant = useTenant();
  return useQuery({ queryKey: keys.one(tenant, id ?? ''), queryFn: () => apiGet<VendorCreditNoteDto>(`${BASE}/${id}`), enabled: !!id });
}

/** Posted vendor returns of a supplier (RTV_LINE picker). */
export function usePostedReturns(supplierPartyCode: string, enabled: boolean) {
  const tenant = useTenant();
  return useQuery({
    queryKey: ['fleet', 'vendor-returns', tenant, 'posted', supplierPartyCode],
    queryFn: async () =>
      (await apiGet<{ items: VendorReturnDto[] }>(`/api/fleet/vendor-returns${query({ supplierPartyCode, status: 'POSTED', page: 1, pageSize: 100 })}`)).items,
    enabled: enabled && !!supplierPartyCode,
  });
}

function useCnMutation<V, R>(fn: (v: V) => Promise<R>) {
  const client = useQueryClient();
  const tenant = useTenant();
  return useMutation({
    mutationFn: fn,
    onSettled: () => {
      client.invalidateQueries({ queryKey: keys.all(tenant) });
      client.invalidateQueries({ queryKey: ['fleet', 'vendor-invoices', tenant] });
    },
  });
}

export function useSaveVendorCreditNote() {
  return useCnMutation(({ values, current }: { values: CnFormValues; current?: VendorCreditNoteDto }) =>
    current
      ? apiSend<VendorCreditNoteDto>('PUT', `${BASE}/${current.vendorCreditNoteId}`, toRequest(values, current))
      : apiSend<VendorCreditNoteDto>('POST', BASE, toRequest(values)));
}

/** approve · cancel { reason }. */
export function useVendorCreditNoteAction() {
  return useCnMutation(({ id, action, body }: { id: string; action: string; body: unknown }) =>
    apiSend<VendorCreditNoteDto>('POST', `${BASE}/${id}/${action}`, body));
}
