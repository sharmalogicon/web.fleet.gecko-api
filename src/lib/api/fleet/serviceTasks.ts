'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiSend, query } from '@/lib/api/client';
import type { components } from '@/lib/api/fleet.schema';
import { useAuth } from '@/lib/contexts/AuthContext';
import type { ServiceTypeFormValues } from '@/types/service-type';

/** Service Types screen ⇄ Fleet `service-tasks` (prompt 07 §A). */

type S = components['schemas'];
export type ServiceTaskDto = S['ServiceTaskDto'];
export type SaveServiceTaskRequest = S['SaveServiceTaskRequest'];

const BASE = '/api/fleet/service-tasks';
export const SERVICE_CATEGORY_LIST = 'FLEET_SERVICE_CATEGORY';

export interface ServiceTypeView extends ServiceTypeFormValues {
  id: string;
  rowVersion: string;
  dto: ServiceTaskDto;
}

const n = (v: number | string | null | undefined): number | undefined =>
  v === null || v === undefined || v === '' ? undefined : Number(v);
const opt = (v: number | undefined) => (v === undefined || Number.isNaN(v) ? null : v);

export function toViewModel(d: ServiceTaskDto): ServiceTypeView {
  return {
    id: d.serviceTaskId,
    rowVersion: d.rowVersion,
    dto: d,
    code: d.taskCode,
    description: d.descriptionEn,
    serviceCategory: d.categoryCode,
    estimationDuration: n(d.stdHours),
    advanceNotifyDay: n(d.notifyDays),
    advanceNotifyKM: n(d.notifyKm),
    isActive: d.isActive,
  };
}

/** Fields with no input (Thai description, trade, GL, charge code) are sent as read. */
export function toRequest(v: ServiceTypeFormValues, current?: ServiceTypeView): SaveServiceTaskRequest {
  const d = current?.dto;
  return {
    taskCode: v.code.trim().toUpperCase(),
    descriptionEn: v.description.trim(),
    descriptionLocal: d?.descriptionLocal ?? null,
    categoryCode: v.serviceCategory,
    stdHours: opt(v.estimationDuration),
    notifyDays: v.advanceNotifyDay === undefined ? null : Math.round(v.advanceNotifyDay),
    notifyKm: v.advanceNotifyKM === undefined ? null : Math.round(v.advanceNotifyKM),
    tradeCode: d?.tradeCode ?? null,
    expenseGlCode: d?.expenseGlCode ?? null,
    chargeCode: d?.chargeCode ?? null,
    isActive: v.isActive,
    rowVersion: current?.rowVersion ?? null,
  };
}

export const SERVICE_TASK_API_TO_FORM = {
  taskcode: 'code', descriptionen: 'description', categorycode: 'serviceCategory', stdhours: 'estimationDuration',
  notifydays: 'advanceNotifyDay', notifykm: 'advanceNotifyKM', isactive: 'isActive',
} as const;

// ── calls + hooks ───────────────────────────────────────────────────────────
export const getServiceTasks = (c: { search?: string; category?: string }) =>
  apiGet<S['PagedResultOfServiceTaskDto']>(`${BASE}${query({ ...c, page: 1, pageSize: 200 })}`);
export const getServiceTask = (id: string) => apiGet<ServiceTaskDto>(`${BASE}/${encodeURIComponent(id)}`);

const keys = {
  all: (tenant?: string) => ['fleet', 'service-tasks', tenant] as const,
  list: (tenant: string | undefined, c: object) => ['fleet', 'service-tasks', tenant, 'list', c] as const,
  one: (tenant: string | undefined, id: string) => ['fleet', 'service-tasks', tenant, 'one', id] as const,
};

function useTenant() {
  return useAuth().user?.tenantId;
}

export function useServiceTypes(c: { search?: string; category?: string }) {
  const tenant = useTenant();
  return useQuery({
    queryKey: keys.list(tenant, c),
    queryFn: async () => (await getServiceTasks(c)).items.map(toViewModel),
    placeholderData: keepPreviousData,
  });
}

export function useServiceTypeRecord(id: string | null) {
  const tenant = useTenant();
  return useQuery({ queryKey: keys.one(tenant, id ?? ''), queryFn: () => getServiceTask(id!).then(toViewModel), enabled: !!id });
}

export function useSaveServiceType() {
  const client = useQueryClient();
  const tenant = useTenant();
  return useMutation({
    mutationFn: ({ values, current }: { values: ServiceTypeFormValues; current?: ServiceTypeView }) =>
      (current
        ? apiSend<ServiceTaskDto>('PUT', `${BASE}/${encodeURIComponent(current.id)}`, toRequest(values, current))
        : apiSend<ServiceTaskDto>('POST', BASE, toRequest(values))
      ).then(toViewModel),
    onSettled: () => client.invalidateQueries({ queryKey: keys.all(tenant) }),
  });
}
