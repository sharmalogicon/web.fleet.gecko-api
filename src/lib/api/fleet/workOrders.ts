'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiGet, apiSend, query } from '@/lib/api/client';
import type { components } from '@/lib/api/fleet.schema';
import { useAuth } from '@/lib/contexts/AuthContext';
import { optNum } from '@/lib/utils/zod';
import type { WOStatus } from '@/types/work-order';

/** Work Orders (prompt 09 §B). The API owns the status (moves are actions); lines are sent whole, with ids. */

type S = components['schemas'];
export type WorkOrderDto = S['WorkOrderDto'];
export type SaveWorkOrderRequest = S['SaveWorkOrderRequest'];
export type WoStatusLogDto = S['WoStatusLogDto'];
type ChargeInput = S['ChargeInput'];

const BASE = '/api/fleet/work-orders';
export const WO_TYPES = ['CORRECTIVE', 'BREAKDOWN', 'PM', 'ACCIDENT', 'TYRE', 'INSPECTION', 'CAMPAIGN'] as const;
export const WO_PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const;
export const HOLD_REASONS = ['WAITING_PARTS', 'WAITING_VENDOR', 'WAITING_APPROVAL', 'WAITING_CUSTOMER', 'OTHER'] as const;
export const TASK_STATUSES = ['OPEN', 'DONE', 'DEFERRED'] as const;
export const EDITABLE_STATUSES = ['DRAFT', 'OPEN', 'IN_PROGRESS', 'ON_HOLD'];

const n = (v: number | string | null | undefined): number | undefined =>
  v === null || v === undefined || v === '' ? undefined : Number(v);
const text = (v: string | null | undefined): string | null => {
  const s = v?.trim();
  return s ? s : null;
};
const money = (v: number | string | null | undefined) => n(v) ?? 0;

/** API status → the screen's (+ the small badges). INVOICED = billingStatus BILLED (P5). */
export function viewWoStatus(d: Pick<WorkOrderDto, 'status' | 'billingStatus'>): { status: WOStatus; onHold: boolean; closed: boolean } {
  if (d.billingStatus === 'BILLED') return { status: 'INVOICED', onHold: false, closed: d.status === 'CLOSED' };
  switch (d.status) {
    case 'DRAFT': return { status: 'DRAFT', onHold: false, closed: false };
    case 'OPEN': return { status: 'OPEN', onHold: false, closed: false };
    case 'IN_PROGRESS': return { status: 'IN PROGRESS', onHold: false, closed: false };
    case 'ON_HOLD': return { status: 'IN PROGRESS', onHold: true, closed: false };
    case 'COMPLETED': return { status: 'COMPLETED', onHold: false, closed: false };
    case 'CLOSED': return { status: 'COMPLETED', onHold: false, closed: true };
    default: return { status: 'CANCELLED', onHold: false, closed: false };
  }
}

/** The screen's status filter → API statuses. */
export function apiWoStatuses(screen: string): string[] | undefined {
  switch (screen) {
    case 'DRAFT': return ['DRAFT'];
    case 'OPEN': return ['OPEN'];
    case 'IN PROGRESS': return ['IN_PROGRESS', 'ON_HOLD'];
    case 'COMPLETED': return ['COMPLETED', 'CLOSED'];
    case 'CANCELLED': return ['CANCELLED'];
    default: return undefined;
  }
}

export type WoMove = 'OPEN' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CLOSED' | 'CANCELLED' | 'REOPEN';

/** The moves offered at each status (prompt 09 §B); the API checks them again. */
export function woMoves(d: Pick<WorkOrderDto, 'status' | 'approvalStatus'> | undefined, can: { manage: boolean; close: boolean }): WoMove[] {
  if (!d) return [];
  const m: WoMove[] = [];
  const pending = d.approvalStatus === 'PENDING';
  if (can.manage) {
    if (d.status === 'DRAFT' && !pending) m.push('OPEN');
    if (d.status === 'OPEN') m.push('IN_PROGRESS', 'ON_HOLD');
    if (d.status === 'IN_PROGRESS') m.push('ON_HOLD', 'COMPLETED');
    if (d.status === 'ON_HOLD') m.push('IN_PROGRESS');
    if (EDITABLE_STATUSES.includes(d.status)) m.push('CANCELLED');
  }
  if (can.close && d.status === 'COMPLETED') m.push('CLOSED');
  if (can.close && d.status === 'CLOSED') m.push('REOPEN');
  return m;
}

// ── form ────────────────────────────────────────────────────────────────────
const taskRow = z.object({
  id: z.string().optional(),
  serviceTaskId: z.string().optional(),
  description: z.string().trim().min(1, 'wo.rule.taskDescription').max(300),
  status: z.enum(TASK_STATUSES),
  remarks: z.string().optional(),
});
const partRow = z.object({
  id: z.string().optional(),
  taskSeqNo: optNum,
  itemId: z.string().optional(),
  stockCode: z.string().optional(),
  description: z.string().trim().min(1, 'wo.rule.partDescription').max(300),
  uom: z.string().optional(),
  qty: optNum.refine((v) => v !== undefined && v > 0, 'wo.rule.qty'),
  unitPrice: optNum,
  discount: optNum,
});
const laborRow = z.object({
  id: z.string().optional(),
  taskSeqNo: optNum,
  technicianId: z.string().optional(),
  tradeCode: z.string().optional(),
  chargeCode: z.string().optional(),
  description: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  standardHours: optNum,
  actualHours: optNum,
  discount: optNum,
}).refine((r) => !!r.technicianId || !!r.tradeCode, { path: ['technicianId'], message: 'wo.rule.technicianOrTrade' });

export const woFormSchema = z.object({
  documentNo: z.string().optional(),
  woRequestNo: z.string().optional(),
  orderDate: z.string().optional(),
  priority: z.enum(WO_PRIORITIES),
  equipmentCode: z.string().trim().min(1, 'wo.rule.asset'),
  assetProfileId: z.string().min(1, 'wo.rule.asset'),
  driverName: z.string().optional(),
  driverId: z.string().optional(),
  billingCustomer: z.string().optional(),
  vendorCode: z.string().optional(),
  vendorInvoiceNo: z.string().optional(),
  meterRead: optNum,
  meterOutKm: optNum,
  serviceTypeCategory: z.enum(WO_TYPES),
  vat: optNum.refine((v) => v === undefined || (v >= 0 && v <= 100), 'wo.rule.vat'),
  takesAssetOos: z.boolean(),
  remarks: z.string().optional(),
  tasks: z.array(taskRow),
  parts: z.array(partRow),
  labor: z.array(laborRow),
});
export type WoFormValues = z.infer<typeof woFormSchema>;
export type WoTaskRow = WoFormValues['tasks'][number];
export type WoPartRow = WoFormValues['parts'][number];
export type WoLaborRow = WoFormValues['labor'][number];

export const NEW_WO_FORM: WoFormValues = {
  orderDate: new Date().toISOString().slice(0, 10), priority: 'NORMAL', equipmentCode: '', assetProfileId: '', serviceTypeCategory: 'CORRECTIVE',
  vat: 7, takesAssetOos: false, tasks: [], parts: [], labor: [],
};

/** `2026-11-20T01:30:00Z` → `2026-11-20T08:30` (local) for a datetime-local input, and back. */
export const toLocalInput = (iso: string | null | undefined) => {
  if (!iso) return undefined;
  const d = new Date(iso);
  const pad = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromLocalInput = (v: string | undefined) => (v ? new Date(v).toISOString() : null);

export function toFormValues(d: WorkOrderDto): WoFormValues {
  const tasks = [...d.tasks].sort((a, b) => Number(a.seqNo) - Number(b.seqNo));
  return {
    documentNo: d.documentNo,
    woRequestNo: d.workRequestId ?? undefined,
    orderDate: d.documentDate?.slice(0, 10),
    priority: (WO_PRIORITIES as readonly string[]).includes(d.priority) ? (d.priority as WoFormValues['priority']) : 'NORMAL',
    equipmentCode: d.assetCode,
    assetProfileId: d.assetProfileId,
    driverName: d.driverCode ?? '',
    driverId: d.driverId ?? undefined,
    billingCustomer: d.defaultBillToPartyCode ?? '',
    vendorCode: d.vendorPartyCode ?? '',
    vendorInvoiceNo: d.vendorInvoiceNo ?? '',
    meterRead: n(d.meterInKm),
    meterOutKm: n(d.meterOutKm),
    serviceTypeCategory: (WO_TYPES as readonly string[]).includes(d.woType) ? (d.woType as WoFormValues['serviceTypeCategory']) : 'CORRECTIVE',
    vat: n(d.taxRate),
    takesAssetOos: d.takesAssetOos,
    remarks: d.remarks ?? '',
    tasks: tasks.map((t) => ({
      id: t.woTaskId, serviceTaskId: t.serviceTaskId ?? undefined, description: t.description,
      status: (TASK_STATUSES as readonly string[]).includes(t.status) ? (t.status as WoTaskRow['status']) : 'OPEN', remarks: t.remarks ?? '',
    })),
    parts: d.parts.map((p) => ({
      id: p.woPartId, taskSeqNo: n(p.taskSeqNo), itemId: p.itemId ?? undefined, stockCode: p.itemCode ?? '', description: p.description,
      uom: p.uomCode, qty: n(p.qty), unitPrice: n(p.charge.unitPrice) ?? n(p.unitCost), discount: n(p.charge.discountAmount),
    })),
    labor: d.labor.map((l) => ({
      id: l.woLaborId, taskSeqNo: n(l.taskSeqNo), technicianId: l.technicianId ?? undefined, tradeCode: l.tradeCode,
      chargeCode: l.charge.chargeCode ?? '', description: l.description ?? '', startTime: toLocalInput(l.startAt), endTime: toLocalInput(l.endAt),
      standardHours: n(l.stdHours), actualHours: n(l.hours), discount: n(l.charge.discountAmount),
    })),
  };
}

/** A line's charge: billable (INVOICE to the WO's default bill-to) only when a billing customer is set. */
export function chargeFor(billable: boolean, unitPrice: number | undefined, discount: number | undefined, chargeCode?: string | null): ChargeInput {
  return billable
    ? { isBillable: true, billToPartyCode: null, rechargeMode: 'INVOICE', chargeCode: text(chargeCode), unitPrice: unitPrice ?? null, discountAmount: discount ?? 0 }
    : { isBillable: false, billToPartyCode: null, rechargeMode: null, chargeCode: text(chargeCode), unitPrice: null, discountAmount: 0 };
}

/** VENDOR / MIXED when a vendor is named, else IN_HOUSE (a ROADSIDE / MIXED choice from the request is kept). */
export function repairSiteFor(vendor: string | null, current?: string): string {
  if (vendor) return current === 'VENDOR' || current === 'MIXED' ? current : 'VENDOR';
  return current === 'IN_HOUSE' || current === 'ROADSIDE' ? current : 'IN_HOUSE';
}

/**
 * The whole WO. Lines: every row with its `id` (rows left out are removed); parts / labour point at a task by its
 * 1-based position. Sublets / sundries have no grid: `null` = unchanged. Meter-in / -out hours as read.
 */
export function toRequest(v: WoFormValues, current: WorkOrderDto | undefined, branchId: string | null): SaveWorkOrderRequest {
  const billTo = text(v.billingCustomer)?.toUpperCase() ?? null;
  const vendor = text(v.vendorCode)?.toUpperCase() ?? null;
  const billable = !!billTo;
  const seq = (s: number | undefined) => (s && s >= 1 && s <= v.tasks.length ? Math.round(s) : null);
  return {
    branchId: current?.branchId ?? branchId ?? '',
    assetProfileId: v.assetProfileId,
    woType: v.serviceTypeCategory,
    repairSite: repairSiteFor(vendor, current?.repairSite),
    priority: v.priority,
    documentDate: text(v.orderDate),
    driverId: v.driverId || null,
    defaultBillToPartyCode: billTo,
    vendorPartyCode: vendor,
    vendorInvoiceNo: vendor ? text(v.vendorInvoiceNo) : null,
    meterInKm: v.meterRead ?? null,
    meterInHours: current?.meterInHours ?? null,
    meterOutKm: v.meterOutKm ?? null,
    meterOutHours: current?.meterOutHours ?? null,
    plannedStartAt: current?.plannedStartAt ?? null,
    promisedAt: current?.promisedAt ?? null,
    takesAssetOos: v.takesAssetOos,
    taxRate: v.vat ?? 0,
    remarks: text(v.remarks),
    tasks: v.tasks.map((t) => ({
      id: t.id ?? null, serviceTaskId: t.serviceTaskId || null, pmTaskStateId: current?.tasks.find((x) => x.woTaskId === t.id)?.pmTaskStateId ?? null,
      description: t.description.trim(), complaint: current?.tasks.find((x) => x.woTaskId === t.id)?.complaint ?? null,
      cause: current?.tasks.find((x) => x.woTaskId === t.id)?.cause ?? null, correction: current?.tasks.find((x) => x.woTaskId === t.id)?.correction ?? null,
      status: t.status, remarks: text(t.remarks),
    })),
    parts: v.parts.map((p) => ({
      id: p.id ?? null, taskSeqNo: seq(p.taskSeqNo), itemId: p.itemId || null, description: p.description.trim(),
      qty: p.qty ?? 0, uomCode: text(p.uom)?.toUpperCase() ?? null, source: p.itemId ? 'STOCK' : 'DIRECT_PO',
      // The screen's unit price is the cost (the stock ledger replaces it in P4) and, when billable, the price.
      unitCost: p.unitPrice ?? 0,
      charge: chargeFor(billable, p.unitPrice, p.discount),
    })),
    labor: v.labor.map((l) => ({
      id: l.id ?? null, taskSeqNo: seq(l.taskSeqNo), technicianId: l.technicianId || null, tradeCode: l.technicianId ? null : text(l.tradeCode),
      description: text(l.description), timeBand: current?.labor.find((x) => x.woLaborId === l.id)?.timeBand ?? 'NORMAL',
      startAt: fromLocalInput(l.startTime), endAt: fromLocalInput(l.endTime), hours: l.actualHours ?? null, stdHours: l.standardHours ?? null,
      // Labour price comes from the repair tariff (P5): only the discount and charge code are the screen's.
      charge: chargeFor(billable, undefined, l.discount, l.chargeCode),
    })),
    sublets: null,
    sundries: null,
    rowVersion: current?.rowVersion ?? null,
  };
}

export const WO_API_TO_FORM = {
  assetprofileid: 'equipmentCode', wotype: 'serviceTypeCategory', priority: 'priority', documentdate: 'orderDate', driverid: 'driverName',
  defaultbilltopartycode: 'billingCustomer', vendorpartycode: 'vendorCode', vendorinvoiceno: 'vendorInvoiceNo', meterinkm: 'meterRead',
  meteroutkm: 'meterOutKm', taxrate: 'vat', remarks: 'remarks', tasks: 'tasks', parts: 'parts', labor: 'labor', sublets: 'remarks', sundries: 'remarks',
} as const;

/** Totals for the read-only fields (charge side, as the API computed them). */
export function woTotals(d: WorkOrderDto | undefined) {
  if (!d) return null;
  return {
    parts: money(d.partsPrice), labor: money(d.laborPrice), discount: money(d.discountAmount), tax: money(d.taxAmount),
    grand: money(d.totalPrice), cost: money(d.totalCost), currency: d.currencyCode,
  };
}

// ── calls + hooks ───────────────────────────────────────────────────────────
export interface WoCriteria {
  search?: string;
  status?: string;
  from?: string;
  to?: string;
}

const keys = {
  all: (tenant?: string) => ['fleet', 'work-orders', tenant] as const,
  list: (tenant: string | undefined, c: object) => ['fleet', 'work-orders', tenant, 'list', c] as const,
  one: (tenant: string | undefined, id: string) => ['fleet', 'work-orders', tenant, 'one', id] as const,
  log: (tenant: string | undefined, id: string) => ['fleet', 'work-orders', tenant, 'log', id] as const,
};

function useTenant() {
  return useAuth().user?.tenantId;
}

export function useWorkOrders(c: WoCriteria) {
  const tenant = useTenant();
  return useQuery({
    queryKey: keys.list(tenant, c),
    queryFn: async () => {
      const statuses = apiWoStatuses(c.status ?? 'ALL') ?? [undefined];
      const pages = await Promise.all(statuses.map((status) =>
        apiGet<S['PagedResultOfWorkOrderDto']>(`${BASE}${query({ search: c.search, from: c.from, to: c.to, status, page: 1, pageSize: 200 })}`)));
      const rows = pages.flatMap((p) => p.items);
      const wanted = c.status === 'INVOICED' ? rows.filter((r) => r.billingStatus === 'BILLED') : rows;
      return wanted.sort((a, b) => b.documentDate.localeCompare(a.documentDate) || b.documentNo.localeCompare(a.documentNo));
    },
    placeholderData: keepPreviousData,
  });
}

export function useWorkOrder(id: string | null) {
  const tenant = useTenant();
  return useQuery({ queryKey: keys.one(tenant, id ?? ''), queryFn: () => apiGet<WorkOrderDto>(`${BASE}/${id}`), enabled: !!id });
}

export function useWorkOrderLog(id: string | null) {
  const tenant = useTenant();
  return useQuery({ queryKey: keys.log(tenant, id ?? ''), queryFn: () => apiGet<WoStatusLogDto[]>(`${BASE}/${id}/status-log`), enabled: !!id });
}

function useWoMutation<V, R>(fn: (v: V) => Promise<R>) {
  const client = useQueryClient();
  const tenant = useTenant();
  return useMutation({
    mutationFn: fn,
    onSettled: () => {
      client.invalidateQueries({ queryKey: keys.all(tenant) });
      client.invalidateQueries({ queryKey: ['fleet', 'work-requests', tenant] });
      client.invalidateQueries({ queryKey: ['fleet', 'pm', tenant] });
    },
  });
}

export function useSaveWorkOrder() {
  return useWoMutation(({ values, current, branchId }: { values: WoFormValues; current?: WorkOrderDto; branchId: string | null }) =>
    current
      ? apiSend<WorkOrderDto>('PUT', `${BASE}/${current.workOrderId}`, toRequest(values, current, branchId))
      : apiSend<WorkOrderDto>('POST', BASE, toRequest(values, undefined, branchId)));
}

export function useWorkOrderMove() {
  return useWoMutation(({ id, toStatus, reasonCode, reasonText, rowVersion }: { id: string; toStatus: string; reasonCode?: string | null; reasonText?: string | null; rowVersion: string }) =>
    apiSend<WorkOrderDto>('POST', `${BASE}/${id}/status`, { toStatus, reasonCode: reasonCode ?? null, reasonText: reasonText?.trim() || null, rowVersion }));
}

export function useWorkOrderApproval() {
  return useWoMutation(({ id, decision, reason, rowVersion }: { id: string; decision: 'APPROVED' | 'REJECTED'; reason: string; rowVersion: string }) =>
    apiSend<WorkOrderDto>('POST', `${BASE}/${id}/approval`, { decision, reason: reason.trim() || null, rowVersion }));
}
