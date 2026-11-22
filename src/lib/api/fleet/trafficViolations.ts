'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiGet, apiSend, query } from '@/lib/api/client';
import type { components } from '@/lib/api/fleet.schema';
import { useAuth } from '@/lib/contexts/AuthContext';

/**
 * Traffic violations (prompt 14 §E). Status OPEN → PAID → DEDUCTED; DISPUTED; CANCELLED — actions only.
 * Deduction: own driver → payroll line (PAYROLL), subcontractor driver → Trucking statement request (SUBCON).
 */

type S = components['schemas'];
export type TrafficViolationDto = S['TrafficViolationDto'];
export type SaveTrafficViolationRequest = S['SaveTrafficViolationRequest'];
export type PayrollDeductionDto = S['PayrollDeductionDto'];

const BASE = '/api/fleet/traffic-violations';
export const VIOLATION_STATUSES = ['OPEN', 'PAID', 'DEDUCTED', 'DISPUTED', 'CANCELLED'] as const;
export const VIOLATION_STATUS_TONE: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-700',
  PAID: 'bg-green-100 text-green-700',
  DEDUCTED: 'bg-emerald-100 text-emerald-800',
  DISPUTED: 'bg-amber-100 text-amber-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

const text = (v: string | null | undefined): string | null => {
  const s = v?.trim();
  return s ? s : null;
};
const optNumber = z.preprocess(
  (v) => (v === '' || v === null || v === undefined || (typeof v === 'number' && Number.isNaN(v)) ? undefined : Number(v)),
  z.number().optional(),
);

/** `yyyy-MM-ddTHH:mm` (local) for a datetime-local input. */
export function localDateTime(iso?: string | null): string {
  const d = iso ? new Date(iso) : new Date();
  const pad = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ── form ────────────────────────────────────────────────────────────────────
export const violationFormSchema = z.object({
  documentNo: z.string().optional(),
  ticketNo: z.string().trim().min(1, 'violation.rule.ticket').max(60),
  violationDate: z.string().min(1, 'violation.rule.date'),
  equipmentCode: z.string().trim().min(1, 'violation.rule.asset'),
  assetProfileId: z.string().min(1, 'violation.rule.asset'),
  driverName: z.string().optional(),
  driverID: z.string().optional(),
  driverId: z.string().optional(),
  violationType: z.string().min(1, 'violation.rule.type'),
  violationTypeDescription: z.string().max(1000).optional(),
  violationAmount: z.coerce.number({ message: 'violation.rule.amount' }).min(0, 'violation.rule.amount'),
  remarks: z.string().max(1000).optional(),
  issuingAuthority: z.string().max(120).optional(),
  locationText: z.string().max(300).optional(),
  points: optNumber,
  dueDate: z.string().optional(),
});
export type ViolationFormValues = z.infer<typeof violationFormSchema>;

export const NEW_VIOLATION_FORM: ViolationFormValues = {
  documentNo: '', ticketNo: '', violationDate: localDateTime(), equipmentCode: '', assetProfileId: '', driverName: '', driverID: '', driverId: '',
  violationType: 'SPEEDING', violationTypeDescription: '', violationAmount: 0, remarks: '', issuingAuthority: '', locationText: '', dueDate: '',
};

export function toFormValues(d: TrafficViolationDto): ViolationFormValues {
  return {
    documentNo: d.documentNo,
    ticketNo: d.ticketNo,
    violationDate: localDateTime(d.occurredAt),
    equipmentCode: d.assetCode,
    assetProfileId: d.assetProfileId,
    driverName: d.driverName ?? '',
    driverID: d.driverCode ?? '',
    driverId: d.driverId ?? '',
    violationType: d.violationType,
    violationTypeDescription: d.description ?? '',
    violationAmount: Number(d.fineAmount),
    remarks: d.remarks ?? '',
    issuingAuthority: d.issuingAuthority ?? '',
    locationText: d.locationText ?? '',
    points: d.points === null || d.points === undefined ? undefined : Number(d.points),
    dueDate: d.dueDate?.slice(0, 10) ?? '',
  };
}

export function toRequest(v: ViolationFormValues, current?: TrafficViolationDto): SaveTrafficViolationRequest {
  return {
    assetProfileId: v.assetProfileId,
    ticketNo: v.ticketNo.trim(),
    occurredAt: new Date(v.violationDate).toISOString(),
    violationType: v.violationType,
    fineAmount: v.violationAmount,
    driverId: text(v.driverId),
    issuingAuthority: text(v.issuingAuthority),
    locationText: text(v.locationText),
    description: text(v.violationTypeDescription),
    points: v.points === undefined || Number.isNaN(v.points) ? null : v.points,
    dueDate: text(v.dueDate),
    documentDate: current?.documentDate ?? null,
    remarks: text(v.remarks),
    rowVersion: current?.rowVersion ?? null,
  };
}

export const VIOLATION_API_TO_FORM = {
  ticketno: 'ticketNo', occurredat: 'violationDate', assetprofileid: 'equipmentCode', driverid: 'driverID', violationtype: 'violationType',
  description: 'violationTypeDescription', fineamount: 'violationAmount', remarks: 'remarks', issuingauthority: 'issuingAuthority',
  locationtext: 'locationText', points: 'points', duedate: 'dueDate',
} as const;

export function violationActions(d: TrafficViolationDto | undefined, canManage: boolean) {
  const s = d?.status ?? 'NEW';
  return {
    save: (s === 'NEW' || s === 'OPEN' || s === 'DISPUTED') && canManage,
    pay: s === 'OPEN' && canManage,
    /** Only when the company paid and a driver is set. */
    deduct: s === 'PAID' && d?.paidBy === 'COMPANY' && !!d?.driverId && canManage,
    /** 409 once exported to payroll / held by a Trucking statement: the button hides once exported. */
    takeBack: s === 'DEDUCTED' && !d?.payrollExportedAt && canManage,
    refresh: s === 'DEDUCTED' && d?.deductionMode === 'SUBCON' && canManage,
    dispute: s === 'OPEN' && canManage,
    reopen: s === 'DISPUTED' && canManage,
    cancel: (s === 'OPEN' || s === 'DISPUTED') && canManage,
  };
}

/** A row for the existing list cells (old field names). */
export interface ViolationRow {
  violationID: string;
  ticketNo: string;
  documentNo: string;
  violationDate: string;
  equipmentCode: string;
  driverName?: string;
  violationType: string;
  violationTypeDescription?: string;
  violationAmount: number;
  status: string;
}

export function toRow(d: TrafficViolationDto): ViolationRow {
  return {
    violationID: d.trafficViolationId,
    ticketNo: d.ticketNo,
    documentNo: d.documentNo,
    violationDate: d.occurredAt,
    equipmentCode: d.assetCode,
    driverName: d.driverName ?? d.driverCode ?? undefined,
    violationType: d.violationType,
    violationTypeDescription: d.description ?? undefined,
    violationAmount: Number(d.fineAmount),
    status: d.status,
  };
}

/** The "Mark exported" answer as CSV (client-side download). */
export function payrollCsv(rows: PayrollDeductionDto[]): string {
  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = ['documentNo', 'ticketNo', 'occurredAt', 'driverCode', 'driverName', 'assetCode', 'violationType', 'amount', 'currencyCode', 'deductedAt', 'exportedAt'] as const;
  return [head.join(','), ...rows.map((r) => head.map((h) => cell(r[h])).join(','))].join('\r\n');
}

// ── calls + hooks ───────────────────────────────────────────────────────────
export interface ViolationCriteria {
  search?: string;
  violationType?: string;
  status?: string;
  from?: string;
  to?: string;
}

const keys = {
  all: (tenant?: string) => ['fleet', 'traffic-violations', tenant] as const,
  list: (tenant: string | undefined, c: object) => ['fleet', 'traffic-violations', tenant, 'list', c] as const,
  one: (tenant: string | undefined, id: string) => ['fleet', 'traffic-violations', tenant, 'one', id] as const,
  payroll: (tenant: string | undefined) => ['fleet', 'traffic-violations', tenant, 'payroll'] as const,
};

function useTenant() {
  return useAuth().user?.tenantId;
}

export function useTrafficViolations(c: ViolationCriteria) {
  const tenant = useTenant();
  return useQuery({
    queryKey: keys.list(tenant, c),
    queryFn: async () => (await apiGet<S['PagedResultOfTrafficViolationDto']>(`${BASE}${query({ ...c, page: 1, pageSize: 200 })}`)).items,
    placeholderData: keepPreviousData,
  });
}

export function useTrafficViolation(id: string | null) {
  const tenant = useTenant();
  return useQuery({ queryKey: keys.one(tenant, id ?? ''), queryFn: () => apiGet<TrafficViolationDto>(`${BASE}/${id}`), enabled: !!id });
}

/** Deductions not yet exported to payroll. */
export function usePayrollDeductions(enabled: boolean) {
  const tenant = useTenant();
  return useQuery({
    queryKey: keys.payroll(tenant),
    queryFn: () => apiGet<PayrollDeductionDto[]>(`${BASE}/payroll-deductions${query({ exported: false })}`),
    enabled,
  });
}

function useViolationMutation<V, R>(fn: (v: V) => Promise<R>) {
  const client = useQueryClient();
  const tenant = useTenant();
  return useMutation({ mutationFn: fn, onSettled: () => client.invalidateQueries({ queryKey: keys.all(tenant) }) });
}

export function useSaveTrafficViolation() {
  return useViolationMutation(({ values, current }: { values: ViolationFormValues; current?: TrafficViolationDto }) =>
    current
      ? apiSend<TrafficViolationDto>('PUT', `${BASE}/${current.trafficViolationId}`, toRequest(values, current))
      : apiSend<TrafficViolationDto>('POST', BASE, toRequest(values)));
}

/** pay · deduct · deduction/cancel · deduction/refresh · dispute · reopen · cancel. */
export function useTrafficViolationAction() {
  return useViolationMutation(({ id, action, body }: { id: string; action: string; body: unknown }) =>
    apiSend<TrafficViolationDto>('POST', `${BASE}/${id}/${action}`, body));
}

/** Mark exported (`ids` null = all pending) → the rows with `exportedAt`. */
export function useExportPayrollDeductions() {
  return useViolationMutation((ids: string[] | null) => apiSend<PayrollDeductionDto[]>('POST', `${BASE}/payroll-deductions/export`, { ids }));
}
