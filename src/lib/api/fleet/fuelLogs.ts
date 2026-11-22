'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiGet, apiSend, query } from '@/lib/api/client';
import type { components } from '@/lib/api/fleet.schema';
import { useAuth } from '@/lib/contexts/AuthContext';
import { optNum } from '@/lib/utils/zod';

/**
 * Fuel logs (prompt 14 §B). The API owns the status (DRAFT → PENDING_APPROVAL → APPROVED / REJECTED, CANCELLED):
 * actions, never a saved field. OWN_TANK = issued from a fuel store (costed by the API on approval, no price);
 * VENDOR = bought at a station (unit price keyed). Trucking-linked assets: their fuel is Trucking's (409 on save).
 */

type S = components['schemas'];
export type FuelLogDto = S['FuelLogDto'];
export type SaveFuelLogRequest = S['SaveFuelLogRequest'];
export type AssetFuelDto = S['AssetFuelDto'];
export type TruckingFuelRowDto = S['TruckingFuelRowDto'];

const BASE = '/api/fleet/fuel-logs';
export const FUEL_STATUSES = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED'] as const;
export const FUEL_SOURCES = ['OWN_TANK', 'VENDOR'] as const;

export const FUEL_STATUS_TONE: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

const n = (v: number | string | null | undefined): number | undefined =>
  v === null || v === undefined || v === '' ? undefined : Number(v);
const text = (v: string | null | undefined): string | null => {
  const s = v?.trim();
  return s ? s : null;
};

/** `yyyy-MM-ddTHH:mm` (local) for a datetime-local input. */
export function localDateTime(iso?: string | null): string {
  const d = iso ? new Date(iso) : new Date();
  const pad = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ── form ────────────────────────────────────────────────────────────────────
/** The screen's field names (old mock type) + the ids the API needs. Messages are i18n keys. */
export const fuelFormSchema = z
  .object({
    documentNo: z.string().optional(),
    equipmentCode: z.string().trim().min(1, 'fuel.rule.asset'),
    assetProfileId: z.string().min(1, 'fuel.rule.asset'),
    meterUpdateDate: z.string().min(1, 'fuel.rule.date'),
    voucherNo: z.string().max(60).optional(),
    tankMeter: z.coerce.number({ message: 'fuel.rule.liters' }).gt(0, 'fuel.rule.liters'),
    meterRead: optNum,
    hourMeter: optNum,
    driverName: z.string().optional(),
    driverId: z.string().optional(),
    driverCard: z.string().max(40).optional(),
    fuelSource: z.enum(FUEL_SOURCES),
    warehouseId: z.string().optional(),
    itemId: z.string().optional(),
    vendorName: z.string().optional(),
    costPerLiter: optNum,
    remarks: z.string().max(1000).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.meterUpdateDate && new Date(v.meterUpdateDate).getTime() > Date.now() + 60_000)
      ctx.addIssue({ code: 'custom', path: ['meterUpdateDate'], message: 'fuel.rule.future' });
    if (v.fuelSource === 'OWN_TANK') {
      if (!v.warehouseId) ctx.addIssue({ code: 'custom', path: ['warehouseId'], message: 'fuel.rule.store' });
      if (!v.itemId) ctx.addIssue({ code: 'custom', path: ['itemId'], message: 'fuel.rule.item' });
    } else if (v.costPerLiter === undefined || Number.isNaN(v.costPerLiter) || v.costPerLiter <= 0) {
      ctx.addIssue({ code: 'custom', path: ['costPerLiter'], message: 'fuel.rule.price' });
    }
  });
export type FuelFormValues = z.infer<typeof fuelFormSchema>;

export const NEW_FUEL_FORM: FuelFormValues = {
  equipmentCode: '', assetProfileId: '', meterUpdateDate: localDateTime(), voucherNo: '', tankMeter: 0, fuelSource: 'VENDOR',
  driverName: '', driverId: '', driverCard: '', warehouseId: '', itemId: '', vendorName: '', remarks: '',
};

export function toFormValues(d: FuelLogDto): FuelFormValues {
  return {
    documentNo: d.documentNo,
    equipmentCode: d.assetCode,
    assetProfileId: d.assetProfileId,
    meterUpdateDate: localDateTime(d.fuelledAt),
    voucherNo: d.voucherNo ?? '',
    tankMeter: Number(d.liters),
    meterRead: n(d.meterKm),
    hourMeter: n(d.meterHours),
    driverName: d.driverCode ?? '',
    driverId: d.driverId ?? '',
    driverCard: d.fuelCardNo ?? '',
    fuelSource: d.fuelSource === 'OWN_TANK' ? 'OWN_TANK' : 'VENDOR',
    warehouseId: d.warehouseId ?? '',
    itemId: d.itemId ?? '',
    vendorName: d.supplierPartyCode ?? '',
    costPerLiter: n(d.unitPrice),
    remarks: d.remarks ?? '',
  };
}

const num = (v: number | undefined): number | null => (v === undefined || Number.isNaN(v) ? null : v);

/** OWN_TANK: store + item, never a price or supplier. VENDOR: price (+ optional supplier), never a store / item. */
export function toRequest(v: FuelFormValues, current?: FuelLogDto, submit = false): SaveFuelLogRequest {
  const own = v.fuelSource === 'OWN_TANK';
  return {
    assetProfileId: v.assetProfileId,
    fuelledAt: new Date(v.meterUpdateDate).toISOString(),
    liters: v.tankMeter,
    fuelSource: v.fuelSource,
    warehouseId: own ? text(v.warehouseId) : null,
    itemId: own ? text(v.itemId) : null,
    supplierPartyCode: own ? null : text(v.vendorName)?.toUpperCase() ?? null,
    unitPrice: own ? null : num(v.costPerLiter),
    voucherNo: text(v.voucherNo),
    driverId: text(v.driverId),
    fuelCardNo: text(v.driverCard),
    meterKm: num(v.meterRead),
    meterHours: num(v.hourMeter),
    documentDate: current?.documentDate ?? null,
    remarks: text(v.remarks),
    submit,
    rowVersion: current?.rowVersion ?? null,
  };
}

export const FUEL_API_TO_FORM = {
  assetprofileid: 'equipmentCode', fuelledat: 'meterUpdateDate', liters: 'tankMeter', voucherno: 'voucherNo', meterkm: 'meterRead',
  meterhours: 'hourMeter', driverid: 'driverName', fuelcardno: 'driverCard', fuelsource: 'fuelSource', warehouseid: 'warehouseId',
  itemid: 'itemId', supplierpartycode: 'vendorName', unitprice: 'costPerLiter', remarks: 'remarks',
} as const;

/** What the user may do, from the API status (the API checks again; own-entry approval is refused). */
export function fuelActions(d: FuelLogDto | undefined, canManage: boolean, userId: string | undefined) {
  const s = d?.status ?? 'NEW';
  const own = !!d && !!userId && d.createdBy === userId;
  return {
    save: (s === 'NEW' || s === 'DRAFT' || s === 'PENDING_APPROVAL') && canManage,
    submit: (s === 'NEW' || s === 'DRAFT') && canManage,
    approve: s === 'PENDING_APPROVAL' && canManage && !own,
    reject: s === 'PENDING_APPROVAL' && canManage && !own,
    cancel: (s === 'DRAFT' || s === 'PENDING_APPROVAL' || s === 'APPROVED') && canManage,
  };
}

/** A row for the existing list cells (old field names). */
export interface FuelLogRow {
  fuelLogID: string;
  documentNo: string;
  equipmentCode: string;
  registrationNo?: string;
  voucherNo?: string;
  meterUpdateDate: string;
  driverName?: string;
  driverCard?: string;
  tankMeter: number;
  costPerLiter?: number;
  totalAmount?: number;
  fuelSource: string;
  status: string;
  branchId: string;
  createdBy: string | null;
  rowVersion: string;
}

export function toRow(d: FuelLogDto): FuelLogRow {
  return {
    fuelLogID: d.fuelLogId,
    documentNo: d.documentNo,
    equipmentCode: d.assetCode,
    registrationNo: d.registrationNo ?? undefined,
    voucherNo: d.voucherNo ?? undefined,
    meterUpdateDate: d.fuelledAt,
    driverName: d.driverName ?? d.driverCode ?? undefined,
    driverCard: d.fuelCardNo ?? undefined,
    tankMeter: Number(d.liters),
    costPerLiter: n(d.unitPrice),
    totalAmount: n(d.amount),
    fuelSource: d.fuelSource,
    status: d.status,
    branchId: d.branchId,
    createdBy: d.createdBy,
    rowVersion: d.rowVersion,
  };
}

// ── calls + hooks ───────────────────────────────────────────────────────────
export interface FuelCriteria {
  search?: string;
  status?: string;
  fuelSource?: string;
  assetProfileId?: string;
  from?: string;
  to?: string;
}

const keys = {
  all: (tenant?: string) => ['fleet', 'fuel-logs', tenant] as const,
  list: (tenant: string | undefined, c: object) => ['fleet', 'fuel-logs', tenant, 'list', c] as const,
  one: (tenant: string | undefined, id: string) => ['fleet', 'fuel-logs', tenant, 'one', id] as const,
};

function useTenant() {
  return useAuth().user?.tenantId;
}

export function useFuelLogs(c: FuelCriteria) {
  const tenant = useTenant();
  return useQuery({
    queryKey: keys.list(tenant, c),
    queryFn: async () =>
      (await apiGet<S['PagedResultOfFuelLogDto']>(`${BASE}${query({ ...c, page: 1, pageSize: 200 })}`)).items.map(toRow),
    placeholderData: keepPreviousData,
  });
}

export function useFuelLog(id: string | null) {
  const tenant = useTenant();
  return useQuery({ queryKey: keys.one(tenant, id ?? ''), queryFn: () => apiGet<FuelLogDto>(`${BASE}/${id}`), enabled: !!id });
}

/** Trucking's fuel rows of a linked asset (read-only); `isLinked` false → Fleet records the fuel. */
export function useAssetFuel(assetProfileId: string | null) {
  const tenant = useTenant();
  return useQuery({
    queryKey: ['fleet', 'asset-fuel', tenant, assetProfileId],
    queryFn: () => apiGet<AssetFuelDto>(`/api/fleet/assets/${assetProfileId}/fuel${query({ take: 50 })}`),
    enabled: !!assetProfileId,
  });
}

function useFuelMutation<V, R>(fn: (v: V) => Promise<R>) {
  const client = useQueryClient();
  const tenant = useTenant();
  return useMutation({
    mutationFn: fn,
    onSettled: () => {
      client.invalidateQueries({ queryKey: keys.all(tenant) });
      client.invalidateQueries({ queryKey: ['fleet', 'meter-readings', tenant] });
      client.invalidateQueries({ queryKey: ['fleet', 'items', tenant] });
    },
  });
}

export function useSaveFuelLog() {
  return useFuelMutation(({ values, current, submit }: { values: FuelFormValues; current?: FuelLogDto; submit?: boolean }) =>
    current
      ? apiSend<FuelLogDto>('PUT', `${BASE}/${current.fuelLogId}`, toRequest(values, current))
      : apiSend<FuelLogDto>('POST', BASE, toRequest(values, undefined, !!submit)));
}

export type FuelAction = 'submit' | 'approve' | 'reject' | 'cancel';

export function useFuelLogAction() {
  return useFuelMutation(({ id, action, body }: { id: string; action: string; body: unknown }) =>
    apiSend<FuelLogDto>('POST', `${BASE}/${id}/${action}`, body));
}
