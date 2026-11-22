'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiSend, query } from '@/lib/api/client';
import type { components } from '@/lib/api/fleet.schema';
import { useAuth } from '@/lib/contexts/AuthContext';
import type { EquipmentFormValues, EquipmentStatus } from '@/types/equipment';

/**
 * Asset register adapter (prompt 03). The equipment screens keep their own field names;
 * this file is the only place that knows the API's. Rules from Gecko.Fleet AssetEndpoints.cs.
 */

type S = components['schemas'];
export type AssetDto = S['AssetDto'];
export type AssetSpec = S['AssetSpecificationDto'];
export type CreateAssetRequest = S['CreateAssetRequest'];
export type UpdateAssetRequest = S['UpdateAssetRequest'];
export type AssetCatalogue = S['AssetCatalogueResponse'];
export type AxleLayout = S['AxleLayoutDto'];
export type AssetSyncResult = S['AssetSyncResult'];
type AssetPage = S['PagedResultOfAssetDto'];

const BASE = '/api/fleet/assets';
/** Gecko.Data PagingExtensions.MaxPageSize. */
export const MAX_PAGE_SIZE = 200;
export const DEFAULT_CURRENCY = 'THB';

/** What the equipment screens work with: their form values plus what the adapter needs back. */
export interface AssetView extends EquipmentFormValues {
  id: string;
  branchId: string;
  assetSource: string;
  /** TRUCKING_VEHICLE / TRUCKING_CHASSIS: identity fields are Trucking's (read-only). */
  isLinked: boolean;
  sourceStatus: string | null;
  rowVersion: string;
  /** The record as loaded: fields the form does not show are sent back unchanged. */
  dto: AssetDto;
}

/**
 * The form fields Trucking owns on a linked asset (prompt 03 §1 + §4 chassisNo → vin).
 * `status` too: a linked asset's status follows Trucking.
 */
export const TRUCKING_OWNED_FIELDS = [
  'code', 'registrationNo', 'brand', 'model', 'yearOfManufacture', 'engineNo', 'chassisNo', 'fuelType', 'ownership', 'status',
] as const satisfies readonly (keyof EquipmentFormValues)[];

// ── value helpers ───────────────────────────────────────────────────────────
const n = (v: number | string | null | undefined): number | undefined =>
  v === null || v === undefined || v === '' ? undefined : Number(v);
/** Optional number for the request: undefined/NaN → null. */
const reqNum = (v: number | undefined): number | null => (v === undefined || Number.isNaN(v) ? null : v);
const text = (v: string | null | undefined): string | null => {
  const s = v?.trim();
  return s ? s : null;
};
const code = (v: string | null | undefined): string | null => text(v)?.toUpperCase() ?? null;
/** Metres (API) ↔ millimetres (the Spec tab's labels). Rounded so 2.6 m shows 2600, not 2600.0000000000005. */
export const mToMm = (m: number | undefined) => (m === undefined ? undefined : Math.round(m * 1000 * 1000) / 1000);
export const mmToM = (mm: number | undefined) => (mm === undefined || Number.isNaN(mm) ? null : Math.round(mm * 1000) / 1_000_000);

/** UNDER REPAIR is not an API status: it comes from Trucking (`sourceStatus`) and is shown read-only. */
export function viewStatus(dto: Pick<AssetDto, 'status' | 'sourceStatus'>): EquipmentStatus {
  if (dto.sourceStatus === 'UNDER_REPAIR') return 'UNDER REPAIR';
  if (dto.status === 'INACTIVE' || dto.status === 'DISPOSED') return dto.status;
  return 'ACTIVE';
}

// ── mapping ─────────────────────────────────────────────────────────────────
export function toViewModel(dto: AssetDto): AssetView {
  const spec = dto.specification ?? null;
  return {
    id: dto.assetProfileId,
    branchId: dto.branchId,
    assetSource: dto.assetSource,
    isLinked: dto.isLinked,
    sourceStatus: dto.sourceStatus,
    rowVersion: dto.rowVersion,
    dto,

    code: dto.assetCode,
    equipmentType: dto.assetClass ?? undefined,
    category: dto.assetCategoryCode ?? undefined,
    status: viewStatus(dto),
    brand: dto.makeCode ?? undefined,
    model: dto.modelName ?? undefined,
    ownership: dto.ownershipType ?? undefined,
    registrationNo: dto.registrationNo ?? undefined,
    engineNo: dto.engineNo ?? undefined,
    chassisNo: dto.vin ?? undefined,
    licenseNo: spec?.licenceNo ?? undefined,
    meterType: dto.meterType ?? undefined,
    yearOfManufacture: n(dto.yearBuilt),
    purchaseDate: dto.inServiceDate ?? undefined,
    purchasePrice: n(dto.acquisitionCost),
    fuelType: dto.fuelType ?? undefined,
    remarks: dto.remarks ?? undefined,
    axleLayoutId: dto.axleLayoutId ?? undefined,
    // Still mock (prompt 03 §4): meters arrive in P2, customer/driver later.
    currentMeter: undefined,
    customerName: undefined,
    driverName: undefined,

    grossWeight: n(spec?.grossWeightKg),
    netWeight: n(spec?.netWeightKg),
    payload: n(spec?.payloadKg),
    length: mToMm(n(spec?.lengthM)),
    width: mToMm(n(spec?.widthM)),
    height: mToMm(n(spec?.heightM)),
    engineCapacity: n(spec?.engineCapacityCc),
    horsePower: n(spec?.horsePowerHp),
    fuelCapacity: n(spec?.fuelCapacityL),
  };
}

/** The whole Spec object (the API replaces every field with what is sent). */
export function toSpecification(v: EquipmentFormValues): NonNullable<CreateAssetRequest['specification']> {
  return {
    grossWeightKg: reqNum(v.grossWeight),
    netWeightKg: reqNum(v.netWeight),
    lengthM: mmToM(v.length),
    widthM: mmToM(v.width),
    heightM: mmToM(v.height),
    engineCapacityCc: v.engineCapacity === undefined ? null : Math.round(v.engineCapacity),
    horsePowerHp: reqNum(v.horsePower),
    fuelCapacityL: reqNum(v.fuelCapacity),
    payloadKg: reqNum(v.payload),
    licenceNo: text(v.licenseNo),
  };
}

const today = () => new Date().toISOString().slice(0, 10);

/** Currency goes with the acquisition cost / residual value (the API refuses one without the other). */
function currencyFor(cost: number | null, residual: number | null, current: string | null | undefined) {
  if (cost === null && residual === null) return current ?? null;
  return current ?? DEFAULT_CURRENCY;
}

/** "New" on the existing form = a FLEET asset at the user's current branch. */
export function toCreateRequest(v: EquipmentFormValues, branchId: string): CreateAssetRequest {
  const cost = reqNum(v.purchasePrice);
  return {
    branchId,
    assetCode: v.code.trim().toUpperCase(),
    assetName: null,
    assetClass: code(v.equipmentType) ?? '',
    assetCategoryCode: code(v.category),
    registrationNo: text(v.registrationNo),
    makeCode: code(v.brand),
    modelName: text(v.model),
    yearBuilt: reqNum(v.yearOfManufacture),
    vin: text(v.chassisNo),
    engineNo: text(v.engineNo),
    fuelType: code(v.fuelType),
    ownershipType: code(v.ownership) ?? 'OWN',
    ownerPartyCode: null,
    meterType: code(v.meterType),
    axleLayoutId: text(v.axleLayoutId),
    inServiceDate: text(v.purchaseDate),
    acquisitionCost: cost,
    currencyCode: currencyFor(cost, null, null),
    remarks: text(v.remarks),
    specification: toSpecification(v),
  };
}

/**
 * The whole record for PUT: everything the form does not show is sent back as loaded.
 * On a linked asset the API ignores the Trucking-owned fields, so sending them is harmless.
 */
export function toUpdateRequest(v: EquipmentFormValues, dto: AssetDto): UpdateAssetRequest {
  const cost = reqNum(v.purchasePrice);
  const residual = reqNum(n(dto.residualValue));
  // UNDER REPAIR is Trucking's and read-only: keep the stored status.
  const status = v.status === 'UNDER REPAIR' ? dto.status : v.status;
  return {
    branchId: dto.branchId,
    assetCode: v.code.trim().toUpperCase(),
    assetName: dto.assetName,
    assetClass: code(v.equipmentType) ?? '',
    assetCategoryCode: code(v.category),
    registrationNo: text(v.registrationNo),
    makeCode: code(v.brand),
    modelName: text(v.model),
    yearBuilt: reqNum(v.yearOfManufacture),
    vin: text(v.chassisNo),
    engineNo: text(v.engineNo),
    fuelType: code(v.fuelType),
    ownershipType: code(v.ownership) ?? dto.ownershipType,
    ownerPartyCode: dto.ownerPartyCode,
    meterType: code(v.meterType) ?? dto.meterType,
    axleLayoutId: text(v.axleLayoutId),
    defaultWorkshopBranchId: dto.defaultWorkshopBranchId,
    costCenterCode: dto.costCenterCode,
    erpAssetCode: dto.erpAssetCode,
    inServiceDate: text(v.purchaseDate),
    acquisitionCost: cost,
    currencyCode: currencyFor(cost, residual, dto.currencyCode),
    residualValue: residual,
    expectedLifeKm: dto.expectedLifeKm,
    expectedLifeMonths: dto.expectedLifeMonths,
    warrantyUntilDate: dto.warrantyUntilDate,
    warrantyUntilKm: dto.warrantyUntilKm,
    remarks: text(v.remarks),
    status,
    // The form has no disposal date: disposing today unless the record already has one (asked in replies/03).
    disposedDate: status === 'DISPOSED' ? dto.disposedDate ?? today() : null,
    rowVersion: dto.rowVersion,
    specification: toSpecification(v),
  };
}

/**
 * API field errors → the form's field names (`specification.netWeightKg` → `netWeight`).
 * Unknown fields come back under their API name for the form's banner.
 */
const API_TO_FORM: Record<string, keyof EquipmentFormValues> = {
  assetcode: 'code', assetclass: 'equipmentType', assetcategorycode: 'category', makecode: 'brand', modelname: 'model',
  yearbuilt: 'yearOfManufacture', inservicedate: 'purchaseDate', acquisitioncost: 'purchasePrice', currencycode: 'purchasePrice',
  ownershiptype: 'ownership', ownerpartycode: 'ownership', vin: 'chassisNo', registrationno: 'registrationNo', engineno: 'engineNo',
  fueltype: 'fuelType', metertype: 'meterType', axlelayoutid: 'axleLayoutId', remarks: 'remarks', status: 'status', disposeddate: 'status',
  'specification.grossweightkg': 'grossWeight', 'specification.netweightkg': 'netWeight', 'specification.lengthm': 'length',
  'specification.widthm': 'width', 'specification.heightm': 'height', 'specification.enginecapacitycc': 'engineCapacity',
  'specification.horsepowerhp': 'horsePower', 'specification.fuelcapacityl': 'fuelCapacity', 'specification.payloadkg': 'payload',
  'specification.licenceno': 'licenseNo',
};

export function mapFieldErrors(fieldMap: Record<string, string>): { fields: Partial<Record<keyof EquipmentFormValues, string>>; other: string[] } {
  const fields: Partial<Record<keyof EquipmentFormValues, string>> = {};
  const other: string[] = [];
  for (const [key, message] of Object.entries(fieldMap)) {
    const target = API_TO_FORM[key.toLowerCase()];
    if (target) fields[target] ??= message;
    else other.push(message);
  }
  return { fields, other };
}

// ── calls ───────────────────────────────────────────────────────────────────
export interface AssetCriteria {
  search?: string;
  /** API status only (ACTIVE / INACTIVE / DISPOSED). */
  status?: string;
  assetClass?: string;
  branchId?: string;
}

export const getAssets = (c: AssetCriteria) =>
  apiGet<AssetPage>(`${BASE}${query({ search: c.search, status: c.status, assetClass: c.assetClass, branchId: c.branchId, page: 1, pageSize: MAX_PAGE_SIZE })}`);
export const getAsset = (id: string) => apiGet<AssetDto>(`${BASE}/${encodeURIComponent(id)}`);
export const createAsset = (body: CreateAssetRequest) => apiSend<AssetDto>('POST', BASE, body);
export const updateAsset = (id: string, body: UpdateAssetRequest) => apiSend<AssetDto>('PUT', `${BASE}/${encodeURIComponent(id)}`, body);
export const syncAssetsFromTrucking = () => apiSend<AssetSyncResult>('POST', `${BASE}/sync-from-trucking`);
export const getAssetCatalogue = () => apiGet<AssetCatalogue>(`${BASE}/catalogue`);
export const getAxleLayouts = () => apiGet<AxleLayout[]>(`/api/fleet/axle-layouts${query({ activeOnly: true })}`);

// ── hooks ───────────────────────────────────────────────────────────────────
export const assetKeys = {
  all: (tenantId?: string) => ['fleet', 'assets', tenantId] as const,
  list: (tenantId: string | undefined, c: AssetCriteria) => ['fleet', 'assets', tenantId, 'list', c] as const,
  one: (tenantId: string | undefined, id: string) => ['fleet', 'assets', tenantId, 'one', id] as const,
  catalogue: (tenantId?: string) => ['fleet', 'assets', tenantId, 'catalogue'] as const,
  layouts: (tenantId?: string) => ['fleet', 'axle-layouts', tenantId] as const,
};

function useTenant() {
  return useAuth().user?.tenantId;
}

export function useAssets(c: AssetCriteria) {
  const tenant = useTenant();
  return useQuery({
    queryKey: assetKeys.list(tenant, c),
    queryFn: async () => {
      const page = await getAssets(c);
      return { rows: page.items.map(toViewModel), totalCount: n(page.totalCount) ?? page.items.length, hasMore: page.hasMore };
    },
    placeholderData: keepPreviousData,
  });
}

export function useAsset(id: string | null) {
  const tenant = useTenant();
  return useQuery({
    queryKey: assetKeys.one(tenant, id ?? ''),
    queryFn: () => getAsset(id!).then(toViewModel),
    enabled: !!id,
  });
}

export function useAssetCatalogue() {
  const tenant = useTenant();
  return useQuery({ queryKey: assetKeys.catalogue(tenant), queryFn: getAssetCatalogue, staleTime: 30 * 60_000 });
}

export function useAxleLayouts() {
  const tenant = useTenant();
  return useQuery({ queryKey: assetKeys.layouts(tenant), queryFn: getAxleLayouts, staleTime: 10 * 60_000 });
}

/** Create (no `current`) or update. Lists and the record are refetched either way (a 409 means stale). */
export function useSaveAsset() {
  const client = useQueryClient();
  const tenant = useTenant();
  return useMutation({
    mutationFn: ({ values, current, branchId }: { values: EquipmentFormValues; current?: AssetView; branchId: string | null }) => {
      if (current) return updateAsset(current.id, toUpdateRequest(values, current.dto)).then(toViewModel);
      if (!branchId) throw new Error('No branch selected.');
      return createAsset(toCreateRequest(values, branchId)).then(toViewModel);
    },
    onSettled: () => client.invalidateQueries({ queryKey: assetKeys.all(tenant) }),
  });
}

export function useSyncAssets() {
  const client = useQueryClient();
  const tenant = useTenant();
  return useMutation({
    mutationFn: syncAssetsFromTrucking,
    onSettled: () => client.invalidateQueries({ queryKey: assetKeys.all(tenant) }),
  });
}
