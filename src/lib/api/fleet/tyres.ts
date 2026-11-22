'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiSend, query } from '@/lib/api/client';
import type { components } from '@/lib/api/fleet.schema';
import { useAuth } from '@/lib/contexts/AuthContext';
import type {
  AxleKind, BodyStyle, MapGeometry2D, MapGeometry3D, RemovalDestination, RemovalReason, Tire, TireHealth, TreadThresholds, Vehicle, VehicleConfig,
} from '@/types/tire-axle-map';

/** Tyres (prompt 13): the axle map (2D / 3D), tyre register, tyre documents (changes, maintenance) and tyre events. */
type S = components['schemas'];
export type AxleMapDto = S['AxleMapDto'];
export type MapTyreDto = S['MapTyreDto'];
export type TyreDto = S['TyreDto'];
export type SaveTyreRequest = S['SaveTyreRequest'];
export type TyreAction = S['TyreAction'];
export type TyreChangeRequest = S['TyreChangeRequest'];
export type TyreMaintenanceRequest = S['TyreMaintenanceRequest'];
export type TyreDocumentDto = S['TyreDocumentDto'];
export type TyreEventDto = S['TyreEventDto'];

/*
 * Backend to-do #5–#8 shipped (prompt 22): driver on the axle map, documentDate on change / maintenance, documentNo / assetCode
 * on events, a tyre's last event. The generated types carry them; these names stay for the existing callers.
 */
export type AxleMapWithDriver = AxleMapDto;
export type DatedTyreChangeRequest = TyreChangeRequest;
export type DatedTyreMaintenanceRequest = TyreMaintenanceRequest;
export type TyreEventWithDoc = TyreEventDto;
export type TyreWithLastEvent = TyreDto;

/** Conditions come only from the tenant's code list (#1: the API checks the code against it). */
export const TYRE_CONDITION_LIST = 'FLEET_TYRE_CONDITION';

const n = (v: number | string | null | undefined, d = 0) => (v === null || v === undefined || v === '' ? d : Number(v));

// ── axle map → the components' Vehicle / VehicleConfig ──────────────────────
const BODY: Record<string, BodyStyle> = { RIGID: 'rigid', TRACTOR: 'tractor', TRAILER: 'trailer', EQUIPMENT: 'rigid' };
const KIND: Record<string, AxleKind> = { STEER: 'steer', DRIVE: 'drive', TRAILER: 'trailer', LIFT: 'lift' };

export function thresholdsOf(d: Pick<AxleMapDto, 'thresholds'>): TreadThresholds {
  return {
    treadWarningMm: n(d.thresholds.treadWarningMm, 7),
    treadCriticalMm: n(d.thresholds.treadCriticalMm, 4),
    pressureTolerancePct: n(d.thresholds.pressureTolerancePct, 10),
  };
}

export function mapTyreToTire(t: MapTyreDto, thresholds: TreadThresholds): Tire {
  return {
    id: t.tyreId, serialNo: t.serialNo, brand: t.brandCode ?? '', model: t.modelName ?? '', size: t.sizeCode ?? '',
    type: t.tyreType === 'RECAP' ? 'recap' : 'new', recapCount: n(t.recapCount), treadMM: n(t.treadMm), originalTreadMM: n(t.originalTreadMm),
    pressurePsi: n(t.pressurePsi), targetPsi: n(t.targetPsi), km: n(t.km), cost: n(t.cost), installedOn: t.installedAt?.slice(0, 10),
    health: (['good', 'warning', 'critical'].includes(t.health) ? t.health : undefined) as TireHealth | undefined,
    pressureAlert: t.pressureAlert, costPerKm: t.costPerKm === null ? null : n(t.costPerKm), thresholds,
  };
}

/** A register tyre (inventory panel) → Tire; health from the map's thresholds. */
export function registerTyreToTire(t: TyreDto, thresholds?: TreadThresholds): Tire {
  return {
    id: t.tyreId, serialNo: t.serialNo, brand: t.brandCode ?? '', model: t.modelName ?? '', size: t.sizeCode ?? '',
    type: t.tyreType === 'RECAP' ? 'recap' : 'new', recapCount: n(t.recapCount), treadMM: n(t.currentTreadMm), originalTreadMM: n(t.originalTreadMm),
    pressurePsi: n(t.lastPressurePsi), targetPsi: n(t.targetPsi), km: n(t.lifetimeKm), cost: n(t.totalCost),
    costPerKm: t.costPerKm === null ? null : n(t.costPerKm), thresholds,
  };
}

function geometry2D(g: AxleMapDto['geometry2D']): MapGeometry2D | undefined {
  if (!g) return undefined;
  return {
    viewBoxWidth: n(g.viewBoxWidth), viewBoxHeight: n(g.viewBoxHeight), centreX: n(g.centreX), railOffsetX: n(g.railOffsetX),
    frameTopY: n(g.frameTopY), frameBottomY: n(g.frameBottomY), axleY: g.axleY.map((v) => n(v)),
    wheels: Object.fromEntries(g.wheels.map((w) => [w.code, { x: n(w.x), y: n(w.y), width: n(w.width), height: n(w.height), rotationDeg: n(w.rotationDeg) }])),
  };
}

function geometry3D(g: AxleMapDto['geometry3D']): MapGeometry3D | undefined {
  if (!g) return undefined;
  return {
    wheelRadius: n(g.wheelRadius), wheelWidth: n(g.wheelWidth), frameHeight: n(g.frameHeight), railOffsetX: n(g.railOffsetX), lengthZ: n(g.lengthZ),
    axleZ: g.axleZ.map((v) => n(v)),
    wheels: Object.fromEntries(g.wheels.map((w) => [w.code, { x: n(w.x), y: n(w.y), z: n(w.z), radius: n(w.radius), width: n(w.width), flat: w.orientation === 'FLAT' }])),
  };
}

/** One response → the config the diagrams draw, the vehicle with its fitment, and the thresholds. */
export function axleMapToVehicle(d: AxleMapWithDriver, driverName = d.driverName ?? d.driverCode ?? ''): { config: VehicleConfig; vehicle: Vehicle; thresholds: TreadThresholds } {
  const thresholds = thresholdsOf(d);
  const config: VehicleConfig = {
    id: d.layoutCode, labelKey: d.layoutCode, label: d.layoutName, body: BODY[d.bodyStyle] ?? 'rigid',
    axles: [...d.axles].sort((a, b) => n(a.axleNo) - n(b.axleNo)).map((a) => ({ kind: KIND[a.axleKind] ?? 'trailer', dual: a.isDual, tireSize: a.tyreSizeCode ?? '' })),
    spares: n(d.spareCount), geometry2D: geometry2D(d.geometry2D), geometry3D: geometry3D(d.geometry3D),
  };
  const fitment: Record<string, Tire> = {};
  for (const p of d.positions) if (p.tyre) fitment[p.code] = mapTyreToTire(p.tyre, thresholds);
  const vehicle: Vehicle = {
    code: d.assetCode, registrationNo: d.registrationNo ?? '', configId: d.layoutCode, odometerKm: n(d.odometerKm), driverName, fitment,
  };
  return { config, vehicle, thresholds };
}

// ── actions from the map → ONE TyreAction line ──────────────────────────────
/** 'wornOut' → 'WORN_OUT'. */
export const reasonCode = (r: RemovalReason) => r.replace(/([A-Z])/g, '_$1').toUpperCase();
export const destinationCode = (d: RemovalDestination) => d.toUpperCase();
const line = (l: Partial<TyreAction> & { action: string }): TyreAction => ({ cost: 0, ...l });

export const tyreLines = {
  install: (position: string, tyreId: string, treadMm?: number, pressurePsi?: number) => line({ action: 'INSTALL', position, tyreId, treadMm: treadMm ?? null, pressurePsi: pressurePsi ?? null }),
  replace: (position: string, tyreId: string, reason: RemovalReason, destination: RemovalDestination, treadBeforeMm: number, treadMm?: number, pressurePsi?: number, warehouseId?: string | null) =>
    line({ action: 'REPLACE', position, tyreId, reasonCode: reasonCode(reason), destination: destinationCode(destination), treadBeforeMm, treadMm: treadMm ?? null, pressurePsi: pressurePsi ?? null, warehouseId: warehouseId ?? null }),
  remove: (position: string, reason: RemovalReason, destination: RemovalDestination, treadMm: number, warehouseId?: string | null) =>
    line({ action: 'REMOVE', position, reasonCode: reasonCode(reason), destination: destinationCode(destination), treadMm, warehouseId: warehouseId ?? null }),
  rotate: (position: string, toPosition: string) => line({ action: 'ROTATE', position, toPosition, reasonCode: 'ROTATION' }),
  inspect: (position: string, treadMm: number, pressurePsi: number, condition?: string | null) => line({ action: 'INSPECT', position, treadMm, pressurePsi, condition: condition ?? null }),
};

// ── register view ───────────────────────────────────────────────────────────
/** Screen `tyreStatus` (prompt 13 §B): SCRAPPED → SCRAP; RECAP type → RECAP; run km → USED; else NEW. */
export function viewTyreStatus(t: Pick<TyreDto, 'status' | 'tyreType' | 'lifetimeKm'>): 'NEW' | 'USED' | 'RECAP' | 'SCRAP' {
  if (t.status === 'SCRAPPED') return 'SCRAP';
  if (t.tyreType === 'RECAP') return 'RECAP';
  return n(t.lifetimeKm) > 0 ? 'USED' : 'NEW';
}
export const TYRE_STATUSES = ['IN_STOCK', 'FITTED', 'AWAITING_REPAIR', 'AT_RECAP', 'SCRAPPED'] as const;

// ── documents → the screens' line rows ──────────────────────────────────────
export interface ChangeLineView { lineNo: number; position: string; toPosition: string; oldSerialNo: string; newSerialNo: string; action: string; condition: string; reason: string; destination: string; remarks: string }

/**
 * Events of one `lineNo` make one screen line: a REPLACE comes back as REMOVE (old serial) + INSTALL (new serial);
 * a single INSTALL / REMOVE / ROTATE / INSPECT row stands alone.
 */
export function changeLines(events: TyreEventDto[]): ChangeLineView[] {
  const groups = new Map<string, TyreEventDto[]>();
  events.forEach((e, i) => {
    const key = e.lineNo === null ? `e${i}` : String(e.lineNo);
    groups.set(key, [...(groups.get(key) ?? []), e]);
  });
  return [...groups.values()].map((es, i) => {
    const out = es.find((e) => e.eventType === 'REMOVE');
    const inn = es.find((e) => e.eventType === 'INSTALL');
    const first = es[0];
    const action = out && inn ? 'REPLACE' : first.eventType;
    const oldSerial = out?.serialNo ?? (action === 'INSTALL' ? '' : first.serialNo);
    return {
      lineNo: first.lineNo === null ? i + 1 : n(first.lineNo), action,
      position: out?.fromPosition ?? inn?.toPosition ?? first.fromPosition ?? first.toPosition ?? '',
      toPosition: action === 'ROTATE' ? first.toPosition ?? '' : '',
      oldSerialNo: oldSerial, newSerialNo: inn?.serialNo ?? '',
      condition: (out ?? first).condition ?? '', reason: (out ?? first).reasonCode ?? '', destination: (out ?? first).destination ?? '',
      remarks: es.map((e) => e.remarks).filter(Boolean).join(' · '),
    };
  });
}

// ── hooks ───────────────────────────────────────────────────────────────────
function useTenant() {
  return useAuth().user?.tenantId;
}
const key = (tenant?: string, ...rest: unknown[]) => ['fleet', 'tyres', tenant, ...rest];

export function useAxleMap(assetProfileId: string | null, format: '2d' | '3d' | 'both') {
  const tenant = useTenant();
  return useQuery({
    queryKey: key(tenant, 'map', assetProfileId, format),
    queryFn: () => apiGet<AxleMapDto>(`/api/fleet/assets/${assetProfileId}/axle-map${query({ format })}`),
    enabled: !!assetProfileId,
    retry: false,
  });
}

export function useTyres(c: { search?: string; status?: string; assetProfileId?: string; warehouseId?: string }, enabled = true) {
  const tenant = useTenant();
  return useQuery({
    queryKey: key(tenant, 'list', c),
    queryFn: async () => (await apiGet<S['PagedResultOfTyreDto']>(`/api/fleet/tyres${query({ ...c, page: 1, pageSize: 200 })}`)).items,
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useTyre(id: string | null) {
  const tenant = useTenant();
  return useQuery({ queryKey: key(tenant, 'one', id), queryFn: () => apiGet<TyreDto>(`/api/fleet/tyres/${id}`), enabled: !!id });
}

export function useTyreDocuments(c: { kind: 'CHANGE' | 'MAINTENANCE'; assetProfileId?: string; search?: string; from?: string; to?: string }, enabled = true) {
  const tenant = useTenant();
  return useQuery({
    queryKey: key(tenant, 'docs', c),
    queryFn: async () => (await apiGet<S['PagedResultOfTyreDocumentDto']>(`/api/fleet/tyre-documents${query({ ...c, page: 1, pageSize: 200 })}`)).items,
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useTyreDocument(id: string | null) {
  const tenant = useTenant();
  return useQuery({ queryKey: key(tenant, 'doc', id), queryFn: () => apiGet<TyreDocumentDto>(`/api/fleet/tyre-documents/${id}`), enabled: !!id });
}

export function useTyreEvents(c: { assetProfileId?: string; tyreId?: string; type?: string; from?: string; to?: string }, enabled = true) {
  const tenant = useTenant();
  return useQuery({
    queryKey: key(tenant, 'events', c),
    queryFn: async () => (await apiGet<S['PagedResultOfTyreEventDto']>(`/api/fleet/tyre-events${query({ ...c, page: 1, pageSize: 200 })}`)).items,
    placeholderData: keepPreviousData,
    enabled,
  });
}

/** Every write refreshes the map, the register, documents and events (one tyre key). */
export function useTyreMutations() {
  const client = useQueryClient();
  const tenant = useTenant();
  const settle = () => {
    client.invalidateQueries({ queryKey: key(tenant) });
    client.invalidateQueries({ queryKey: ['fleet', 'meters', tenant] });
  };
  const save = useMutation({
    mutationFn: ({ id, body }: { id?: string; body: SaveTyreRequest }) => (id ? apiSend<TyreDto>('PUT', `/api/fleet/tyres/${id}`, body) : apiSend<TyreDto>('POST', '/api/fleet/tyres', body)),
    onSettled: settle,
  });
  const change = useMutation({ mutationFn: (body: DatedTyreChangeRequest) => apiSend<TyreDocumentDto>('POST', '/api/fleet/tyre-changes', body), onSettled: settle });
  const maintenance = useMutation({ mutationFn: (body: DatedTyreMaintenanceRequest) => apiSend<TyreDocumentDto>('POST', '/api/fleet/tyre-maintenance', body), onSettled: settle });
  return { save, change, maintenance };
}
