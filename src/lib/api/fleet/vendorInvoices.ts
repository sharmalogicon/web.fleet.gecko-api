'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiFile, apiGet, apiSend, query } from '@/lib/api/client';
import type { components } from '@/lib/api/fleet.schema';
import { useAuth } from '@/lib/contexts/AuthContext';

/**
 * Vendor billing (AP-lite, prompt 15): unbilled source lines, vendor invoices (3-way match, approval of
 * exceptions, WHT), payments recorded on invoices, export to accounting. The API computes every total.
 */

type S = components['schemas'];
export type UnbilledLineDto = S['UnbilledLineDto'];
export type VendorInvoiceDto = S['VendorInvoiceDto'];
export type VendorInvoiceLineDto = S['VendorInvoiceLineDto'];
export type SaveVendorInvoiceRequest = S['SaveVendorInvoiceRequest'];
export type VendorInvoiceLineInput = S['VendorInvoiceLineInput'];
export type VendorPaymentDto = S['VendorPaymentDto'];
export type ApExportBatchDto = S['ApExportBatchDto'];
export type ApExportDocumentDto = S['ApExportDocumentDto'];

const BASE = '/api/fleet/vendor-invoices';
export const INVOICE_STATUSES = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'EXPORTED', 'PAID', 'CANCELLED'] as const;
export const UNBILLED_SOURCES = ['GRN_LINE', 'WO_SUBLET', 'TYRE_EVENT'] as const;
/** Thai withholding tax on services (owner: the screen's tick = 3 %). */
export const WHT_RATE = 3;

export const INVOICE_STATUS_TONE: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  EXPORTED: 'bg-indigo-100 text-indigo-700',
  PAID: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-600',
};

const num = (v: number | string | null | undefined): number => (v === null || v === undefined || v === '' ? 0 : Number(v));
const optn = (v: number | string | null | undefined): number | undefined => (v === null || v === undefined || v === '' ? undefined : Number(v));
const text = (v: string | null | undefined): string | null => {
  const s = v?.trim();
  return s ? s : null;
};
const r2 = (x: number) => Math.round(x * 100) / 100;

// ── A. unbilled ─────────────────────────────────────────────────────────────
/** One screen row: a GRN (its lines summed), or one sublet / tyre event. */
export interface UnbilledRow {
  key: string;
  source: string;
  grNo: string;
  orderDate: string;
  poNo?: string;
  vendorName: string;
  vendorCode: string;
  vendorDoNo?: string;
  vendorInvoiceRef?: string;
  billingCustomer?: string;
  branchId: string;
  workOrderNo?: string;
  totalAmount: number;
  vatAmount: number;
  nettAmount: number;
  lines: UnbilledLineDto[];
}

export const unbilledKey = (l: Pick<UnbilledLineDto, 'source' | 'sourceDocId' | 'sourceLineId'>) =>
  l.source === 'GRN_LINE' ? `GRN:${l.sourceDocId}` : `${l.source}:${l.sourceLineId}`;

export function groupUnbilled(lines: UnbilledLineDto[]): UnbilledRow[] {
  const rows = new Map<string, UnbilledRow>();
  for (const l of lines) {
    const key = unbilledKey(l);
    let row = rows.get(key);
    if (!row) {
      row = {
        key, source: l.source, grNo: l.sourceDocNo, orderDate: l.documentDate, poNo: l.purchaseOrderNo ?? undefined,
        vendorName: l.supplierName || l.supplierPartyCode, vendorCode: l.supplierPartyCode, vendorDoNo: l.deliveryNoteNo ?? undefined,
        vendorInvoiceRef: l.supplierInvoiceNo ?? undefined, branchId: l.branchId, workOrderNo: l.workOrderNo ?? undefined,
        totalAmount: 0, vatAmount: 0, nettAmount: 0, lines: [],
      };
      rows.set(key, row);
    }
    const amount = num(l.amount);
    const vat = (amount * num(l.taxRate)) / 100;
    row.totalAmount = r2(row.totalAmount + amount);
    row.vatAmount = r2(row.vatAmount + vat);
    row.nettAmount = r2(row.totalAmount + row.vatAmount);
    row.lines.push(l);
  }
  return [...rows.values()].sort((a, b) => b.orderDate.localeCompare(a.orderDate) || a.grNo.localeCompare(b.grNo));
}

// ── B. invoice form ─────────────────────────────────────────────────────────
const lineSchema = z.object({
  source: z.string(),
  sourceLineId: z.string().optional(),
  sourceDocNo: z.string().optional(),
  itemCode: z.string().optional(),
  description: z.string().max(500).optional(),
  uomCode: z.string().optional(),
  assetCode: z.string().optional(),
  registrationNo: z.string().optional(),
  isService: z.boolean().optional(),
  /** Empty = all that is billable. */
  qty: z.preprocess((v) => (v === '' || v === null || v === undefined || (typeof v === 'number' && Number.isNaN(v)) ? undefined : Number(v)), z.number().gt(0, 'vinv.rule.qty').optional()),
  /** Empty = the expected price. */
  unitPrice: z.preprocess((v) => (v === '' || v === null || v === undefined || (typeof v === 'number' && Number.isNaN(v)) ? undefined : Number(v)), z.number().min(0, 'vinv.rule.price').optional()),
  billableQty: z.number().optional(),
  expectedUnitPrice: z.number().optional(),
  expectedAmount: z.number().optional(),
  varianceAmount: z.number().optional(),
  lineAmount: z.number().optional(),
  matchStatus: z.string().optional(),
}).superRefine((l, ctx) => {
  if (l.source === 'MANUAL') {
    if (!l.description?.trim()) ctx.addIssue({ code: 'custom', path: ['description'], message: 'vinv.rule.description' });
    if (l.qty === undefined) ctx.addIssue({ code: 'custom', path: ['qty'], message: 'vinv.rule.qty' });
    if (l.unitPrice === undefined) ctx.addIssue({ code: 'custom', path: ['unitPrice'], message: 'vinv.rule.price' });
  }
});
export type InvoiceLineValues = z.infer<typeof lineSchema>;

/** The screen's field names (old mock type): `customerCode` / `customerName` are the supplier. */
export const invoiceFormSchema = z.object({
  documentNo: z.string().optional(),
  documentDate: z.string().optional(),
  branchId: z.string().min(1, 'vinv.rule.branch'),
  customerCode: z.string().trim().min(1, 'vinv.rule.supplier'),
  customerName: z.string().optional(),
  address: z.string().optional(),
  vendorInvoiceNo: z.string().trim().min(1, 'vinv.rule.vendorInvoiceNo').max(60),
  invoiceDate: z.string().min(1, 'vinv.rule.invoiceDate'),
  dueDate: z.string().optional(),
  creditTerm: z.string().optional(),
  discountType: z.enum(['PERCENT', 'AMOUNT']),
  discount: z.coerce.number().min(0, 'vinv.rule.discount'),
  vat: z.coerce.number().min(0, 'vinv.rule.vat').max(100, 'vinv.rule.vat'),
  isWithholdingTax: z.boolean(),
  remarks: z.string().max(1000).optional(),
  lines: z.array(lineSchema).min(1, 'vinv.rule.lines'),
});
export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

const today = () => new Date().toISOString().slice(0, 10);
export const newInvoiceForm = (branchId = '', supplier = ''): InvoiceFormValues => ({
  documentNo: '', documentDate: today(), branchId, customerCode: supplier, customerName: '', address: '', vendorInvoiceNo: '',
  invoiceDate: today(), dueDate: '', creditTerm: '', discountType: 'AMOUNT', discount: 0, vat: 7, isWithholdingTax: false, remarks: '', lines: [],
});

/** An unbilled line picked into the invoice: qty / price empty (= all billable, at the expected price). */
export function lineFromUnbilled(l: UnbilledLineDto): InvoiceLineValues {
  return {
    source: l.source, sourceLineId: l.sourceLineId, sourceDocNo: l.sourceDocNo, itemCode: l.itemCode ?? undefined, description: l.description,
    uomCode: l.uomCode ?? undefined, assetCode: l.assetCode ?? undefined, isService: l.isService, billableQty: num(l.billableQty),
    expectedUnitPrice: num(l.unitPrice), expectedAmount: num(l.amount),
  };
}

export const NEW_MANUAL_LINE: InvoiceLineValues = { source: 'MANUAL', description: '', qty: 1, unitPrice: 0, isService: true };

export function lineToValues(l: VendorInvoiceLineDto): InvoiceLineValues {
  return {
    source: l.source, sourceLineId: l.sourceLineId ?? undefined, sourceDocNo: l.sourceDocNo ?? undefined, itemCode: l.itemCode ?? undefined,
    description: l.description, uomCode: l.uomCode ?? undefined, assetCode: l.assetCode ?? undefined, registrationNo: l.registrationNo ?? undefined,
    isService: l.isService, qty: num(l.qty), unitPrice: num(l.unitPrice), billableQty: optn(l.expectedQty), expectedUnitPrice: optn(l.expectedUnitPrice),
    expectedAmount: optn(l.expectedAmount), varianceAmount: optn(l.varianceAmount), lineAmount: optn(l.lineAmount), matchStatus: l.matchStatus,
  };
}

export function toFormValues(d: VendorInvoiceDto): InvoiceFormValues {
  return {
    documentNo: d.documentNo,
    documentDate: d.documentDate?.slice(0, 10),
    branchId: d.branchId,
    customerCode: d.supplierPartyCode,
    customerName: d.supplierName ?? '',
    address: d.supplierAddress ?? '',
    vendorInvoiceNo: d.vendorInvoiceNo,
    invoiceDate: d.invoiceDate?.slice(0, 10),
    dueDate: d.dueDate?.slice(0, 10) ?? '',
    creditTerm: d.paymentTermCode ?? '',
    discountType: d.discountType === 'PERCENT' ? 'PERCENT' : 'AMOUNT',
    discount: num(d.discountValue),
    vat: num(d.taxRate),
    isWithholdingTax: num(d.whtRate) > 0,
    remarks: d.remarks ?? '',
    lines: [...d.lines].sort((a, b) => num(a.lineNo) - num(b.lineNo)).map(lineToValues),
  };
}

export function toLineInput(l: InvoiceLineValues): VendorInvoiceLineInput {
  const manual = l.source === 'MANUAL';
  return {
    source: l.source,
    sourceLineId: manual ? null : l.sourceLineId ?? null,
    qty: l.qty ?? null,
    unitPrice: l.unitPrice ?? null,
    description: manual ? text(l.description) : null,
    uomCode: manual ? text(l.uomCode) : null,
    isService: manual ? l.isService ?? true : null,
  };
}

/** WHT tick → 3 %, untick → 0. Totals are never sent. */
export function toRequest(v: InvoiceFormValues, current?: VendorInvoiceDto, submit = false): SaveVendorInvoiceRequest {
  return {
    branchId: current?.branchId ?? v.branchId,
    supplierPartyCode: v.customerCode.trim().toUpperCase(),
    vendorInvoiceNo: v.vendorInvoiceNo.trim(),
    invoiceDate: v.invoiceDate,
    dueDate: text(v.dueDate),
    paymentTermCode: text(v.creditTerm),
    documentDate: text(v.documentDate),
    currencyCode: current?.currencyCode ?? null,
    exchangeRate: current?.exchangeRate ?? 1,
    discountType: v.discountType,
    discountValue: v.discount,
    taxCode: current?.taxCode ?? null,
    taxRate: v.vat,
    whtCode: v.isWithholdingTax ? current?.whtCode ?? null : null,
    whtRate: v.isWithholdingTax ? WHT_RATE : 0,
    remarks: text(v.remarks),
    lines: v.lines.map(toLineInput),
    submit,
    rowVersion: current?.rowVersion ?? null,
  };
}

/** The read-only summary, previewed while editing (the API's figures win once saved). */
export function invoiceTotals(v: Pick<InvoiceFormValues, 'lines' | 'discountType' | 'discount' | 'vat' | 'isWithholdingTax'>) {
  const amountOf = (l: InvoiceLineValues) =>
    (l.qty ?? l.billableQty ?? 0) * (l.unitPrice ?? l.expectedUnitPrice ?? 0);
  const subtotal = r2(v.lines.reduce((s, l) => s + amountOf(l), 0));
  const discount = r2(v.discountType === 'PERCENT' ? (subtotal * num(v.discount)) / 100 : num(v.discount));
  const tax = r2(((subtotal - discount) * num(v.vat)) / 100);
  const total = r2(subtotal - discount + tax);
  const service = v.lines.filter((l) => l.isService).reduce((s, l) => s + amountOf(l), 0);
  const whtBase = r2(subtotal > 0 ? service * (1 - discount / subtotal) : 0);
  const wht = v.isWithholdingTax ? r2((whtBase * WHT_RATE) / 100) : 0;
  return { subtotal, discount, tax, total, whtBase, wht, netPayable: r2(total - wht) };
}

export const INVOICE_API_TO_FORM = {
  supplierpartycode: 'customerCode', vendorinvoiceno: 'vendorInvoiceNo', invoicedate: 'invoiceDate', duedate: 'dueDate',
  paymenttermcode: 'creditTerm', documentdate: 'documentDate', discounttype: 'discountType', discountvalue: 'discount', taxrate: 'vat',
  whtrate: 'isWithholdingTax', remarks: 'remarks', lines: 'lines', branchid: 'branchId',
} as const;

export function invoiceActions(d: VendorInvoiceDto | undefined, can: { manage: boolean; approve: boolean }, userId: string | undefined) {
  const s = d?.status ?? 'NEW';
  const own = !!d && !!userId && d.createdBy === userId;
  const outstanding = num(d?.outstandingAmount);
  return {
    save: (s === 'NEW' || s === 'DRAFT') && can.manage,
    submit: (s === 'NEW' || s === 'DRAFT') && can.manage,
    approve: s === 'PENDING_APPROVAL' && can.approve && !own,
    sendBack: s === 'PENDING_APPROVAL' && can.approve && !own,
    cancel: (s === 'DRAFT' || s === 'PENDING_APPROVAL' || s === 'APPROVED') && num(d?.paidAmount) === 0 && can.manage,
    pay: (s === 'APPROVED' || s === 'EXPORTED') && outstanding > 0 && can.manage,
  };
}

/** A row for the existing list cells (old field names). */
export interface InvoiceRow {
  vendorInvoiceID: string;
  documentNo: string;
  documentDate: string;
  customerName: string;
  vendorInvoiceNo: string;
  creditTerm?: string;
  address?: string;
  nettAmount: number;
  outstandingAmount: number;
  vat: number;
  status: string;
  matchStatus: string;
}

export function toRow(d: VendorInvoiceDto): InvoiceRow {
  return {
    vendorInvoiceID: d.vendorInvoiceId, documentNo: d.documentNo, documentDate: d.invoiceDate ?? d.documentDate,
    customerName: d.supplierName || d.supplierPartyCode, vendorInvoiceNo: d.vendorInvoiceNo, creditTerm: d.paymentTermCode ?? undefined,
    address: d.supplierAddress ?? undefined, nettAmount: num(d.netPayable), outstandingAmount: num(d.outstandingAmount), vat: num(d.taxRate),
    status: d.status, matchStatus: d.matchStatus,
  };
}

// ── D. payments ─────────────────────────────────────────────────────────────
/** A row for the existing payment list cells (old field names). */
export interface PaymentRow {
  paymentID: string;
  receiptNo: string;
  receiptDate: string;
  vendorName: string;
  totalAmount: number;
  documentNo: string;
  vendorInvoiceNo: string;
  vendorInvoiceId: string;
  source: string;
  isReversal: boolean;
  status: string;
  isApproved: boolean;
  approvedOn?: string;
  rejectReason?: string;
  createdBy: string | null;
  dto: VendorPaymentDto;
}

export function toPaymentRow(p: VendorPaymentDto): PaymentRow {
  return {
    paymentID: p.paymentId, receiptNo: p.paymentRef || '—', receiptDate: p.paidAt, vendorName: p.supplierName || p.supplierPartyCode,
    totalAmount: num(p.amount), documentNo: p.documentNo, vendorInvoiceNo: p.vendorInvoiceNo, vendorInvoiceId: p.vendorInvoiceId,
    source: p.source, isReversal: num(p.amount) < 0 || !!p.reversesPaymentId, status: p.status ?? 'APPROVED',
    isApproved: (p.status ?? 'APPROVED') === 'APPROVED', approvedOn: p.decidedAt ?? undefined, rejectReason: p.rejectReason ?? undefined,
    createdBy: p.createdBy ?? null, dto: p,
  };
}

/** Payment rule (the API checks again): positive and not more than what is still owed; a reversal is negative. */
export function paymentError(amount: number, outstanding: number, reversal: boolean): string | null {
  if (!amount || Number.isNaN(amount)) return 'vpay.rule.amount';
  if (reversal) return amount < 0 ? null : 'vpay.rule.reversal';
  if (amount < 0) return 'vpay.rule.amount';
  if (amount > outstanding + 0.005) return 'vpay.rule.tooMuch';
  return null;
}

// ── calls + hooks ───────────────────────────────────────────────────────────
function useTenant() {
  return useAuth().user?.tenantId;
}

const keys = {
  all: (tenant?: string) => ['fleet', 'vendor-invoices', tenant] as const,
  unbilled: (tenant: string | undefined, c: object) => ['fleet', 'vendor-invoices', tenant, 'unbilled', c] as const,
  list: (tenant: string | undefined, c: object) => ['fleet', 'vendor-invoices', tenant, 'list', c] as const,
  one: (tenant: string | undefined, id: string) => ['fleet', 'vendor-invoices', tenant, 'one', id] as const,
  payments: (tenant: string | undefined, c: object) => ['fleet', 'vendor-invoices', tenant, 'payments', c] as const,
  exports: (tenant: string | undefined, c: object) => ['fleet', 'vendor-invoices', tenant, 'exports', c] as const,
};

export interface UnbilledCriteria {
  supplierPartyCode?: string;
  branchId?: string;
  source?: string;
  search?: string;
  from?: string;
  to?: string;
}

export function useUnbilled(c: UnbilledCriteria, enabled = true) {
  const tenant = useTenant();
  return useQuery({
    queryKey: keys.unbilled(tenant, c),
    queryFn: () => apiGet<UnbilledLineDto[]>(`${BASE}/unbilled${query({ ...c })}`),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export interface InvoiceCriteria {
  search?: string;
  supplierPartyCode?: string;
  status?: string;
  matchStatus?: string;
  from?: string;
  to?: string;
}

export function useVendorInvoices(c: InvoiceCriteria, enabled = true) {
  const tenant = useTenant();
  return useQuery({
    queryKey: keys.list(tenant, c),
    queryFn: async () => (await apiGet<S['PagedResultOfVendorInvoiceDto']>(`${BASE}${query({ ...c, page: 1, pageSize: 200 })}`)).items,
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useVendorInvoice(id: string | null) {
  const tenant = useTenant();
  return useQuery({ queryKey: keys.one(tenant, id ?? ''), queryFn: () => apiGet<VendorInvoiceDto>(`${BASE}/${id}`), enabled: !!id });
}

function useInvoiceMutation<V, R>(fn: (v: V) => Promise<R>) {
  const client = useQueryClient();
  const tenant = useTenant();
  return useMutation({
    mutationFn: fn,
    onSettled: () => {
      client.invalidateQueries({ queryKey: keys.all(tenant) });
      client.invalidateQueries({ queryKey: ['fleet', 'vendor-credit-notes', tenant] });
    },
  });
}

export function useSaveVendorInvoice() {
  return useInvoiceMutation(({ values, current, submit }: { values: InvoiceFormValues; current?: VendorInvoiceDto; submit?: boolean }) =>
    current
      ? apiSend<VendorInvoiceDto>('PUT', `${BASE}/${current.vendorInvoiceId}`, toRequest(values, current))
      : apiSend<VendorInvoiceDto>('POST', BASE, toRequest(values, undefined, !!submit)));
}

/** submit · approval { decision, reason } · cancel { reason } · payments { amount, paidAt, paymentRef, remarks, reversesPaymentId }. */
export function useVendorInvoiceAction() {
  return useInvoiceMutation(({ id, action, body }: { id: string; action: string; body: unknown }) =>
    apiSend<VendorInvoiceDto>('POST', `${BASE}/${id}/${action}`, body));
}

export interface PaymentCriteria {
  search?: string;
  supplierPartyCode?: string;
  vendorInvoiceId?: string;
  status?: string;
  from?: string;
  to?: string;
}

export function useVendorPayments(c: PaymentCriteria, enabled = true) {
  const tenant = useTenant();
  return useQuery({
    queryKey: keys.payments(tenant, c),
    queryFn: async () => (await apiGet<S['PagedResultOfVendorPaymentDto']>(`/api/fleet/vendor-payments${query({ ...c, page: 1, pageSize: 200 })}`)).items,
    placeholderData: keepPreviousData,
    enabled,
  });
}

// ── E. export ───────────────────────────────────────────────────────────────
export function usePendingExports(branchId: string | null, enabled: boolean) {
  const tenant = useTenant();
  return useQuery({
    queryKey: keys.exports(tenant, { pending: true, branchId }),
    queryFn: () => apiGet<ApExportDocumentDto[]>(`/api/fleet/ap-exports/pending${query({ branchId: branchId ?? undefined })}`),
    enabled,
  });
}

export function useExportHistory(c: { from?: string; to?: string }, enabled: boolean) {
  const tenant = useTenant();
  return useQuery({
    queryKey: keys.exports(tenant, c),
    queryFn: async () => (await apiGet<S['PagedResultOfApExportBatchDto']>(`/api/fleet/ap-exports${query({ ...c, page: 1, pageSize: 50 })}`)).items,
    enabled,
  });
}

/** `ids` null = all pending of that kind. */
export function useCreateExport() {
  return useInvoiceMutation((b: { invoiceIds: string[] | null; creditNoteIds: string[] | null; branchId?: string | null; target?: string }) =>
    apiSend<ApExportBatchDto>('POST', '/api/fleet/ap-exports', b));
}

export const exportFile = (batchId: string) => apiFile(`/api/fleet/ap-exports/${batchId}/file`);

// ── P12 (prompt 19 §A): payment approval ───────────────────────────────────
export const PAYMENT_STATUSES = ['PENDING_APPROVAL', 'APPROVED', 'REJECTED'] as const;
export const PAYMENT_STATUS_TONE: Record<string, string> = {
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  POSTED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-600',
};

/** The screen's Pending / Approved filter (+ Rejected) → the API's `status` (none = all). */
export function apiPaymentStatus(screen: string | undefined): string | undefined {
  switch (screen) {
    case 'PENDING': case 'PENDING_APPROVAL': return 'PENDING_APPROVAL';
    case 'APPROVED': return 'APPROVED';
    case 'REJECTED': return 'REJECTED';
    default: return undefined;
  }
}

/** Approve / Reject a pending payment: not by the person who keyed it (the API answers 403 too). */
export function paymentActions(p: Pick<VendorPaymentDto, 'status' | 'createdBy'> | undefined, canApprove: boolean, userId: string | undefined) {
  const may = !!p && p.status === 'PENDING_APPROVAL' && canApprove && p.createdBy !== userId;
  return { approve: may, reject: may };
}

export function usePaymentApproval() {
  return useInvoiceMutation(({ paymentId, decision, reason }: { paymentId: string; decision: 'APPROVED' | 'REJECTED'; reason?: string }) =>
    apiSend<VendorPaymentDto>('POST', `/api/fleet/vendor-payments/${paymentId}/approval`, { decision, reason: reason?.trim() || null }));
}
