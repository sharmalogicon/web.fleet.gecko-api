'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFile, apiGet, openFile, query } from '@/lib/api/client';
import type { components } from '@/lib/api/fleet.schema';
import { useAuth } from '@/lib/contexts/AuthContext';

/**
 * Reports + inquiries (prompt 16 §B, §C). One catalogue (`GET /reports`) drives the filter fields of each report;
 * a run returns columns + rows (arrays in column order) + totals; the same URL with format=pdf / xlsx downloads a file.
 */

type S = components['schemas'];
export type ReportCatalogueDto = S['ReportCatalogueDto'];
export type ReportColumnDto = S['ReportColumnDto'];
export type ReportResultDto = S['ReportResultDto'];

/** The screens' filter fields (names as in the old param components). */
export type ReportField = 'dateRange' | 'equipmentCode' | 'equipmentCategory' | 'status' | 'vendorName' | 'poNo' | 'serialNo' | 'search' | 'woType' | 'tripType';

const PARAM_TO_FIELD: Record<string, ReportField> = {
  from: 'dateRange', to: 'dateRange', equipmentCode: 'equipmentCode', assetProfileId: 'equipmentCode', category: 'equipmentCategory',
  status: 'status', supplier: 'vendorName', poNo: 'poNo', serialNo: 'serialNo', search: 'search', woType: 'woType', tripType: 'tripType',
};

/** Which filter fields a report shows (replaces the hard-coded PO_REPORT_IDS / TIRE_REPORT_IDS). Unknown params are ignored. */
export function visibleFields(params: readonly string[] | null | undefined): Set<ReportField> {
  const out = new Set<ReportField>();
  for (const p of params ?? []) {
    const f = PARAM_TO_FIELD[p];
    if (f) out.add(f);
  }
  return out;
}

export interface ReportFilterValues {
  dateFrom?: string;
  dateTo?: string;
  equipmentCode?: string;
  equipmentCategory?: string;
  status?: string;
  vendorName?: string;
  poNo?: string;
  serialNo?: string;
  search?: string;
  woType?: string;
  tripType?: string;
  branchId?: string;
}

const value = (v: string | undefined) => {
  const s = v?.trim();
  return !s || s.toUpperCase() === 'ALL' ? undefined : s;
};

/** The screen's values → the API's query names, only for the params the report takes ("All" = left out). */
export function toReportQuery(v: ReportFilterValues, params: readonly string[] | null | undefined): Record<string, string | undefined> {
  const has = new Set(params ?? []);
  const q: Record<string, string | undefined> = {};
  const put = (param: string, val: string | undefined) => { if (has.has(param) && val !== undefined) q[param] = val; };
  put('from', value(v.dateFrom));
  put('to', value(v.dateTo));
  put('equipmentCode', value(v.equipmentCode));
  put('category', value(v.equipmentCategory)?.toUpperCase());
  put('status', value(v.status)?.toUpperCase().replace(/ /g, '_'));
  put('supplier', value(v.vendorName));
  put('poNo', value(v.poNo));
  put('serialNo', value(v.serialNo));
  put('search', value(v.search));
  put('woType', value(v.woType)?.toUpperCase());
  put('tripType', value(v.tripType));
  put('branchId', value(v.branchId));
  return q;
}

const BANGKOK = 'Asia/Bangkok';

/** One cell, by the column's `format` (dates in Thai time, numbers en-US grouping). null / undefined → ''. */
export function formatCell(v: unknown, format: string | null | undefined): string {
  if (v === null || v === undefined || v === '') return '';
  switch (format) {
    case 'dd/MM/yyyy':
    case 'dd/MM/yyyy HH:mm': {
      const s = String(v);
      // A bare date stays that date; a date-time is shown in Thai time.
      const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00+07:00`) : new Date(s);
      if (Number.isNaN(d.getTime())) return s;
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: BANGKOK, day: '2-digit', month: '2-digit', year: 'numeric',
        ...(format === 'dd/MM/yyyy HH:mm' ? { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' as const } : {}),
      }).formatToParts(d);
      const p = (t: string) => parts.find((x) => x.type === t)?.value ?? '';
      return format === 'dd/MM/yyyy' ? `${p('day')}/${p('month')}/${p('year')}` : `${p('day')}/${p('month')}/${p('year')} ${p('hour')}:${p('minute')}`;
    }
    case '#,0.00': return Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    case '#,0.##': return Number(v).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    case '#,0': return Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 });
    default: return typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v);
  }
}

export const alignClass = (align: string | null | undefined) => (align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left');

// ── calls + hooks ───────────────────────────────────────────────────────────
export type ReportKind = 'reports' | 'inquiry';
const path = (kind: ReportKind, code: string) => `/api/fleet/${kind === 'reports' ? 'reports' : 'inquiry'}/${encodeURIComponent(code)}`;

function useTenant() {
  return useAuth().user?.tenantId;
}

export function useReportCatalogue() {
  const tenant = useTenant();
  return useQuery({
    queryKey: ['fleet', 'reports', tenant, 'catalogue'],
    queryFn: () => apiGet<ReportCatalogueDto[]>('/api/fleet/reports'),
    staleTime: 30 * 60_000,
  });
}

/** Runs when `run` is set (the Generate press): `{ seq, q }` — a new seq re-runs with the same filters. */
export function useReportRun(kind: ReportKind, code: string | null, run: { seq: number; q: Record<string, string | undefined> } | null) {
  const tenant = useTenant();
  return useQuery({
    queryKey: ['fleet', 'reports', tenant, kind, code, run],
    queryFn: () => apiGet<ReportResultDto>(`${path(kind, code!)}${query({ ...run!.q, format: 'json' })}`),
    enabled: !!code && !!run,
    staleTime: 0,
  });
}

/** PDF / Excel of the same run, saved by the browser. */
export async function downloadReport(kind: ReportKind, code: string, q: Record<string, string | undefined>, format: 'pdf' | 'xlsx') {
  openFile(await apiFile(`${path(kind, code)}${query({ ...q, format })}`), true);
}
