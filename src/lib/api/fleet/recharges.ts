'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiSend, query } from '@/lib/api/client';
import type { components } from '@/lib/api/fleet.schema';
import { useAuth } from '@/lib/contexts/AuthContext';

/** Recharges (prompt 12 §B/§C): preview / release from a completed WO, then the released documents and their delivery. */
type S = components['schemas'];
export type RechargeDto = S['RechargeDto'];
export type RechargeLineDto = S['RechargeLineDto'];
export type RechargePreviewGroup = S['RechargePreviewGroupDto'];
export type RechargeCandidate = S['RechargeCandidateDto'];

export const RECHARGE_STATUSES = ['RELEASED', 'ACCEPTED', 'FAILED', 'INVOICED', 'DEDUCTED', 'CANCELLED'] as const;
export const RECHARGE_STATUS_CLASS: Record<string, string> = {
  RELEASED: 'bg-blue-100 text-blue-700', ACCEPTED: 'bg-cyan-100 text-cyan-700', FAILED: 'bg-red-100 text-red-700',
  INVOICED: 'bg-green-100 text-green-700', DEDUCTED: 'bg-green-100 text-green-700', CANCELLED: 'bg-gray-100 text-gray-600',
};
/** INVOICE blue, DEDUCTION purple. */
export const MODE_CLASS: Record<string, string> = { INVOICE: 'bg-blue-100 text-blue-700', DEDUCTION: 'bg-purple-100 text-purple-700' };
export const statusClass = (s: string) => RECHARGE_STATUS_CLASS[s] ?? 'bg-gray-100 text-gray-700';
export const modeClass = (m: string) => MODE_CLASS[m] ?? 'bg-gray-100 text-gray-700';

/** Row actions by status: Retry only FAILED; Refresh once delivered; Cancel until invoiced / deducted (API refuses after). */
export function rechargeActions(status: string) {
  return {
    retry: status === 'FAILED',
    refresh: status === 'ACCEPTED' || status === 'RELEASED',
    cancel: status === 'RELEASED' || status === 'ACCEPTED' || status === 'FAILED',
  };
}

/** What a priced line's `rateCardRef` says, as an i18n key + detail (CARD:3 → card line 3). */
export function describeRef(ref: string | null | undefined): { key: string; detail?: string } {
  if (!ref) return { key: 'recharge.ref.none' };
  const [kind, ...rest] = ref.split(':');
  const detail = rest.join(':') || undefined;
  switch (kind) {
    case 'CARD': return { key: 'recharge.ref.card', detail };
    case 'COST': return { key: 'recharge.ref.cost' };
    case 'KEYED': return { key: 'recharge.ref.keyed' };
    case 'FLAT-INCLUDED': return { key: 'recharge.ref.flatIncluded' };
    case 'TARIFF': return { key: 'recharge.ref.tariff', detail };
    default: return { key: 'recharge.ref.other', detail: ref };
  }
}

/** Released vs. may still be released: the WO can be released when it is COMPLETED / CLOSED and not BILLED. */
export const canReleaseWo = (wo: { status: string; billingStatus?: string | null }) =>
  (wo.status === 'COMPLETED' || wo.status === 'CLOSED') && wo.billingStatus !== 'BILLED';

function useTenant() {
  return useAuth().user?.tenantId;
}
const key = (tenant?: string, ...rest: unknown[]) => ['fleet', 'recharges', tenant, ...rest];

export function useRechargeCandidates(branchId: string | null) {
  const tenant = useTenant();
  return useQuery({
    queryKey: key(tenant, 'candidates', branchId),
    queryFn: () => apiGet<RechargeCandidate[]>(`/api/fleet/recharges/candidates${query({ branchId: branchId ?? undefined })}`),
  });
}

export function useRecharges(c: { status?: string; mode?: string; workOrderId?: string; billToPartyCode?: string }) {
  const tenant = useTenant();
  return useQuery({
    queryKey: key(tenant, 'list', c),
    queryFn: async () => (await apiGet<S['PagedResultOfRechargeDto']>(`/api/fleet/recharges${query({ ...c, page: 1, pageSize: 200 })}`)).items,
    placeholderData: keepPreviousData,
  });
}

export function useRecharge(id: string | null) {
  const tenant = useTenant();
  return useQuery({ queryKey: key(tenant, 'one', id), queryFn: () => apiGet<RechargeDto>(`/api/fleet/recharges/${id}`), enabled: !!id });
}

export function useRechargeMutations() {
  const client = useQueryClient();
  const tenant = useTenant();
  const settle = () => {
    client.invalidateQueries({ queryKey: key(tenant) });
    client.invalidateQueries({ queryKey: ['fleet', 'work-orders', tenant] });
  };
  const preview = useMutation({ mutationFn: (workOrderId: string) => apiSend<RechargePreviewGroup[]>('POST', `/api/fleet/work-orders/${workOrderId}/recharges/preview`) });
  const release = useMutation({ mutationFn: (workOrderId: string) => apiSend<RechargeDto[]>('POST', `/api/fleet/work-orders/${workOrderId}/recharges/release`), onSettled: settle });
  const act = useMutation({
    mutationFn: ({ id, action, body }: { id: string; action: 'retry' | 'refresh' | 'cancel'; body?: unknown }) => apiSend<RechargeDto>('POST', `/api/fleet/recharges/${id}/${action}`, body),
    onSettled: settle,
  });
  return { preview, release, act };
}
