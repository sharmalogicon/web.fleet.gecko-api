'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiGet, apiSend, query } from '@/lib/api/client';
import type { components } from '@/lib/api/fleet.schema';
import { useAuth } from '@/lib/contexts/AuthContext';

/**
 * Insurance claims (prompt 14 §D). Status DRAFT → SUBMITTED → APPROVED / REJECTED → SETTLED; CANCELLED; REVISED.
 * Totals are the API's (read-only); discount and VAT % are keyed. Lines copied from the accident's WOs keep their
 * `source` + `sourceLineId` when sent back (else 400 / they become MANUAL).
 */

type S = components['schemas'];
export type InsuranceClaimDto = S['InsuranceClaimDto'];
export type InsuranceClaimLineDto = S['InsuranceClaimLineDto'];
export type SaveInsuranceClaimRequest = S['SaveInsuranceClaimRequest'];
export type InsuranceClaimLineInput = S['InsuranceClaimLineInput'];

const BASE = '/api/fleet/insurance-claims';
export const CLAIM_STATUSES = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'SETTLED', 'CANCELLED', 'REVISED'] as const;
export const LINE_KINDS = ['LABOR', 'PART', 'SUBLET', 'OTHER'] as const;
export const CLAIM_STATUS_TONE: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  SETTLED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-red-50 text-red-500',
  REVISED: 'bg-gray-100 text-gray-500',
};

const text = (v: string | null | undefined): string | null => {
  const s = v?.trim();
  return s ? s : null;
};
const num = (v: number | string | null | undefined): number => (v === null || v === undefined || v === '' ? 0 : Number(v));

// ── form ────────────────────────────────────────────────────────────────────
const lineSchema = z.object({
  lineKind: z.enum(LINE_KINDS),
  description: z.string().trim().min(1, 'claim.rule.lineDescription').max(500),
  qty: z.coerce.number().gt(0, 'claim.rule.qty'),
  unitPrice: z.coerce.number().min(0, 'claim.rule.price'),
  itemId: z.string().optional(),
  itemCode: z.string().optional(),
  source: z.string(),
  sourceLineId: z.string().optional(),
  workOrderNo: z.string().optional(),
  approvedAmount: z.number().optional(),
  remarks: z.string().max(500).optional(),
});
export type ClaimLineValues = z.infer<typeof lineSchema>;

/** The screen's field names (old mock type) + accidentId + editable lines. */
export const claimFormSchema = z.object({
  documentNo: z.string().optional(),
  documentDate: z.string().optional(),
  accidentRefNo: z.string().trim().min(1, 'claim.rule.accident'),
  accidentId: z.string().min(1, 'claim.rule.accident'),
  claimRefNo: z.string().max(60).optional(),
  vendorName: z.string().max(200).optional(),
  policyNo: z.string().max(60).optional(),
  contactPerson: z.string().max(120).optional(),
  claimBy: z.string().max(120).optional(),
  discountAmount: z.coerce.number().min(0, 'claim.rule.discount'),
  vat: z.coerce.number().min(0, 'claim.rule.vat').max(100, 'claim.rule.vat'),
  remarks: z.string().max(1000).optional(),
  lines: z.array(lineSchema),
});
export type ClaimFormValues = z.infer<typeof claimFormSchema>;

export const NEW_LINE: ClaimLineValues = { lineKind: 'PART', description: '', qty: 1, unitPrice: 0, source: 'MANUAL' };

export const NEW_CLAIM_FORM: ClaimFormValues = {
  documentNo: '', documentDate: new Date().toISOString().slice(0, 10), accidentRefNo: '', accidentId: '', claimRefNo: '', vendorName: '',
  policyNo: '', contactPerson: '', claimBy: '', discountAmount: 0, vat: 7, remarks: '', lines: [],
};

export function lineToValues(l: InsuranceClaimLineDto): ClaimLineValues {
  return {
    lineKind: (LINE_KINDS as readonly string[]).includes(l.lineKind) ? (l.lineKind as ClaimLineValues['lineKind']) : 'OTHER',
    description: l.description,
    qty: num(l.qty),
    unitPrice: num(l.unitPrice),
    itemId: l.itemId ?? undefined,
    itemCode: l.itemCode ?? undefined,
    source: l.source,
    sourceLineId: l.sourceLineId ?? undefined,
    workOrderNo: l.workOrderNo ?? undefined,
    approvedAmount: l.approvedAmount === null || l.approvedAmount === undefined ? undefined : num(l.approvedAmount),
    remarks: l.remarks ?? '',
  };
}

export function toFormValues(d: InsuranceClaimDto): ClaimFormValues {
  return {
    documentNo: d.documentNo,
    documentDate: d.documentDate?.slice(0, 10),
    accidentRefNo: d.accidentNo,
    accidentId: d.accidentId,
    claimRefNo: d.insurerClaimNo ?? '',
    vendorName: d.insurerName ?? '',
    policyNo: d.policyNo ?? '',
    contactPerson: d.contactPerson ?? '',
    claimBy: d.claimedByName ?? '',
    discountAmount: num(d.discountAmount),
    vat: num(d.taxRate),
    remarks: d.remarks ?? '',
    lines: [...d.lines].sort((a, b) => num(a.lineNo) - num(b.lineNo)).map(lineToValues),
  };
}

/** A WO-sourced line goes back with its source + sourceLineId unchanged; a keyed line is MANUAL. */
export function toLineInput(l: ClaimLineValues): InsuranceClaimLineInput {
  const fromWo = l.source !== 'MANUAL' && !!l.sourceLineId;
  return {
    lineKind: l.lineKind,
    description: l.description.trim(),
    qty: l.qty,
    unitPrice: l.unitPrice,
    source: fromWo ? l.source : 'MANUAL',
    sourceLineId: fromWo ? l.sourceLineId ?? null : null,
    itemId: text(l.itemId),
    remarks: text(l.remarks),
  };
}

/**
 * The whole request. Totals are never sent (the API computes them). The insurer is the free name unless the claim
 * already carries a party code (kept as read). `linesChanged` false → `lines: null` (unchanged).
 */
export function toRequest(v: ClaimFormValues, current?: InsuranceClaimDto, linesChanged = true): SaveInsuranceClaimRequest {
  return {
    accidentId: current?.accidentId ?? v.accidentId,
    insurerPartyCode: current?.insurerPartyCode ?? null,
    insurerName: text(v.vendorName),
    policyNo: text(v.policyNo),
    insurerClaimNo: text(v.claimRefNo),
    contactPerson: text(v.contactPerson),
    claimedByName: text(v.claimBy),
    documentDate: text(v.documentDate),
    discountAmount: v.discountAmount,
    taxRate: v.vat,
    remarks: text(v.remarks),
    lines: current && !linesChanged ? null : v.lines.map(toLineInput),
    rowVersion: current?.rowVersion ?? null,
  };
}

/** The read-only summary as the API computes it, previewed while lines / discount / VAT are being edited. */
export function claimTotals(v: Pick<ClaimFormValues, 'lines' | 'discountAmount' | 'vat'>) {
  const round = (x: number) => Math.round(x * 100) / 100;
  const subtotal = round(v.lines.reduce((s, l) => s + num(l.qty) * num(l.unitPrice), 0));
  const discount = round(num(v.discountAmount));
  const tax = round(((subtotal - discount) * num(v.vat)) / 100);
  return { subtotal, discount, tax, total: round(subtotal - discount + tax) };
}

export const CLAIM_API_TO_FORM = {
  accidentid: 'accidentRefNo', insurername: 'vendorName', insurerpartycode: 'vendorName', policyno: 'policyNo', insurerclaimno: 'claimRefNo',
  contactperson: 'contactPerson', claimedbyname: 'claimBy', documentdate: 'documentDate', discountamount: 'discountAmount', taxrate: 'vat',
  remarks: 'remarks', lines: 'lines',
} as const;

export function claimActions(d: InsuranceClaimDto | undefined, can: { manage: boolean; approve: boolean }) {
  const s = d?.status ?? 'NEW';
  return {
    save: (s === 'NEW' || s === 'DRAFT') && can.manage,
    copyFromWos: s === 'DRAFT' && can.manage,
    submit: s === 'DRAFT' && can.manage,
    decision: s === 'SUBMITTED' && can.approve,
    settle: s === 'APPROVED' && can.approve,
    revise: (s === 'SUBMITTED' || s === 'APPROVED' || s === 'REJECTED') && can.manage,
    cancel: (s === 'DRAFT' || s === 'SUBMITTED') && can.manage,
  };
}

/** A row for the existing list cells (old field names). */
export interface ClaimRow {
  claimID: string;
  documentNo: string;
  documentDate: string;
  accidentRefNo: string;
  claimRefNo?: string;
  equipmentCode: string;
  driverName?: string;
  nettAmount: number;
  vendorName?: string;
  status: string;
}

export function toRow(d: InsuranceClaimDto): ClaimRow {
  return {
    claimID: d.insuranceClaimId,
    documentNo: d.documentNo,
    documentDate: d.documentDate,
    accidentRefNo: d.accidentNo,
    claimRefNo: d.insurerClaimNo ?? undefined,
    equipmentCode: d.assetCode,
    driverName: d.driverName ?? d.driverCode ?? undefined,
    nettAmount: num(d.totalAmount),
    vendorName: d.insurerName ?? d.insurerPartyCode ?? undefined,
    status: d.status,
  };
}

// ── calls + hooks ───────────────────────────────────────────────────────────
export interface ClaimCriteria {
  search?: string;
  status?: string;
  accidentId?: string;
}

const keys = {
  all: (tenant?: string) => ['fleet', 'insurance-claims', tenant] as const,
  list: (tenant: string | undefined, c: object) => ['fleet', 'insurance-claims', tenant, 'list', c] as const,
  one: (tenant: string | undefined, id: string) => ['fleet', 'insurance-claims', tenant, 'one', id] as const,
};

function useTenant() {
  return useAuth().user?.tenantId;
}

export function useInsuranceClaims(c: ClaimCriteria) {
  const tenant = useTenant();
  return useQuery({
    queryKey: keys.list(tenant, c),
    queryFn: async () => (await apiGet<S['PagedResultOfInsuranceClaimDto']>(`${BASE}${query({ ...c, page: 1, pageSize: 200 })}`)).items,
    placeholderData: keepPreviousData,
  });
}

export function useInsuranceClaim(id: string | null) {
  const tenant = useTenant();
  return useQuery({ queryKey: keys.one(tenant, id ?? ''), queryFn: () => apiGet<InsuranceClaimDto>(`${BASE}/${id}`), enabled: !!id });
}

function useClaimMutation<V, R>(fn: (v: V) => Promise<R>) {
  const client = useQueryClient();
  const tenant = useTenant();
  return useMutation({
    mutationFn: fn,
    onSettled: () => {
      client.invalidateQueries({ queryKey: keys.all(tenant) });
      client.invalidateQueries({ queryKey: ['fleet', 'accidents', tenant] });
    },
  });
}

export function useSaveInsuranceClaim() {
  return useClaimMutation(({ values, current, linesChanged }: { values: ClaimFormValues; current?: InsuranceClaimDto; linesChanged?: boolean }) =>
    current
      ? apiSend<InsuranceClaimDto>('PUT', `${BASE}/${current.insuranceClaimId}`, toRequest(values, current, linesChanged ?? true))
      : apiSend<InsuranceClaimDto>('POST', BASE, toRequest(values)));
}

/**
 * submit · cancel { reason } · decision { decision, approvedAmount, deductibleAmount, insurerClaimNo, reason } ·
 * settle { settledAmount, settledAt, settlementRef } · revise { reason } (→ the NEW draft) · lines/from-work-orders.
 */
export function useInsuranceClaimAction() {
  return useClaimMutation(({ id, action, body }: { id: string; action: string; body: unknown }) =>
    apiSend<InsuranceClaimDto>('POST', `${BASE}/${id}/${action}`, body));
}
