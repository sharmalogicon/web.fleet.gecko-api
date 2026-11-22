'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiGet, apiSend, query } from '@/lib/api/client';
import type { components } from '@/lib/api/fleet.schema';
import { useAuth } from '@/lib/contexts/AuthContext';

/**
 * Accident reports (prompt 14 §C). Status OPEN → UNDER_REPAIR (work request raised) → CLOSED, CANCELLED — actions only.
 * The screen shows ONE third party (owner Q5): sent as a one-item `parties` list (empty list = none).
 */

type S = components['schemas'];
export type AccidentDto = S['AccidentDto'];
export type SaveAccidentRequest = S['SaveAccidentRequest'];
export type AccidentPartyInput = S['AccidentPartyInput'];

const BASE = '/api/fleet/accidents';
export const ACCIDENT_STATUSES = ['OPEN', 'UNDER_REPAIR', 'CLOSED', 'CANCELLED'] as const;
export const ACCIDENT_STATUS_TONE: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-700',
  UNDER_REPAIR: 'bg-amber-100 text-amber-700',
  CLOSED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

const text = (v: string | null | undefined): string | null => {
  const s = v?.trim();
  return s ? s : null;
};
const n = (v: number | string | null | undefined): number | undefined =>
  v === null || v === undefined || v === '' ? undefined : Number(v);

/** `yyyy-MM-ddTHH:mm` (local) for a datetime-local input. */
export function localDateTime(iso?: string | null): string {
  const d = iso ? new Date(iso) : new Date();
  const pad = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ── form ────────────────────────────────────────────────────────────────────
const optNumber = z.preprocess(
  (v) => (v === '' || v === null || v === undefined || (typeof v === 'number' && Number.isNaN(v)) ? undefined : Number(v)),
  z.number().optional(),
);

/** The screen's field names + ids + the third-party block. Messages are i18n keys. */
export const accidentFormSchema = z.object({
  documentNo: z.string().optional(),
  accidentDate: z.string().min(1, 'accident.rule.date'),
  equipmentCode: z.string().trim().min(1, 'accident.rule.asset'),
  assetProfileId: z.string().min(1, 'accident.rule.asset'),
  driverName: z.string().max(120).optional(),
  driverID: z.string().optional(),
  driverId: z.string().optional(),
  accidentType: z.string().min(1, 'accident.rule.type'),
  responsibility: z.string().min(1),
  accidentLocation: z.string().max(300).optional(),
  policeStation: z.string().max(120).optional(),
  policeReportNo: z.string().max(60).optional(),
  insPolicyNo: z.string().max(60).optional(),
  refClaimNo: z.string().optional(),
  insClaimable: z.boolean(),
  aboutAccident: z.string().max(4000).optional(),
  damageDetails: z.string().max(4000).optional(),
  address: z.string().max(300).optional(),
  city: z.string().max(100).optional(),
  country: z.string().trim().refine((v) => v === '' || /^[A-Za-z]{2}$/.test(v), 'accident.rule.country').optional(),
  hasInjuries: z.boolean(),
  estimatedCost: optNumber,
  // One third party (General tab).
  tpName: z.string().max(200).optional(),
  tpPartyCode: z.string().optional(),
  tpPlate: z.string().max(30).optional(),
  tpVehicle: z.string().max(200).optional(),
  tpInsurer: z.string().max(200).optional(),
  tpInsurerPolicy: z.string().max(60).optional(),
  tpContact: z.string().max(120).optional(),
  tpPhone: z.string().max(40).optional(),
  tpStatement: z.string().max(2000).optional(),
}).superRefine((v, ctx) => {
  const anyTp = [v.tpPartyCode, v.tpPlate, v.tpVehicle, v.tpInsurer, v.tpInsurerPolicy, v.tpContact, v.tpPhone, v.tpStatement].some((x) => x?.trim());
  if (anyTp && !v.tpName?.trim()) ctx.addIssue({ code: 'custom', path: ['tpName'], message: 'accident.rule.tpName' });
});
export type AccidentFormValues = z.infer<typeof accidentFormSchema>;

export const NEW_ACCIDENT_FORM: AccidentFormValues = {
  documentNo: '', accidentDate: localDateTime(), equipmentCode: '', assetProfileId: '', driverName: '', driverID: '', driverId: '',
  accidentType: 'COLLISION', responsibility: 'UNKNOWN', accidentLocation: '', policeStation: '', policeReportNo: '', insPolicyNo: '',
  refClaimNo: '', insClaimable: false, aboutAccident: '', damageDetails: '', address: '', city: '', country: '', hasInjuries: false,
  tpName: '', tpPartyCode: '', tpPlate: '', tpVehicle: '', tpInsurer: '', tpInsurerPolicy: '', tpContact: '', tpPhone: '', tpStatement: '',
};

export function toFormValues(d: AccidentDto): AccidentFormValues {
  const p = d.parties?.[0];
  return {
    documentNo: d.documentNo,
    accidentDate: localDateTime(d.occurredAt),
    equipmentCode: d.assetCode,
    assetProfileId: d.assetProfileId,
    // On-file driver → code in "Driver ID"; free name otherwise.
    driverName: d.driverName ?? '',
    driverID: d.driverCode ?? '',
    driverId: d.driverId ?? '',
    accidentType: d.accidentType,
    responsibility: d.responsibility,
    accidentLocation: d.locationText ?? '',
    policeStation: d.policeStation ?? '',
    policeReportNo: d.policeReportNo ?? '',
    insPolicyNo: d.insurancePolicyNo ?? '',
    refClaimNo: d.claimNo ?? '',
    insClaimable: d.isClaimable,
    aboutAccident: d.description ?? '',
    damageDetails: d.damageDetails ?? '',
    address: d.address ?? '',
    city: d.city ?? '',
    country: d.countryCode ?? '',
    hasInjuries: d.hasInjuries,
    estimatedCost: n(d.estimatedCost),
    tpName: p?.partyName ?? '',
    tpPartyCode: p?.partyCode ?? '',
    tpPlate: p?.vehiclePlate ?? '',
    tpVehicle: p?.vehicleDescription ?? '',
    tpInsurer: p?.insurerName ?? '',
    tpInsurerPolicy: p?.insurerPolicyNo ?? '',
    tpContact: p?.contactName ?? '',
    tpPhone: p?.contactPhone ?? '',
    tpStatement: p?.statement ?? '',
  };
}

/** The screen's one third party → `parties` (one item, or empty = none). */
export function toParties(v: AccidentFormValues): AccidentPartyInput[] {
  const name = text(v.tpName);
  if (!name) return [];
  return [{
    partyName: name,
    partyCode: text(v.tpPartyCode)?.toUpperCase() ?? null,
    vehiclePlate: text(v.tpPlate),
    vehicleDescription: text(v.tpVehicle),
    insurerName: text(v.tpInsurer),
    insurerPolicyNo: text(v.tpInsurerPolicy),
    contactName: text(v.tpContact),
    contactPhone: text(v.tpPhone),
    statement: text(v.tpStatement),
  }];
}

export function toRequest(v: AccidentFormValues, current?: AccidentDto): SaveAccidentRequest {
  const driverId = text(v.driverId);
  return {
    assetProfileId: v.assetProfileId,
    occurredAt: new Date(v.accidentDate).toISOString(),
    accidentType: v.accidentType,
    responsibility: v.responsibility,
    documentDate: current?.documentDate ?? null,
    driverId,
    // A free name only when the driver is not on file.
    driverName: driverId ? null : text(v.driverName),
    locationText: text(v.accidentLocation),
    address: text(v.address),
    city: text(v.city),
    countryCode: text(v.country)?.toUpperCase() ?? null,
    latitude: current?.latitude ?? null,
    longitude: current?.longitude ?? null,
    policeStation: text(v.policeStation),
    policeReportNo: text(v.policeReportNo),
    hasInjuries: v.hasInjuries,
    description: text(v.aboutAccident),
    damageDetails: text(v.damageDetails),
    insurancePolicyNo: text(v.insPolicyNo),
    isClaimable: v.insClaimable,
    estimatedCost: v.estimatedCost === undefined || Number.isNaN(v.estimatedCost) ? null : v.estimatedCost,
    remarks: current?.remarks ?? null,
    parties: toParties(v),
    rowVersion: current?.rowVersion ?? null,
  };
}

export const ACCIDENT_API_TO_FORM = {
  assetprofileid: 'equipmentCode', occurredat: 'accidentDate', accidenttype: 'accidentType', responsibility: 'responsibility',
  driverid: 'driverID', drivername: 'driverName', locationtext: 'accidentLocation', address: 'address', city: 'city',
  countrycode: 'country', policestation: 'policeStation', policereportno: 'policeReportNo', description: 'aboutAccident',
  damagedetails: 'damageDetails', insurancepolicyno: 'insPolicyNo', estimatedcost: 'estimatedCost', parties: 'tpName',
} as const;

export function accidentActions(d: AccidentDto | undefined, can: { manage: boolean; raiseWr: boolean }) {
  const s = d?.status ?? 'NEW';
  const openWo = (d?.workOrders ?? []).some((w) => !['COMPLETED', 'CLOSED', 'CANCELLED'].includes(w.status));
  return {
    save: (s === 'NEW' || s === 'OPEN' || s === 'UNDER_REPAIR') && can.manage,
    raiseWr: s === 'OPEN' && !d?.workRequestId && can.manage && can.raiseWr,
    close: (s === 'OPEN' || s === 'UNDER_REPAIR') && can.manage,
    /** Close is refused (409) while a repair WO is open: the button shows, with a hint. */
    closeBlocked: openWo,
    cancel: s === 'OPEN' && can.manage,
  };
}

/** A row for the existing list cells (old field names). */
export interface AccidentRow {
  accidentID: string;
  documentNo: string;
  accidentDate: string;
  equipmentCode: string;
  driverName?: string;
  accidentType: string;
  accidentLocation?: string;
  insPolicyNo?: string;
  refClaimNo?: string;
  insClaimable: boolean;
  status: string;
}

export function toRow(d: AccidentDto): AccidentRow {
  return {
    accidentID: d.accidentId,
    documentNo: d.documentNo,
    accidentDate: d.occurredAt,
    equipmentCode: d.assetCode,
    driverName: d.driverName ?? d.driverCode ?? undefined,
    accidentType: d.accidentType,
    accidentLocation: d.locationText ?? d.city ?? undefined,
    insPolicyNo: d.insurancePolicyNo ?? undefined,
    refClaimNo: d.claimNo ?? undefined,
    insClaimable: d.isClaimable,
    status: d.status,
  };
}

// ── calls + hooks ───────────────────────────────────────────────────────────
export interface AccidentCriteria {
  search?: string;
  accidentType?: string;
  status?: string;
  from?: string;
  to?: string;
}

const keys = {
  all: (tenant?: string) => ['fleet', 'accidents', tenant] as const,
  list: (tenant: string | undefined, c: object) => ['fleet', 'accidents', tenant, 'list', c] as const,
  one: (tenant: string | undefined, id: string) => ['fleet', 'accidents', tenant, 'one', id] as const,
};

function useTenant() {
  return useAuth().user?.tenantId;
}

export function useAccidents(c: AccidentCriteria) {
  const tenant = useTenant();
  return useQuery({
    queryKey: keys.list(tenant, c),
    queryFn: async () => (await apiGet<S['PagedResultOfAccidentDto']>(`${BASE}${query({ ...c, page: 1, pageSize: 200 })}`)).items,
    placeholderData: keepPreviousData,
  });
}

export function useAccident(id: string | null) {
  const tenant = useTenant();
  return useQuery({ queryKey: keys.one(tenant, id ?? ''), queryFn: () => apiGet<AccidentDto>(`${BASE}/${id}`), enabled: !!id });
}

function useAccidentMutation<V, R>(fn: (v: V) => Promise<R>) {
  const client = useQueryClient();
  const tenant = useTenant();
  return useMutation({
    mutationFn: fn,
    onSettled: () => {
      client.invalidateQueries({ queryKey: keys.all(tenant) });
      client.invalidateQueries({ queryKey: ['fleet', 'work-requests', tenant] });
      client.invalidateQueries({ queryKey: ['fleet', 'insurance-claims', tenant] });
    },
  });
}

export function useSaveAccident() {
  return useAccidentMutation(({ values, current }: { values: AccidentFormValues; current?: AccidentDto }) =>
    current
      ? apiSend<AccidentDto>('PUT', `${BASE}/${current.accidentId}`, toRequest(values, current))
      : apiSend<AccidentDto>('POST', BASE, toRequest(values)));
}

/** close · cancel { reason } · work-request { priority, problem, meterKm, billToPartyCode }. */
export function useAccidentAction() {
  return useAccidentMutation(({ id, action, body }: { id: string; action: string; body: unknown }) =>
    apiSend<AccidentDto>('POST', `${BASE}/${id}/${action}`, body));
}
