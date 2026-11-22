'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiSend, query } from '@/lib/api/client';
import type { components } from '@/lib/api/fleet.schema';
import type { components as platform } from '@/lib/api/platform.schema';
import { useAuth } from '@/lib/contexts/AuthContext';

type S = components['schemas'];

export type SetupCatalogue = S['SetupCatalogueResponse'];
export type SettingCatalogueItem = S['SettingCatalogueItem'];
export type FleetSetting = S['FleetSettingDto'];
export type EffectiveSetting = S['EffectiveSetting'];
export type EffectiveSettings = S['EffectiveSettingsResponse'];
export type NumberSeries = S['NumberSeriesDto'];
export type CreateNumberSeries = S['CreateNumberSeriesRequest'];
export type UpdateNumberSeries = S['UpdateNumberSeriesRequest'];
export type ApprovalPolicy = S['ApprovalPolicyDto'];
export type CreateApprovalPolicy = S['CreateApprovalPolicyRequest'];
export type UpdateApprovalPolicy = S['UpdateApprovalPolicyRequest'];
export type LaborCostRate = S['LaborCostRateDto'];
export type CreateLaborCostRate = S['CreateLaborCostRateRequest'];
export type UpdateLaborCostRate = S['UpdateLaborCostRateRequest'];
export type InitializeResult = S['InitializeSetupResponse'];
export type CodeListValue = platform['schemas']['CodeListValueResponse'];

const BASE = '/api/fleet/setup';

/** .NET sends numbers as `number | string` in the schema; the screens always want a number. */
export const num = (v: number | string | null | undefined): number | null =>
  v === null || v === undefined || v === '' ? null : Number(v);

// ── calls ───────────────────────────────────────────────────────────────────
export const getCatalogue = () => apiGet<SetupCatalogue>(`${BASE}/catalogue`);
export const initializeSetup = () => apiSend<InitializeResult>('POST', `${BASE}/initialize`);

export const getNumberSeries = () => apiGet<NumberSeries[]>(`${BASE}/number-series`);
export const createNumberSeries = (body: CreateNumberSeries) => apiSend<NumberSeries>('POST', `${BASE}/number-series`, body);
export const updateNumberSeries = (id: string, body: UpdateNumberSeries) => apiSend<NumberSeries>('PUT', `${BASE}/number-series/${id}`, body);
export const deleteNumberSeries = (id: string, rowVersion: string) =>
  apiSend<void>('DELETE', `${BASE}/number-series/${id}${query({ rowVersion })}`);

export const getFleetSettings = () => apiGet<FleetSetting[]>(`${BASE}/settings`);
export const getEffectiveSettings = (branchId: string | null) =>
  apiGet<EffectiveSettings>(`${BASE}/settings/effective${query({ branchId })}`);
export const saveSetting = (code: string, body: { branchId: string | null; value: string; rowVersion?: string | null }) =>
  apiSend<FleetSetting>('PUT', `${BASE}/settings/${encodeURIComponent(code)}`, body);
export const deleteSetting = (id: string, rowVersion: string) =>
  apiSend<void>('DELETE', `${BASE}/settings/${id}${query({ rowVersion })}`);

export const getApprovalPolicies = () => apiGet<ApprovalPolicy[]>(`${BASE}/approval-policies`);
export const createApprovalPolicy = (body: CreateApprovalPolicy) => apiSend<ApprovalPolicy>('POST', `${BASE}/approval-policies`, body);
export const updateApprovalPolicy = (id: string, body: UpdateApprovalPolicy) =>
  apiSend<ApprovalPolicy>('PUT', `${BASE}/approval-policies/${id}`, body);
export const deleteApprovalPolicy = (id: string, rowVersion: string) =>
  apiSend<void>('DELETE', `${BASE}/approval-policies/${id}${query({ rowVersion })}`);

export const getLaborCostRates = () => apiGet<LaborCostRate[]>(`${BASE}/labor-cost-rates`);
export const createLaborCostRate = (body: CreateLaborCostRate) => apiSend<LaborCostRate>('POST', `${BASE}/labor-cost-rates`, body);
export const updateLaborCostRate = (id: string, body: UpdateLaborCostRate) =>
  apiSend<LaborCostRate>('PUT', `${BASE}/labor-cost-rates/${id}`, body);
export const deleteLaborCostRate = (id: string, rowVersion: string) =>
  apiSend<void>('DELETE', `${BASE}/labor-cost-rates/${id}${query({ rowVersion })}`);

/** Platform API code list (gecko_master), e.g. FLEET_TRADE. */
export const getCodeList = (category: string) => apiGet<CodeListValue[]>(`/api/master/code-lists/${encodeURIComponent(category)}`);

// ── query keys ──────────────────────────────────────────────────────────────
export const setupKeys = {
  all: (tenantId?: string) => ['fleet', 'setup', tenantId] as const,
  catalogue: (tenantId?: string) => ['fleet', 'setup', tenantId, 'catalogue'] as const,
  series: (tenantId?: string) => ['fleet', 'setup', tenantId, 'number-series'] as const,
  settings: (tenantId?: string) => ['fleet', 'setup', tenantId, 'settings'] as const,
  effective: (tenantId: string | undefined, branchId: string | null) => ['fleet', 'setup', tenantId, 'settings', 'effective', branchId] as const,
  approvals: (tenantId?: string) => ['fleet', 'setup', tenantId, 'approval-policies'] as const,
  labor: (tenantId?: string) => ['fleet', 'setup', tenantId, 'labor-cost-rates'] as const,
  codeList: (tenantId: string | undefined, category: string) => ['platform', 'code-lists', tenantId, category] as const,
};

function useTenant() {
  return useAuth().user?.tenantId;
}

// ── queries ─────────────────────────────────────────────────────────────────
export function useSetupCatalogue() {
  const tenant = useTenant();
  return useQuery({ queryKey: setupKeys.catalogue(tenant), queryFn: getCatalogue, staleTime: 30 * 60_000 });
}

/** Needs fleet.setup.manage: pass `enabled` from the access helpers so a 403 is never requested. */
export function useNumberSeries(enabled: boolean) {
  const tenant = useTenant();
  return useQuery({ queryKey: setupKeys.series(tenant), queryFn: getNumberSeries, enabled });
}

/** Stored rows (tenant + overrides): needed for rowVersion and the override's id. Any fleet user. */
export function useFleetSettings() {
  const tenant = useTenant();
  return useQuery({ queryKey: setupKeys.settings(tenant), queryFn: getFleetSettings });
}

export function useEffectiveSettings(branchId: string | null) {
  const tenant = useTenant();
  return useQuery({ queryKey: setupKeys.effective(tenant, branchId), queryFn: () => getEffectiveSettings(branchId) });
}

export function useApprovalPolicies(enabled: boolean) {
  const tenant = useTenant();
  return useQuery({ queryKey: setupKeys.approvals(tenant), queryFn: getApprovalPolicies, enabled });
}

export function useLaborCostRates(enabled: boolean) {
  const tenant = useTenant();
  return useQuery({ queryKey: setupKeys.labor(tenant), queryFn: getLaborCostRates, enabled });
}

export const FLEET_TRADE = 'FLEET_TRADE';

export function useCodeList(category: string, enabled = true) {
  const tenant = useTenant();
  return useQuery({
    queryKey: setupKeys.codeList(tenant, category),
    queryFn: () => getCodeList(category),
    enabled,
    staleTime: 30 * 60_000,
  });
}

// ── mutations ───────────────────────────────────────────────────────────────
/**
 * A setup write. On success AND on failure the area's list is refetched: a 409 means the
 * row on screen is stale, so the latest version must replace it before the user retries.
 */
export function useSetupMutation<TVars, TResult = unknown>(
  fn: (vars: TVars) => Promise<TResult>,
  area: 'series' | 'settings' | 'approvals' | 'labor' | 'all',
) {
  const client = useQueryClient();
  const tenant = useTenant();
  const key = area === 'all' ? setupKeys.all(tenant) : area === 'settings' ? setupKeys.settings(tenant) : setupKeys[area](tenant);
  return useMutation({
    mutationFn: fn,
    onSettled: () => client.invalidateQueries({ queryKey: key }),
  });
}
