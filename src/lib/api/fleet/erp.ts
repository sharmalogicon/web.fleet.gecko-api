'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiGet, apiSend, query } from '@/lib/api/client';
import type { components } from '@/lib/api/fleet.schema';
import { ApiError } from '@/lib/api/problem';
import { useAuth } from '@/lib/contexts/AuthContext';
import type { ApExportBatchDto, ApExportDocumentDto } from './vendorInvoices';

/**
 * SAP Business One (prompt 17): the ERP connection (+ test), code maps, payment pull, reconciliation.
 * A connection whose URL starts with `fake://` is the API's built-in simulator.
 */

type S = components['schemas'];
export type ErpConnectionDto = S['ErpConnectionDto'];
export type SaveErpConnectionRequest = S['SaveErpConnectionRequest'];
export type ErpMappingDto = S['ErpMappingDto'];
export type ErpTestResultDto = S['ErpTestResultDto'];
export type ErpPaymentPullDto = S['ErpPaymentPullDto'];
export type ErpReconciliationRowDto = S['ErpReconciliationRowDto'];

export const MAP_TYPES = ['GL', 'TAX', 'WHT', 'BP'] as const;
export type MapType = (typeof MAP_TYPES)[number];
/** GL maps are keyed by the line kind (fixed list). */
export const GL_KEYS = ['GRN_STOCK', 'GRN_SERVICE', 'WO_SUBLET', 'TYRE_EVENT', 'MANUAL', 'CREDIT'] as const;
export const RECON_RESULTS = ['OK', 'TOTAL_DIFFERS', 'PAID_DIFFERS', 'MISSING_IN_SAP'] as const;

// ── connection form ─────────────────────────────────────────────────────────
export interface ConnectionForm {
  baseUrl: string;
  companyDb: string;
  userName: string;
  passwordRef: string;
  defaultSeries: string;
  isActive: boolean;
  remarks: string;
}

export const EMPTY_CONNECTION: ConnectionForm = { baseUrl: '', companyDb: '', userName: '', passwordRef: '', defaultSeries: '', isActive: true, remarks: '' };

export const isSimulator = (baseUrl: string | null | undefined) => !!baseUrl && baseUrl.trim().toLowerCase().startsWith('fake://');

export function connectionToForm(d: ErpConnectionDto | null | undefined): ConnectionForm {
  if (!d) return EMPTY_CONNECTION;
  return {
    baseUrl: d.baseUrl ?? '', companyDb: d.companyDb ?? '', userName: d.userName ?? '', passwordRef: d.passwordRef ?? '',
    defaultSeries: d.defaultSeries == null ? '' : String(d.defaultSeries), isActive: d.isActive, remarks: d.remarks ?? '',
  };
}

/** Client rules (the API checks again). Values are i18n keys. */
export function connectionErrors(f: ConnectionForm): Record<string, string> {
  const e: Record<string, string> = {};
  const url = f.baseUrl.trim();
  if (!url) e.baseurl = 'erp.rule.baseUrl';
  else if (!isSimulator(url) && !/^https:\/\/.+/i.test(url)) e.baseurl = 'erp.rule.baseUrlFormat';
  if (!f.companyDb.trim()) e.companydb = 'erp.rule.companyDb';
  if (!f.userName.trim()) e.username = 'erp.rule.userName';
  if (f.defaultSeries.trim() && !/^\d+$/.test(f.defaultSeries.trim())) e.defaultseries = 'erp.rule.series';
  return e;
}

const text = (v: string) => (v.trim() ? v.trim() : null);

export function toConnectionRequest(f: ConnectionForm, rowVersion?: string | null): SaveErpConnectionRequest {
  return {
    baseUrl: f.baseUrl.trim(), companyDb: f.companyDb.trim(), userName: f.userName.trim(), passwordRef: text(f.passwordRef),
    defaultSeries: f.defaultSeries.trim() ? Number(f.defaultSeries.trim()) : null, isActive: f.isActive, remarks: text(f.remarks),
    rowVersion: rowVersion ?? null,
  } as SaveErpConnectionRequest;
}

// ── mapping form ────────────────────────────────────────────────────────────
export interface MappingForm {
  mapType: MapType;
  geckoCode: string;
  erpCode: string;
  description: string;
}

/** GL key from the fixed list; TAX / WHT keyed by the rate (a number); BP = a supplier party code. i18n keys. */
export function mappingErrors(f: MappingForm): Record<string, string> {
  const e: Record<string, string> = {};
  const key = f.geckoCode.trim();
  if (!key) e.geckocode = 'erp.rule.geckoCode';
  else if (f.mapType === 'GL' && !(GL_KEYS as readonly string[]).includes(key)) e.geckocode = 'erp.rule.glKey';
  else if ((f.mapType === 'TAX' || f.mapType === 'WHT') && !(/^\d+(\.\d+)?$/.test(key) && Number(key) >= 0 && Number(key) <= 100)) e.geckocode = 'erp.rule.rateKey';
  if (!f.erpCode.trim()) e.erpcode = 'erp.rule.erpCode';
  return e;
}

/** The request: a rate key without trailing zeros (7.00 → 7), a BP code upper-cased. */
export function toMappingRequest(f: MappingForm) {
  let key = f.geckoCode.trim();
  if (f.mapType === 'TAX' || f.mapType === 'WHT') key = String(Number(key));
  if (f.mapType === 'BP') key = key.toUpperCase();
  return { mapType: f.mapType, geckoCode: key, erpCode: f.erpCode.trim(), description: text(f.description) };
}

// ── batch result ────────────────────────────────────────────────────────────
export interface BatchDocResult {
  documentId: string;
  docType: string;
  documentNo: string;
  supplierName: string;
  amount: number;
  posted: boolean;
  erpDocNum: string | null;
  erpError: string | null;
}

/** Each document of a SAP batch: posted (DocNum) or not (error; stays APPROVED and is pending again). */
export function batchResults(b: Pick<ApExportBatchDto, 'documents'>): BatchDocResult[] {
  return (b.documents ?? []).map((d: ApExportDocumentDto) => ({
    documentId: d.documentId, docType: d.docType, documentNo: d.documentNo, supplierName: d.supplierName ?? d.supplierPartyCode,
    amount: Number(d.amount ?? 0), posted: !!d.erpDocNum && !d.erpError, erpDocNum: d.erpDocNum ?? null, erpError: d.erpError ?? null,
  }));
}

export const batchHasFailures = (b: Pick<ApExportBatchDto, 'target' | 'status' | 'documents'>) =>
  b.target === 'SAP_B1' && (b.status === 'PARTLY_FAILED' || b.status === 'FAILED' || batchResults(b).some((d) => !d.posted));

// ── calls + hooks ───────────────────────────────────────────────────────────
function useTenant() {
  return useAuth().user?.tenantId;
}

const keys = {
  connection: (t?: string) => ['fleet', 'erp', t, 'connection'] as const,
  mappings: (t?: string) => ['fleet', 'erp', t, 'mappings'] as const,
  recon: (t: string | undefined, c: object) => ['fleet', 'erp', t, 'recon', c] as const,
};

/** The connection, or null when none is set up yet (404). */
export function useErpConnection(enabled = true) {
  const tenant = useTenant();
  return useQuery({
    queryKey: keys.connection(tenant),
    queryFn: async () => {
      try {
        return await apiGet<ErpConnectionDto>('/api/fleet/setup/erp-connection');
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    },
    enabled,
  });
}

export function useSaveErpConnection() {
  const client = useQueryClient();
  const tenant = useTenant();
  return useMutation({
    mutationFn: ({ form, rowVersion }: { form: ConnectionForm; rowVersion?: string | null }) =>
      apiSend<ErpConnectionDto>('PUT', '/api/fleet/setup/erp-connection', toConnectionRequest(form, rowVersion)),
    onSettled: () => client.invalidateQueries({ queryKey: keys.connection(tenant) }),
  });
}

export function useTestErpConnection() {
  const client = useQueryClient();
  const tenant = useTenant();
  return useMutation({
    mutationFn: () => apiSend<ErpTestResultDto>('POST', '/api/fleet/setup/erp-connection/test'),
    onSettled: () => client.invalidateQueries({ queryKey: keys.connection(tenant) }),
  });
}

export function useErpMappings() {
  const tenant = useTenant();
  return useQuery({ queryKey: keys.mappings(tenant), queryFn: () => apiGet<ErpMappingDto[]>('/api/fleet/setup/erp-mappings') });
}

export function useSaveErpMapping() {
  const client = useQueryClient();
  const tenant = useTenant();
  return useMutation({
    mutationFn: (f: MappingForm) => apiSend<ErpMappingDto>('PUT', '/api/fleet/setup/erp-mappings', toMappingRequest(f)),
    onSettled: () => client.invalidateQueries({ queryKey: keys.mappings(tenant) }),
  });
}

export function useDeleteErpMapping() {
  const client = useQueryClient();
  const tenant = useTenant();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/api/fleet/setup/erp-mappings/${id}`, { method: 'DELETE' }),
    onSettled: () => client.invalidateQueries({ queryKey: keys.mappings(tenant) }),
  });
}

/** Read SAP payments back (`since` = yyyy-MM-dd, optional). */
export function usePullErpPayments() {
  const client = useQueryClient();
  const tenant = useTenant();
  return useMutation({
    mutationFn: (since?: string) => apiSend<ErpPaymentPullDto>('POST', `/api/fleet/erp/payments/pull${query({ since: since || undefined })}`),
    onSettled: () => {
      client.invalidateQueries({ queryKey: ['fleet', 'vendor-invoices', tenant] });
      client.invalidateQueries({ queryKey: keys.connection(tenant) });
    },
  });
}

export function useErpReconciliation(c: { from?: string; to?: string }, enabled: boolean) {
  const tenant = useTenant();
  return useQuery({
    queryKey: keys.recon(tenant, c),
    queryFn: () => apiGet<ErpReconciliationRowDto[]>(`/api/fleet/erp/reconciliation${query(c)}`),
    enabled,
  });
}

export function useRetryExport() {
  const client = useQueryClient();
  const tenant = useTenant();
  return useMutation({
    mutationFn: (batchId: string) => apiSend<ApExportBatchDto>('POST', `/api/fleet/ap-exports/${batchId}/retry`),
    onSettled: () => client.invalidateQueries({ queryKey: ['fleet', 'vendor-invoices', tenant] }),
  });
}

export function useExportBatch(batchId: string | null) {
  const tenant = useTenant();
  return useQuery({
    queryKey: ['fleet', 'vendor-invoices', tenant, 'exports', 'one', batchId],
    queryFn: () => apiGet<ApExportBatchDto>(`/api/fleet/ap-exports/${batchId}`),
    enabled: !!batchId,
  });
}
