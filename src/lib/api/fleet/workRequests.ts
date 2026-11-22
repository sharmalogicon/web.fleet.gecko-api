'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiGet, apiSend, query } from '@/lib/api/client';
import type { components } from '@/lib/api/fleet.schema';
import { useAuth } from '@/lib/contexts/AuthContext';
import type { WRStatus } from '@/types/work-request';

/** Work Requests (prompt 09 §A). The API owns the status: actions, never a saved field. */

type S = components['schemas'];
export type WorkRequestDto = S['WorkRequestDto'];
export type SaveWorkRequestRequest = S['SaveWorkRequestRequest'];
export type WorkOrderDto = S['WorkOrderDto'];

const BASE = '/api/fleet/work-requests';
export const PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const;
const OPEN_WO = ['DRAFT', 'OPEN', 'IN_PROGRESS', 'ON_HOLD'];

/** API status → the screen's five (+ flags for the small badges). */
export function viewWrStatus(d: Pick<WorkRequestDto, 'status' | 'workOrderStatus'>): { status: WRStatus; approved: boolean; rejected: boolean } {
  switch (d.status) {
    case 'DRAFT': return { status: 'DRAFT', approved: false, rejected: false };
    case 'SUBMITTED': return { status: 'SUBMITTED', approved: false, rejected: false };
    case 'APPROVED': return { status: 'SUBMITTED', approved: true, rejected: false };
    case 'CONVERTED':
      return { status: d.workOrderStatus && !OPEN_WO.includes(d.workOrderStatus) && d.workOrderStatus !== 'CANCELLED' ? 'COMPLETED' : 'IN PROGRESS', approved: true, rejected: false };
    case 'REJECTED': return { status: 'CANCELLED', approved: false, rejected: true };
    default: return { status: 'CANCELLED', approved: false, rejected: false };
  }
}

/** The screen's status filter → the API's statuses (one or more). */
export function apiWrStatuses(screen: string): string[] | undefined {
  switch (screen) {
    case 'DRAFT': return ['DRAFT'];
    case 'SUBMITTED': return ['SUBMITTED', 'APPROVED'];
    case 'IN PROGRESS':
    case 'COMPLETED': return ['CONVERTED'];
    case 'CANCELLED': return ['REJECTED', 'CANCELLED'];
    default: return undefined;
  }
}

/** What the user may do, from the API status (the API checks again). */
export function wrActions(d: WorkRequestDto | undefined, can: { create: boolean; approve: boolean; convert: boolean }) {
  const s = d?.status ?? 'NEW';
  return {
    save: (s === 'NEW' || s === 'DRAFT' || s === 'SUBMITTED') && can.create,
    submit: (s === 'NEW' || s === 'DRAFT') && can.create,
    approve: s === 'SUBMITTED' && can.approve,
    reject: s === 'SUBMITTED' && can.approve,
    convert: s === 'APPROVED' && can.convert,
    cancel: (s === 'DRAFT' || s === 'SUBMITTED' || s === 'APPROVED') && can.create,
  };
}

export const wrFormSchema = z.object({
  documentNo: z.string().optional(),
  orderDate: z.string().optional(),
  priorityType: z.enum(PRIORITIES),
  equipmentCode: z.string().trim().min(1, 'wr.rule.asset'),
  assetProfileId: z.string().min(1, 'wr.rule.asset'),
  billingCustomerName: z.string().optional(),
  vendorCode: z.string().optional(),
  description: z.string().trim().min(1, 'wr.rule.problem').max(2000),
  remarks: z.string().max(1000).optional(),
});
export type WrFormValues = z.infer<typeof wrFormSchema>;

export const NEW_WR_FORM: WrFormValues = {
  orderDate: new Date().toISOString().slice(0, 10), priorityType: 'NORMAL', equipmentCode: '', assetProfileId: '', description: '',
};

export function toFormValues(d: WorkRequestDto): WrFormValues {
  return {
    documentNo: d.documentNo,
    orderDate: d.documentDate?.slice(0, 10),
    priorityType: (PRIORITIES as readonly string[]).includes(d.priority) ? (d.priority as WrFormValues['priorityType']) : 'NORMAL',
    equipmentCode: d.assetCode,
    assetProfileId: d.assetProfileId,
    billingCustomerName: d.billToPartyCode ?? '',
    vendorCode: d.vendorPartyCode ?? '',
    description: d.problem,
    remarks: d.remarks ?? '',
  };
}

const text = (v: string | null | undefined): string | null => {
  const s = v?.trim();
  return s ? s : null;
};

/** The whole request; driver, meters, source and tasks (no inputs here) as read, `tasks: null` = unchanged. */
export function toRequest(v: WrFormValues, current?: WorkRequestDto, submit = false): SaveWorkRequestRequest {
  return {
    assetProfileId: v.assetProfileId,
    problem: v.description.trim(),
    priority: v.priorityType,
    source: current?.source ?? 'MANUAL',
    documentDate: text(v.orderDate),
    driverId: null,
    meterKm: current?.meterKm ?? null,
    meterHours: current?.meterHours ?? null,
    billToPartyCode: text(v.billingCustomerName)?.toUpperCase() ?? null,
    vendorPartyCode: text(v.vendorCode)?.toUpperCase() ?? null,
    remarks: text(v.remarks),
    tasks: current ? null : [],
    submit,
    rowVersion: current?.rowVersion ?? null,
  };
}

export const WR_API_TO_FORM = {
  assetprofileid: 'equipmentCode', problem: 'description', priority: 'priorityType', documentdate: 'orderDate',
  billtopartycode: 'billingCustomerName', vendorpartycode: 'vendorCode', remarks: 'remarks',
} as const;

// ── calls + hooks ───────────────────────────────────────────────────────────
export interface WrCriteria {
  search?: string;
  status?: string;
  from?: string;
  to?: string;
}

const keys = {
  all: (tenant?: string) => ['fleet', 'work-requests', tenant] as const,
  list: (tenant: string | undefined, c: object) => ['fleet', 'work-requests', tenant, 'list', c] as const,
  one: (tenant: string | undefined, id: string) => ['fleet', 'work-requests', tenant, 'one', id] as const,
};

function useTenant() {
  return useAuth().user?.tenantId;
}

/** A screen status can mean several API statuses: one call each, merged, newest first. */
export function useWorkRequests(c: WrCriteria) {
  const tenant = useTenant();
  return useQuery({
    queryKey: keys.list(tenant, c),
    queryFn: async () => {
      const statuses = apiWrStatuses(c.status ?? 'ALL') ?? [undefined];
      const pages = await Promise.all(statuses.map((status) =>
        apiGet<S['PagedResultOfWorkRequestDto']>(`${BASE}${query({ search: c.search, from: c.from, to: c.to, status, page: 1, pageSize: 200 })}`)));
      const rows = pages.flatMap((p) => p.items);
      // IN PROGRESS / COMPLETED share CONVERTED: split by the work order's state.
      const wanted = c.status && c.status !== 'ALL' ? rows.filter((r) => viewWrStatus(r).status === c.status) : rows;
      return wanted.sort((a, b) => b.documentDate.localeCompare(a.documentDate) || b.documentNo.localeCompare(a.documentNo));
    },
    placeholderData: keepPreviousData,
  });
}

export function useWorkRequest(id: string | null) {
  const tenant = useTenant();
  return useQuery({ queryKey: keys.one(tenant, id ?? ''), queryFn: () => apiGet<WorkRequestDto>(`${BASE}/${id}`), enabled: !!id });
}

function useWrMutation<V, R>(fn: (v: V) => Promise<R>) {
  const client = useQueryClient();
  const tenant = useTenant();
  return useMutation({
    mutationFn: fn,
    onSettled: () => {
      client.invalidateQueries({ queryKey: keys.all(tenant) });
      client.invalidateQueries({ queryKey: ['fleet', 'work-orders', tenant] });
    },
  });
}

export function useSaveWorkRequest() {
  return useWrMutation(({ values, current, submit }: { values: WrFormValues; current?: WorkRequestDto; submit?: boolean }) =>
    current
      ? apiSend<WorkRequestDto>('PUT', `${BASE}/${current.workRequestId}`, toRequest(values, current))
      : apiSend<WorkRequestDto>('POST', BASE, toRequest(values, undefined, !!submit)));
}

export type WrAction = 'submit' | 'approve' | 'reject' | 'cancel';

export function useWorkRequestAction() {
  return useWrMutation(({ id, action, reason, rowVersion }: { id: string; action: WrAction; reason?: string; rowVersion: string }) =>
    apiSend<WorkRequestDto>('POST', `${BASE}/${id}/${action}`, { reason: reason?.trim() || null, rowVersion }));
}

export function useConvertWorkRequest() {
  return useWrMutation(({ id, woType, repairSite, takesAssetOos, rowVersion }: { id: string; woType: string; repairSite: string; takesAssetOos: boolean; rowVersion: string }) =>
    apiSend<WorkOrderDto>('POST', `${BASE}/${id}/convert`, { woType, repairSite, takesAssetOos, rowVersion }));
}
