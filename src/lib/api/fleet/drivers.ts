'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiSend, query } from '@/lib/api/client';
import type { components } from '@/lib/api/fleet.schema';
import { useAuth } from '@/lib/contexts/AuthContext';
import type { DriverFormValues, DriverStatus } from '@/types/driver';

/** Drivers adapter (prompt 05). Rules: Gecko.Fleet DriverEndpoints.cs. */

type S = components['schemas'];
export type DriverDto = S['DriverDto'];
export type DriverPersonal = S['DriverPersonalDto'];
export type SaveDriverRequest = S['SaveDriverRequest'];
export type DriverSyncResult = S['DriverSyncResult'];
type DriverPage = S['PagedResultOfDriverDto'];

const BASE = '/api/fleet/drivers';
export const MAX_PAGE_SIZE = 200;
export const DEFAULT_CURRENCY = 'THB';
export const SOURCE_TRUCKING = 'TRUCKING';

export interface DriverView extends DriverFormValues {
  id: string;
  branchId: string | null;
  driverSource: string;
  /** A copy of a Trucking driver: identity fields are Trucking's (read-only). */
  isTrucking: boolean;
  /** The caller may not see pay rates: show the inputs empty + disabled. */
  ratesHidden: boolean;
  rowVersion: string;
  dto: DriverDto;
}

/** Form fields Trucking owns on a TRUCKING driver (prompt 05 "Two kinds of driver"). */
export const TRUCKING_OWNED_FIELDS = ['driverCode', 'driverName', 'licenseExpiryDate', 'dateHire', 'dateRelease', 'status'] as const;

/** Form fields filled from GET /personal: always read-only in Fleet. */
export const PERSONAL_FIELDS = [
  'licenseNo', 'idNo', 'mobilePhoneNumber', 'address1', 'address2', 'state', 'postCode', 'countryCode',
  'dob', 'ssNo', 'phoneNumber', 'faxNumber', 'emailID', 'contactPerson',
] as const satisfies readonly (keyof DriverFormValues)[];
export type PersonalField = (typeof PERSONAL_FIELDS)[number];

const n = (v: number | string | null | undefined): number | undefined =>
  v === null || v === undefined || v === '' ? undefined : Number(v);
const text = (v: string | null | undefined): string | null => {
  const s = v?.trim();
  return s ? s : null;
};
const todayIso = () => new Date().toISOString().slice(0, 10);

/** API ACTIVE / LEAVE / INACTIVE → the screen's four. INACTIVE with a past `leftOn` reads TERMINATED. */
export function viewStatus(status: string, leftOn: string | null | undefined, today = todayIso()): DriverStatus {
  if (status === 'LEAVE') return 'ON LEAVE';
  if (status === 'INACTIVE') return leftOn && leftOn <= today ? 'TERMINATED' : 'INACTIVE';
  return 'ACTIVE';
}

/** The screen's status → the API's; TERMINATED = INACTIVE + a leaving date (today when none). */
export function apiStatus(status: DriverStatus, dateRelease: string | undefined): { status: string; leftOn: string | null } {
  if (status === 'ON LEAVE') return { status: 'LEAVE', leftOn: text(dateRelease) };
  if (status === 'TERMINATED') return { status: 'INACTIVE', leftOn: text(dateRelease) ?? todayIso() };
  return { status, leftOn: text(dateRelease) };
}

export function toViewModel(d: DriverDto): DriverView {
  return {
    id: d.driverId,
    branchId: d.branchId,
    driverSource: d.driverSource,
    isTrucking: d.driverSource === SOURCE_TRUCKING,
    ratesHidden: d.ratesHidden,
    rowVersion: d.rowVersion,
    dto: d,
    driverCode: d.driverCode,
    driverName: d.fullName,
    status: viewStatus(d.status, d.leftOn),
    dateHire: d.hiredOn ?? undefined,
    dateRelease: d.leftOn ?? undefined,
    position: d.positionTitle ?? undefined,
    standardRate: d.ratesHidden ? undefined : n(d.costPerHour),
    overtimeRate: d.ratesHidden ? undefined : n(d.otCostPerHour),
    fuelCard: d.fuelCardNo ?? undefined,
    licenseExpiryDate: d.licenceExpiryDate ?? undefined,
    remarks: d.remarks ?? undefined,
  };
}

/**
 * Personal fields for the form. Values when Trucking decrypted them; otherwise `onFile` (the
 * "On file in Trucking" text) in each field whose …OnFile flag is set; empty for a FLEET driver.
 */
export function personalValues(p: DriverPersonal | null | undefined, onFile: string): Partial<Record<PersonalField, string>> {
  if (!p || p.heldIn === 'NONE') return {};
  const pick = (value: string | null, flag: boolean) => (p.valuesAvailable ? value ?? '' : flag ? onFile : '');
  const licence = p.valuesAvailable ? p.licenceNo ?? (p.licenceNoLast4 ? `•••• ${p.licenceNoLast4}` : '') : p.licenceNoOnFile ? onFile : '';
  return {
    licenseNo: licence,
    idNo: pick(p.nationalIdNo, p.nationalIdOnFile),
    mobilePhoneNumber: pick(p.mobile, p.mobileOnFile),
    address1: pick(p.address, p.addressOnFile),
    dob: pick(p.birthDate, p.extraOnFile),
    ssNo: pick(p.socialSecurityNo, p.extraOnFile),
    phoneNumber: pick(p.phone, p.extraOnFile),
    faxNumber: pick(p.fax, p.extraOnFile),
    emailID: pick(p.email, p.extraOnFile),
    contactPerson: pick(p.emergencyContactName, p.extraOnFile),
  };
}

/**
 * The whole record. Fields with no input on the form (nickname, licence class, employment, employer, login, branch)
 * are sent as read. On a TRUCKING driver the API applies only the Fleet fields.
 */
export function toRequest(v: DriverFormValues, current?: DriverView, branchId?: string | null): SaveDriverRequest {
  const d = current?.dto;
  const { status, leftOn } = apiStatus(v.status, v.dateRelease);
  const ratesHidden = !!current?.ratesHidden;
  const cost = ratesHidden ? n(d?.costPerHour) ?? null : v.standardRate ?? null;
  const ot = ratesHidden ? n(d?.otCostPerHour) ?? null : v.overtimeRate ?? null;
  return {
    branchId: d ? d.branchId : branchId ?? null,
    driverCode: v.driverCode.trim().toUpperCase(),
    fullName: v.driverName.trim(),
    nickname: d?.nickname ?? null,
    userId: d?.userId ?? null,
    licenceClass: d?.licenceClass ?? null,
    licenceExpiryDate: text(v.licenseExpiryDate),
    employmentType: d?.employmentType ?? 'EMPLOYEE',
    employerPartyCode: d?.employerPartyCode ?? null,
    hiredOn: text(v.dateHire),
    leftOn,
    status,
    positionTitle: text(v.position),
    costPerHour: cost,
    otCostPerHour: ot,
    currencyCode: cost === null && ot === null ? null : d?.currencyCode ?? DEFAULT_CURRENCY,
    fuelCardNo: text(v.fuelCard),
    remarks: text(v.remarks),
    rowVersion: current?.rowVersion ?? null,
  };
}

const API_TO_FORM: Record<string, keyof DriverFormValues> = {
  drivercode: 'driverCode', fullname: 'driverName', status: 'status', hiredon: 'dateHire', lefton: 'dateRelease',
  positiontitle: 'position', costperhour: 'standardRate', otcostperhour: 'overtimeRate', currencycode: 'standardRate',
  fuelcardno: 'fuelCard', licenceexpirydate: 'licenseExpiryDate', remarks: 'remarks',
};

export function mapFieldErrors(fieldMap: Record<string, string>) {
  const fields: Partial<Record<keyof DriverFormValues, string>> = {};
  const other: string[] = [];
  for (const [key, message] of Object.entries(fieldMap)) {
    const target = API_TO_FORM[key.toLowerCase()];
    if (target) fields[target] ??= message;
    else other.push(message);
  }
  return { fields, other };
}

// ── calls ───────────────────────────────────────────────────────────────────
export interface DriverCriteria {
  search?: string;
  status?: string;
  branchId?: string;
}

export const getDrivers = (c: DriverCriteria) =>
  apiGet<DriverPage>(`${BASE}${query({ ...c, includePool: true, page: 1, pageSize: MAX_PAGE_SIZE })}`);
export const getDriver = (id: string) => apiGet<DriverDto>(`${BASE}/${encodeURIComponent(id)}`);
export const getDriverPersonal = (id: string) => apiGet<DriverPersonal>(`${BASE}/${encodeURIComponent(id)}/personal`);
export const createDriver = (body: SaveDriverRequest) => apiSend<DriverDto>('POST', BASE, body);
export const updateDriver = (id: string, body: SaveDriverRequest) => apiSend<DriverDto>('PUT', `${BASE}/${encodeURIComponent(id)}`, body);
export const syncDriversFromTrucking = () => apiSend<DriverSyncResult>('POST', `${BASE}/sync-from-trucking`);

/** The list's status filter → the API's (TERMINATED / INACTIVE both ask for INACTIVE; the view splits them). */
export function apiStatusFilter(status: string): string | undefined {
  if (status === 'ON LEAVE') return 'LEAVE';
  if (status === 'TERMINATED' || status === 'INACTIVE') return 'INACTIVE';
  if (status === 'ACTIVE') return 'ACTIVE';
  return undefined;
}

// ── hooks ───────────────────────────────────────────────────────────────────
const keys = {
  all: (tenant?: string) => ['fleet', 'drivers', tenant] as const,
  list: (tenant: string | undefined, c: DriverCriteria) => ['fleet', 'drivers', tenant, 'list', c] as const,
  one: (tenant: string | undefined, id: string) => ['fleet', 'drivers', tenant, 'one', id] as const,
  personal: (tenant: string | undefined, id: string) => ['fleet', 'drivers-personal', tenant, id] as const,
};

function useTenant() {
  return useAuth().user?.tenantId;
}

export function useDrivers(c: DriverCriteria) {
  const tenant = useTenant();
  return useQuery({
    queryKey: keys.list(tenant, c),
    queryFn: async () => (await getDrivers(c)).items.map(toViewModel),
    placeholderData: keepPreviousData,
  });
}

export function useDriver(id: string | null) {
  const tenant = useTenant();
  return useQuery({ queryKey: keys.one(tenant, id ?? ''), queryFn: () => getDriver(id!).then(toViewModel), enabled: !!id });
}

/**
 * Personal data, read live from Trucking (each read is audited there): NEVER cached —
 * staleTime 0, dropped from the cache as soon as the form unmounts, no retry, no refetch.
 */
export function useDriverPersonal(id: string | null, enabled: boolean) {
  const tenant = useTenant();
  return useQuery({
    queryKey: keys.personal(tenant, id ?? ''),
    queryFn: () => getDriverPersonal(id!),
    enabled: !!id && enabled,
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function useSaveDriver() {
  const client = useQueryClient();
  const tenant = useTenant();
  return useMutation({
    mutationFn: ({ values, current, branchId }: { values: DriverFormValues; current?: DriverView; branchId?: string | null }) =>
      (current ? updateDriver(current.id, toRequest(values, current)) : createDriver(toRequest(values, undefined, branchId))).then(toViewModel),
    onSettled: () => client.invalidateQueries({ queryKey: keys.all(tenant) }),
  });
}

export function useSyncDrivers() {
  const client = useQueryClient();
  const tenant = useTenant();
  return useMutation({
    mutationFn: syncDriversFromTrucking,
    onSettled: () => client.invalidateQueries({ queryKey: keys.all(tenant) }),
  });
}
