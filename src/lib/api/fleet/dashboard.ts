'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet, query } from '@/lib/api/client';
import type { components } from '@/lib/api/fleet.schema';
import { useAuth } from '@/lib/contexts/AuthContext';

/** Dashboard (prompt 16 §A): one call, mapped to the existing six stat cards and three panels. */

type S = components['schemas'];
export type DashboardDto = S['DashboardDto'];

const num = (v: number | string | null | undefined): number => (v === null || v === undefined || v === '' ? 0 : Number(v));

export const STAT_KEYS = ['ACTIVE_WORK_ORDERS', 'PENDING_PM', 'OPEN_PURCHASE_ORDERS', 'TOTAL_VEHICLES', 'OVERDUE_SERVICE', 'FUEL_LITERS_MONTH'] as const;
export type StatKey = (typeof STAT_KEYS)[number];

/** (value − previous) / previous × 100, one decimal; undefined when there is no previous value or it is 0. */
export function changePct(value: number, previous: number | string | null | undefined): number | undefined {
  if (previous === null || previous === undefined || previous === '') return undefined;
  const p = Number(previous);
  if (!p) return undefined;
  return Math.round(((value - p) / p) * 1000) / 10;
}

export interface StatCardView {
  key: StatKey;
  value: string;
  change?: number;
}

/** The six cards in the screen's order; a stat the API did not send shows 0. Fuel carries its unit (L). */
export function toStatCards(d: Pick<DashboardDto, 'stats'>): StatCardView[] {
  return STAT_KEYS.map((key) => {
    const s = d.stats.find((x) => x.key === key);
    const value = num(s?.value);
    const unit = s?.unit ? ` ${s.unit}` : '';
    return { key, value: `${value.toLocaleString('en-US', { maximumFractionDigits: 1 })}${unit}`, change: changePct(value, s?.previousValue) };
  });
}

export const FLEET_STATUS_KEYS = ['ACTIVE', 'UNDER_MAINTENANCE', 'IDLE', 'OUT_OF_SERVICE'] as const;

export function toFleetStatus(d: Pick<DashboardDto, 'fleetStatus'>) {
  const fs = (d.fleetStatus ?? {}) as Record<string, number | string>;
  return FLEET_STATUS_KEYS.map((key) => ({ key, count: num(fs[key]) }));
}

/** Whole days from today to the due date (negative = overdue); null without a date. */
export function daysLeft(dueAt: string | null | undefined, today = new Date()): number | null {
  if (!dueAt) return null;
  const due = new Date(dueAt.slice(0, 10) + 'T00:00:00');
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((due.getTime() - start.getTime()) / 86_400_000);
}

export function useDashboard(branchId: string | null | undefined) {
  const tenant = useAuth().user?.tenantId;
  return useQuery({
    queryKey: ['fleet', 'dashboard', tenant, branchId ?? null],
    queryFn: () => apiGet<DashboardDto>(`/api/fleet/dashboard${query({ branchId: branchId ?? undefined })}`),
    staleTime: 60_000,
  });
}
