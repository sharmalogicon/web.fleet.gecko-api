'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiSend, query } from '@/lib/api/client';
import type { components } from '@/lib/api/fleet.schema';
import { useAuth } from '@/lib/contexts/AuthContext';

/**
 * Meter readings (prompt 08 §A): an append-only ledger. Never edited or deleted; a wrong reading is
 * reversed; a suspect one is accepted / rejected. Rules: Gecko.Fleet MeterEndpoints.cs.
 */

type S = components['schemas'];
export type MeterReadingDto = S['MeterReadingDto'];
export type RecordMeterRequest = S['RecordMeterRequest'];
export type AssetMetersDto = S['AssetMetersDto'];

const BASE = '/api/fleet/meter-readings';
export type MeterKind = 'KM' | 'HOUR';
export type ScreenMeterType = 'KM' | 'HOUR' | 'BOTH';
export const READING_STATUSES = ['VALID', 'SUSPECT', 'ACCEPTED', 'REJECTED', 'REVERSED', 'CANCELLED'] as const;

const n = (v: number | string | null | undefined): number | undefined =>
  v === null || v === undefined || v === '' ? undefined : Number(v);

/** Which screen meter types the asset's `meterType` (KM, HOUR, KM_HOUR, NONE) allows. */
export function allowedMeterTypes(assetMeterType: string | null | undefined): ScreenMeterType[] {
  switch (assetMeterType) {
    case 'KM': return ['KM'];
    case 'HOUR': return ['HOUR'];
    case 'KM_HOUR': return ['KM', 'HOUR', 'BOTH'];
    case 'NONE': return [];
    default: return ['KM', 'HOUR', 'BOTH'];
  }
}

export interface RecordInput {
  assetProfileId: string;
  assetMeterType?: string | null;
  /** `yyyy-MM-ddTHH:mm` from the datetime input (local time). */
  readingAt: string;
  meterType: ScreenMeterType;
  km?: number;
  hours?: number;
  driverId?: string | null;
  remarks?: string;
}

/** An error key (i18n `meter.rule.*`) or null. */
export function recordError(i: RecordInput): string | null {
  if (!i.assetProfileId) return 'meter.rule.asset';
  const allowed = allowedMeterTypes(i.assetMeterType);
  if (!allowed.length) return 'meter.rule.noMeter';
  if (!allowed.includes(i.meterType)) return 'meter.rule.typeNotAllowed';
  const wantsKm = i.meterType !== 'HOUR';
  const wantsHours = i.meterType !== 'KM';
  if (wantsKm && (i.km === undefined || Number.isNaN(i.km) || i.km < 0)) return 'meter.rule.km';
  if (wantsHours && (i.hours === undefined || Number.isNaN(i.hours) || i.hours < 0)) return 'meter.rule.hours';
  if (!i.readingAt) return 'meter.rule.date';
  return null;
}

/** KM → km; HOUR → hours; BOTH → both in ONE request (two readings come back). */
export function toRecordRequest(i: RecordInput): RecordMeterRequest {
  const wantsKm = i.meterType !== 'HOUR';
  const wantsHours = i.meterType !== 'KM';
  return {
    assetProfileId: i.assetProfileId,
    readingAt: new Date(i.readingAt).toISOString(),
    km: wantsKm ? i.km ?? null : null,
    hours: wantsHours ? i.hours ?? null : null,
    driverId: i.driverId || null,
    remarks: i.remarks?.trim() || null,
  };
}

/** A row for the existing list cells (field names of the old mock types). */
export interface MeterReadingView {
  id: string;
  equipmentCode: string;
  registrationNo?: string;
  meterUpdateDate: string;
  meterType: MeterKind;
  value: number;
  sinceLast?: number;
  driverName?: string;
  status: string;
  suspectReason: string | null;
  source: string;
  remarks?: string;
  dto: MeterReadingDto;
}

export function toView(d: MeterReadingDto): MeterReadingView {
  return {
    id: d.meterReadingId,
    equipmentCode: d.assetCode,
    registrationNo: d.registrationNo ?? undefined,
    meterUpdateDate: d.readingAt,
    meterType: d.meterKind === 'HOUR' ? 'HOUR' : 'KM',
    value: Number(d.readingValue),
    sinceLast: n(d.sinceLast),
    driverName: d.driverCode ?? undefined,
    status: d.status,
    suspectReason: d.suspectReason,
    source: d.source,
    remarks: d.remarks ?? undefined,
    dto: d,
  };
}

/** `yyyy-MM-ddTHH:mm` for a datetime-local input, in local time. */
export function localDateTime(d = new Date()): string {
  const pad = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const METER_API_TO_FORM = {
  assetprofileid: 'equipmentCode', readingat: 'meterUpdateDate', km: 'meterRead', hours: 'hourMeter', driverid: 'driverName', remarks: 'remarks',
} as const;

// ── calls + hooks ───────────────────────────────────────────────────────────
export interface MeterCriteria {
  kind: MeterKind;
  search?: string;
  from?: string;
  to?: string;
  status?: string;
  assetProfileId?: string;
}

const keys = {
  all: (tenant?: string) => ['fleet', 'meter-readings', tenant] as const,
  list: (tenant: string | undefined, c: MeterCriteria) => ['fleet', 'meter-readings', tenant, 'list', c] as const,
  one: (tenant: string | undefined, id: string) => ['fleet', 'meter-readings', tenant, 'one', id] as const,
  assetMeters: (tenant: string | undefined, id: string) => ['fleet', 'asset-meters', tenant, id] as const,
};

function useTenant() {
  return useAuth().user?.tenantId;
}

/** The list. Each row is also put in the cache by id: there is no GET /meter-readings/{id}, the read-only page uses it. */
export function useMeterReadings(c: MeterCriteria) {
  const tenant = useTenant();
  const client = useQueryClient();
  return useQuery({
    queryKey: keys.list(tenant, c),
    queryFn: async () => {
      const page = await apiGet<S['PagedResultOfMeterReadingDto']>(`${BASE}${query({ ...c, page: 1, pageSize: 200 })}`);
      const rows = page.items.map(toView);
      for (const r of rows) client.setQueryData(keys.one(tenant, r.id), r);
      return rows;
    },
    placeholderData: keepPreviousData,
  });
}

/** A saved reading, from the cache the list filled (see useMeterReadings). */
export function useCachedMeterReading(id: string) {
  const tenant = useTenant();
  return useQuery<MeterReadingView | null>({
    queryKey: keys.one(tenant, id),
    queryFn: () => null,
    staleTime: Infinity,
  });
}

export function useAssetMeters(assetProfileId: string | null) {
  const tenant = useTenant();
  return useQuery({
    queryKey: keys.assetMeters(tenant, assetProfileId ?? ''),
    queryFn: () => apiGet<AssetMetersDto>(`/api/fleet/assets/${assetProfileId}/meters`),
    enabled: !!assetProfileId,
  });
}

function useMeterMutation<V, R extends MeterReadingDto | MeterReadingDto[]>(fn: (v: V) => Promise<R>) {
  const client = useQueryClient();
  const tenant = useTenant();
  return useMutation({
    mutationFn: fn,
    onSuccess: (r: R) => {
      for (const d of (Array.isArray(r) ? r : [r]) as MeterReadingDto[]) client.setQueryData(keys.one(tenant, d.meterReadingId), toView(d));
    },
    onSettled: () => {
      client.invalidateQueries({ queryKey: keys.all(tenant) });
      client.invalidateQueries({ queryKey: ['fleet', 'asset-meters', tenant] });
    },
  });
}

export function useRecordMeter() {
  return useMeterMutation((i: RecordInput) => apiSend<MeterReadingDto[]>('POST', BASE, toRecordRequest(i)));
}

export function useReviewMeter() {
  return useMeterMutation(({ id, decision, reason }: { id: string; decision: 'ACCEPTED' | 'REJECTED'; reason: string }) =>
    apiSend<MeterReadingDto>('POST', `${BASE}/${id}/review`, { decision, reason: reason.trim() || null }));
}

export function useReverseMeter() {
  return useMeterMutation(({ id, reason }: { id: string; reason: string }) =>
    apiSend<MeterReadingDto>('POST', `${BASE}/${id}/reverse`, { reason: reason.trim() }));
}
