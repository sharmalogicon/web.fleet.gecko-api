'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiSend, query } from '@/lib/api/client';
import type { components } from '@/lib/api/platform.schema';
import { useAuth } from '@/lib/contexts/AuthContext';
import type { TransporterFormValues } from '@/types/transporter';

/**
 * Suppliers adapter (prompt 06): the Transporters page = suppliers in category TRANSPORT (Platform API).
 * Reused later by purchase orders / vendor invoices for their supplier lookups.
 */

type S = components['schemas'];
export type SupplierDto = S['SupplierResponse'];
export type CreateSupplierRequest = S['CreateSupplierRequest'];
export type SaveSupplierRequest = S['SaveSupplierRequest'];
export type SupplierTerms = S['SupplierTermsInput'];
type SupplierPage = S['PagedResultOfSupplierResponse'];

const BASE = '/api/master/suppliers';
export const TRANSPORT = 'TRANSPORT';
export const MAX_PAGE_SIZE = 200;

export interface TransporterView extends TransporterFormValues {
  partyCode: string;
  /** The party also has other roles (customer, …): its party fields are edited on the party screen. */
  partyLocked: boolean;
  otherRoles: string[];
  dto: SupplierDto;
}

const text = (v: string | null | undefined): string | null => {
  const s = v?.trim();
  return s ? s : null;
};

export function toViewModel(d: SupplierDto): TransporterView {
  return {
    partyCode: d.partyCode,
    partyLocked: d.otherRoles.length > 0,
    otherRoles: d.otherRoles,
    dto: d,
    transporterName: d.nameEn,
    registrationNo: d.registrationNo ?? '',
    emailID: d.email ?? '',
    mobileNo: d.phone ?? undefined,
    billingAddress: d.address ?? undefined,
    isActive: d.isActive,
  };
}

/** The terms as read (this form has no inputs for them), TRANSPORT kept in the categories. */
export function termsOf(d: SupplierDto): SupplierTerms {
  return {
    categories: d.categories.includes(TRANSPORT) ? d.categories : [...d.categories, TRANSPORT],
    paymentTermCode: d.paymentTermCode,
    creditTermDays: d.creditTermDays,
    withholdingTaxCode: d.withholdingTaxCode,
    leadTimeDays: d.leadTimeDays,
    minOrderAmount: d.minOrderAmount,
    minOrderCurrency: d.minOrderCurrency,
    erpBpCode: d.erpBpCode,
    rating: d.rating,
    supplierStatus: d.supplierStatus,
    statusReason: d.statusReason,
  };
}

export function toCreateRequest(v: TransporterFormValues): CreateSupplierRequest {
  return {
    nameEn: v.transporterName.trim(),
    registrationNo: text(v.registrationNo),
    email: text(v.emailID),
    phone: text(v.mobileNo),
    address: text(v.billingAddress),
    terms: { categories: [TRANSPORT], supplierStatus: 'APPROVED' },
  };
}

/**
 * PUT: terms unchanged + rowVersion. Party fields only when the party has no other role
 * (otherwise null = unchanged; the API would answer 403 "is also a customer …").
 */
export function toSaveRequest(v: TransporterFormValues, current: TransporterView): SaveSupplierRequest {
  const base: SaveSupplierRequest = { terms: termsOf(current.dto), rowVersion: current.dto.rowVersion };
  if (current.partyLocked) return base;
  return {
    ...base,
    nameEn: v.transporterName.trim(),
    registrationNo: text(v.registrationNo),
    email: text(v.emailID),
    phone: text(v.mobileNo),
    address: text(v.billingAddress),
    isActive: v.isActive,
    partyRowVersion: current.dto.partyRowVersion,
  };
}

const API_TO_FORM: Record<string, keyof TransporterFormValues> = {
  nameen: 'transporterName', registrationno: 'registrationNo', email: 'emailID', phone: 'mobileNo', address: 'billingAddress', isactive: 'isActive',
};

/** `terms.<field>` has no input here: those messages go to the banner. */
export function mapFieldErrors(fieldMap: Record<string, string>) {
  const fields: Partial<Record<keyof TransporterFormValues, string>> = {};
  const other: string[] = [];
  for (const [key, message] of Object.entries(fieldMap)) {
    const target = API_TO_FORM[key.toLowerCase()];
    if (target) fields[target] ??= message;
    else other.push(message);
  }
  return { fields, other };
}

// ── calls ───────────────────────────────────────────────────────────────────
export const getSuppliers = (c: { search?: string; category?: string; includeInactive?: boolean }) =>
  apiGet<SupplierPage>(`${BASE}${query({ ...c, page: 1, pageSize: MAX_PAGE_SIZE })}`);
export const getSupplier = (partyCode: string) => apiGet<SupplierDto>(`${BASE}/${encodeURIComponent(partyCode)}`);
export const createSupplier = (body: CreateSupplierRequest) => apiSend<SupplierDto>('POST', BASE, body);
export const saveSupplier = (partyCode: string, body: SaveSupplierRequest) =>
  apiSend<SupplierDto>('PUT', `${BASE}/${encodeURIComponent(partyCode)}`, body);

// ── hooks ───────────────────────────────────────────────────────────────────
const keys = {
  all: (tenant?: string) => ['platform', 'suppliers', tenant] as const,
  list: (tenant: string | undefined, c: object) => ['platform', 'suppliers', tenant, 'list', c] as const,
  one: (tenant: string | undefined, code: string) => ['platform', 'suppliers', tenant, 'one', code] as const,
};

function useTenant() {
  return useAuth().user?.tenantId;
}

export function useTransporters(search?: string) {
  const tenant = useTenant();
  const c = { search, category: TRANSPORT, includeInactive: true };
  return useQuery({
    queryKey: keys.list(tenant, c),
    queryFn: async () => (await getSuppliers(c)).items.map(toViewModel),
    placeholderData: keepPreviousData,
  });
}

/** Any category: the supplier lookup of later forms (POs, vendor invoices). */
export function useSupplierLookup(search: string, category?: string, enabled = true) {
  const tenant = useTenant();
  const c = { search: search || undefined, category };
  return useQuery({
    queryKey: keys.list(tenant, c),
    queryFn: async () => (await getSuppliers(c)).items,
    enabled,
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useTransporter(partyCode: string | null) {
  const tenant = useTenant();
  return useQuery({ queryKey: keys.one(tenant, partyCode ?? ''), queryFn: () => getSupplier(partyCode!).then(toViewModel), enabled: !!partyCode });
}

export function useSaveTransporter() {
  const client = useQueryClient();
  const tenant = useTenant();
  return useMutation({
    mutationFn: ({ values, current }: { values: TransporterFormValues; current?: TransporterView }) =>
      (current ? saveSupplier(current.partyCode, toSaveRequest(values, current)) : createSupplier(toCreateRequest(values))).then(toViewModel),
    onSettled: () => client.invalidateQueries({ queryKey: keys.all(tenant) }),
  });
}
