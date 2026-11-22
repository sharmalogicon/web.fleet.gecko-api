'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiSend, query } from '@/lib/api/client';
import type { components } from '@/lib/api/fleet.schema';
import type { components as platform } from '@/lib/api/platform.schema';
import { useAuth } from '@/lib/contexts/AuthContext';
import type { TechnicianFormValues } from '@/types/technician';

/** Technicians adapter (prompt 04). Rules: Gecko.Fleet TechnicianEndpoints.cs. */

type S = components['schemas'];
export type TechnicianDto = S['TechnicianDto'];
export type SaveTechnicianRequest = S['SaveTechnicianRequest'];
export type CostRateRef = S['LaborCostRateRef'];
type TechnicianPage = S['PagedResultOfTechnicianDto'];
export type UserSummary = platform['schemas']['UserSummary'];

const BASE = '/api/fleet/technicians';
export const MAX_PAGE_SIZE = 200;

export interface TechnicianView extends TechnicianFormValues {
  id: string;
  userName: string | null;
  costRate: { costPerHour: number; otCostPerHour: number | null; currencyCode: string; source: string } | null;
  rowVersion: string;
}

const n = (v: number | string | null | undefined): number | undefined =>
  v === null || v === undefined || v === '' ? undefined : Number(v);
const text = (v: string | null | undefined): string | null => {
  const s = v?.trim();
  return s ? s : null;
};
const upper = (v: string | null | undefined) => text(v)?.toUpperCase() ?? null;

export function toViewModel(d: TechnicianDto): TechnicianView {
  return {
    id: d.technicianId,
    userName: d.userName,
    rowVersion: d.rowVersion,
    costRate: d.costRate
      ? { costPerHour: Number(d.costRate.costPerHour), otCostPerHour: n(d.costRate.otCostPerHour) ?? null, currencyCode: d.costRate.currencyCode, source: d.costRate.source }
      : null,
    branchId: d.branchId,
    technicianCode: d.technicianCode,
    fullName: d.fullName,
    nickname: d.nickname ?? undefined,
    userId: d.userId ?? undefined,
    employmentType: d.employmentType === 'CONTRACTOR' ? 'CONTRACTOR' : 'EMPLOYEE',
    vendorPartyCode: d.vendorPartyCode ?? undefined,
    primaryTradeCode: d.primaryTradeCode,
    costPerHour: n(d.costPerHour),
    otCostPerHour: n(d.otCostPerHour),
    currencyCode: d.currencyCode ?? undefined,
    hiredOn: d.hiredOn ?? undefined,
    leftOn: d.leftOn ?? undefined,
    status: d.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
    remarks: d.remarks ?? undefined,
    skills: d.skills.map((s) => ({
      tradeCode: s.tradeCode,
      skillLevel: (['TRAINEE', 'SKILLED', 'SENIOR', 'MASTER'] as const).find((l) => l === s.skillLevel) ?? 'SKILLED',
      certifiedUntil: s.certifiedUntil ?? undefined,
    })),
  };
}

/** The whole record (POST and PUT share one shape; `skills` replace the stored list). */
export function toRequest(v: TechnicianFormValues, rowVersion?: string): SaveTechnicianRequest {
  const contractor = v.employmentType === 'CONTRACTOR';
  const cost = v.costPerHour ?? null;
  return {
    branchId: v.branchId,
    technicianCode: v.technicianCode.trim().toUpperCase(),
    fullName: v.fullName.trim(),
    nickname: text(v.nickname),
    userId: text(v.userId),
    employmentType: v.employmentType,
    vendorPartyCode: contractor ? upper(v.vendorPartyCode) : null,
    primaryTradeCode: v.primaryTradeCode,
    costPerHour: cost,
    otCostPerHour: v.otCostPerHour ?? null,
    currencyCode: cost === null ? null : upper(v.currencyCode),
    hiredOn: text(v.hiredOn),
    leftOn: text(v.leftOn),
    status: v.status,
    remarks: text(v.remarks),
    skills: v.skills.map((s) => ({ tradeCode: s.tradeCode, skillLevel: s.skillLevel, certifiedUntil: text(s.certifiedUntil) })),
    rowVersion: rowVersion ?? null,
  };
}

/** API field names are the form's names (camelCase); `skills[0].tradeCode` / `skills` land on the skills table. */
export function mapFieldErrors(fieldMap: Record<string, string>) {
  const formName: Record<string, keyof TechnicianFormValues> = {
    branchid: 'branchId', techniciancode: 'technicianCode', fullname: 'fullName', nickname: 'nickname', userid: 'userId',
    employmenttype: 'employmentType', vendorpartycode: 'vendorPartyCode', primarytradecode: 'primaryTradeCode',
    costperhour: 'costPerHour', otcostperhour: 'otCostPerHour', currencycode: 'currencyCode', hiredon: 'hiredOn',
    lefton: 'leftOn', status: 'status', remarks: 'remarks', skills: 'skills',
  };
  const fields: Partial<Record<keyof TechnicianFormValues, string>> = {};
  const other: string[] = [];
  for (const [key, message] of Object.entries(fieldMap)) {
    const root = key.toLowerCase().split(/[.[]/)[0];
    if (formName[root]) fields[formName[root]] ??= message;
    else other.push(message);
  }
  return { fields, other };
}

/**
 * "฿180/h (trade rate, LCB01)". `branchCode` names the branch for a BRANCH_TRADE rate.
 * Labels come from i18n (`technician.rateSource.*`).
 */
export function costRateText(
  rate: TechnicianView['costRate'],
  t: (key: string) => string,
  branchCode?: string,
): string {
  if (!rate) return t('technician.noRate');
  const symbol = rate.currencyCode === 'THB' ? '฿' : `${rate.currencyCode} `;
  const amount = `${symbol}${rate.costPerHour.toLocaleString()}/${t('technician.hourShort')}`;
  const source = t(`technician.rateSource.${rate.source}`);
  const where = rate.source === 'BRANCH_TRADE' && branchCode ? `, ${branchCode}` : '';
  return `${amount} (${source}${where})`;
}

// ── calls ───────────────────────────────────────────────────────────────────
export interface TechnicianCriteria {
  search?: string;
  trade?: string;
  status?: string;
  branchId?: string;
}

export const getTechnicians = (c: TechnicianCriteria) =>
  apiGet<TechnicianPage>(`${BASE}${query({ ...c, page: 1, pageSize: MAX_PAGE_SIZE })}`);
export const getTechnician = (id: string) => apiGet<TechnicianDto>(`${BASE}/${encodeURIComponent(id)}`);
export const createTechnician = (body: SaveTechnicianRequest) => apiSend<TechnicianDto>('POST', BASE, body);
export const updateTechnician = (id: string, body: SaveTechnicianRequest) =>
  apiSend<TechnicianDto>('PUT', `${BASE}/${encodeURIComponent(id)}`, body);
/** Platform users (needs `user.manage`): the optional login of a technician. */
export const getUsers = () =>
  apiGet<platform['schemas']['PagedResultOfUserSummary']>(`/api/users${query({ Page: 1, PageSize: 200, status: 'ACTIVE' })}`).then((p) => p.items);

// ── hooks ───────────────────────────────────────────────────────────────────
const keys = {
  all: (tenant?: string) => ['fleet', 'technicians', tenant] as const,
  list: (tenant: string | undefined, c: TechnicianCriteria) => ['fleet', 'technicians', tenant, 'list', c] as const,
  one: (tenant: string | undefined, id: string) => ['fleet', 'technicians', tenant, 'one', id] as const,
  users: (tenant?: string) => ['platform', 'users', tenant] as const,
};

function useTenant() {
  return useAuth().user?.tenantId;
}

export function useTechnicians(c: TechnicianCriteria) {
  const tenant = useTenant();
  return useQuery({
    queryKey: keys.list(tenant, c),
    queryFn: async () => {
      const page = await getTechnicians(c);
      return { rows: page.items.map(toViewModel), hasMore: !!page.hasMore };
    },
    placeholderData: keepPreviousData,
  });
}

export function useTechnician(id: string | null) {
  const tenant = useTenant();
  return useQuery({ queryKey: keys.one(tenant, id ?? ''), queryFn: () => getTechnician(id!).then(toViewModel), enabled: !!id });
}

export function usePlatformUsers(enabled: boolean) {
  const tenant = useTenant();
  return useQuery({ queryKey: keys.users(tenant), queryFn: getUsers, enabled, staleTime: 10 * 60_000 });
}

export function useSaveTechnician() {
  const client = useQueryClient();
  const tenant = useTenant();
  return useMutation({
    mutationFn: ({ values, current }: { values: TechnicianFormValues; current?: TechnicianView }) =>
      (current ? updateTechnician(current.id, toRequest(values, current.rowVersion)) : createTechnician(toRequest(values))).then(toViewModel),
    onSettled: () => client.invalidateQueries({ queryKey: keys.all(tenant) }),
  });
}
