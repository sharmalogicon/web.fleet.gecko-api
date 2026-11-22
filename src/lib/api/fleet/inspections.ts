'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiSend, query } from '@/lib/api/client';
import type { components } from '@/lib/api/fleet.schema';
import { useAuth } from '@/lib/contexts/AuthContext';

/** Inspections, checklists (templates) and defects (prompt 10 §B–D). */

type S = components['schemas'];
export type TemplateDto = S['InspectionTemplateDto'];
export type TemplateItemDto = S['TemplateItemDto'];
export type TemplateItemInput = S['TemplateItemInput'];
export type InspectionDto = S['InspectionDto'];
export type DefectDto = S['DefectDto'];
export type SubmitInspectionRequest = S['SubmitInspectionRequest'];

export const INSPECTION_KINDS = ['PRE_TRIP', 'POST_TRIP', 'PERIODIC', 'TYRE', 'HANDOVER'] as const;
export const RESPONSE_TYPES = ['PASS_FAIL', 'NUMBER', 'TEXT', 'PHOTO'] as const;
export const SEVERITIES = ['MINOR', 'MAJOR', 'OUT_OF_SERVICE'] as const;
export const DEFECT_STATUSES = ['OPEN', 'WR_RAISED', 'DEFERRED', 'RESOLVED'] as const;

const n = (v: number | string | null | undefined): number | undefined =>
  v === null || v === undefined || v === '' ? undefined : Number(v);
const text = (v: string | null | undefined): string | null => {
  const s = v?.trim();
  return s ? s : null;
};

// ── checklist lines ─────────────────────────────────────────────────────────
export interface ChecklistLine {
  sectionEn: string;
  sectionLocal: string;
  itemTextEn: string;
  itemTextLocal: string;
  responseType: (typeof RESPONSE_TYPES)[number];
  unitLabel: string;
  minValue: string;
  maxValue: string;
  photoRequiredOnFail: boolean;
  defaultSeverity: (typeof SEVERITIES)[number];
}

export const emptyLine = (section = ''): ChecklistLine => ({
  sectionEn: section, sectionLocal: '', itemTextEn: '', itemTextLocal: '', responseType: 'PASS_FAIL', unitLabel: '', minValue: '', maxValue: '',
  photoRequiredOnFail: false, defaultSeverity: 'MINOR',
});

export function linesOf(d: TemplateDto): ChecklistLine[] {
  return [...d.items].sort((a, b) => Number(a.seqNo) - Number(b.seqNo)).map((i) => ({
    sectionEn: i.sectionEn ?? '', sectionLocal: i.sectionLocal ?? '', itemTextEn: i.itemTextEn, itemTextLocal: i.itemTextLocal ?? '',
    responseType: (RESPONSE_TYPES as readonly string[]).includes(i.responseType) ? (i.responseType as ChecklistLine['responseType']) : 'PASS_FAIL',
    unitLabel: i.unitLabel ?? '', minValue: i.minValue == null ? '' : String(i.minValue), maxValue: i.maxValue == null ? '' : String(i.maxValue),
    photoRequiredOnFail: i.photoRequiredOnFail,
    defaultSeverity: (SEVERITIES as readonly string[]).includes(i.defaultSeverity) ? (i.defaultSeverity as ChecklistLine['defaultSeverity']) : 'MINOR',
  }));
}

/** Line errors (i18n keys) by index; the API keeps lines by position. */
export function lineErrors(lines: ChecklistLine[]): Record<number, string> {
  const e: Record<number, string> = {};
  lines.forEach((l, i) => {
    if (!l.itemTextEn.trim()) e[i] = 'insp.rule.itemText';
    else if (l.responseType === 'NUMBER' && l.minValue !== '' && l.maxValue !== '' && Number(l.minValue) > Number(l.maxValue)) e[i] = 'insp.rule.minMax';
  });
  return e;
}

export function toTemplateItems(lines: ChecklistLine[]): TemplateItemInput[] {
  return lines.map((l) => {
    const isNumber = l.responseType === 'NUMBER';
    return {
      sectionEn: text(l.sectionEn), sectionLocal: text(l.sectionLocal), itemTextEn: l.itemTextEn.trim(), itemTextLocal: text(l.itemTextLocal),
      responseType: l.responseType, unitLabel: isNumber ? text(l.unitLabel) : null,
      minValue: isNumber && l.minValue !== '' ? Number(l.minValue) : null, maxValue: isNumber && l.maxValue !== '' ? Number(l.maxValue) : null,
      photoRequiredOnFail: l.photoRequiredOnFail, defaultSeverity: l.defaultSeverity,
    };
  });
}

// ── answers ─────────────────────────────────────────────────────────────────
export interface Answer {
  response?: 'PASS' | 'FAIL' | 'NA';
  valueNumber?: string;
  valueText?: string;
  comment?: string;
}

/** Outside min–max counts as FAIL on the server: shown red already. */
export function numberFails(item: Pick<TemplateItemDto, 'minValue' | 'maxValue'>, value: string | undefined): boolean {
  if (value === undefined || value.trim() === '') return false;
  const v = Number(value);
  if (Number.isNaN(v)) return true;
  const min = n(item.minValue);
  const max = n(item.maxValue);
  return (min !== undefined && v < min) || (max !== undefined && v > max);
}

export function isFail(item: TemplateItemDto, a: Answer | undefined): boolean {
  if (!a) return false;
  if (item.responseType === 'NUMBER') return numberFails(item, a.valueNumber);
  return a.response === 'FAIL';
}

export function isAnswered(item: TemplateItemDto, a: Answer | undefined): boolean {
  if (!a) return false;
  if (item.responseType === 'NUMBER') return !!a.valueNumber?.trim() && !Number.isNaN(Number(a.valueNumber));
  if (item.responseType === 'TEXT') return !!a.valueText?.trim();
  return !!a.response;
}

/** Problems per line (i18n keys): every line answered, a comment on every FAIL. */
export function answerErrors(items: TemplateItemDto[], answers: Record<string, Answer>): Record<string, string> {
  const e: Record<string, string> = {};
  for (const i of items) {
    const a = answers[i.inspectionTemplateItemId];
    if (!isAnswered(i, a)) e[i.inspectionTemplateItemId] = 'insp.rule.answer';
    else if (isFail(i, a) && !a?.comment?.trim()) e[i.inspectionTemplateItemId] = 'insp.rule.failComment';
  }
  return e;
}

export function toAnswers(items: TemplateItemDto[], answers: Record<string, Answer>): S['InspectionAnswerInput'][] {
  return items.map((i) => {
    const a = answers[i.inspectionTemplateItemId] ?? {};
    return {
      inspectionTemplateItemId: i.inspectionTemplateItemId,
      response: i.responseType === 'NUMBER' || i.responseType === 'TEXT' ? null : a.response ?? null,
      valueNumber: i.responseType === 'NUMBER' && a.valueNumber?.trim() ? Number(a.valueNumber) : null,
      valueText: i.responseType === 'TEXT' ? text(a.valueText) : null,
      comment: text(a.comment),
    };
  });
}

/** Raise-WR priority from the defect's severity (the user may change it). */
export function priorityForSeverity(severity: string): 'URGENT' | 'HIGH' | 'NORMAL' {
  return severity === 'OUT_OF_SERVICE' ? 'URGENT' : severity === 'MAJOR' ? 'HIGH' : 'NORMAL';
}

// ── hooks ───────────────────────────────────────────────────────────────────
function useTenant() {
  return useAuth().user?.tenantId;
}
const k = (tenant: string | undefined, ...rest: unknown[]) => ['fleet', 'inspections', tenant, ...rest];

export function useTemplates(c: { kind?: string; active?: boolean } = {}) {
  const tenant = useTenant();
  return useQuery({ queryKey: k(tenant, 'templates', c), queryFn: () => apiGet<TemplateDto[]>(`/api/fleet/inspection-templates${query(c)}`) });
}

export function useInspections(c: { search?: string; result?: string; from?: string; to?: string }) {
  const tenant = useTenant();
  return useQuery({
    queryKey: k(tenant, 'list', c),
    queryFn: async () => (await apiGet<S['PagedResultOfInspectionDto']>(`/api/fleet/inspections${query({ ...c, page: 1, pageSize: 200 })}`)).items,
    placeholderData: keepPreviousData,
  });
}

export function useInspection(id: string | null) {
  const tenant = useTenant();
  return useQuery({ queryKey: k(tenant, 'one', id), queryFn: () => apiGet<InspectionDto>(`/api/fleet/inspections/${id}`), enabled: !!id });
}

export function useDefects(c: { status?: string; assetProfileId?: string }) {
  const tenant = useTenant();
  return useQuery({
    queryKey: k(tenant, 'defects', c),
    queryFn: async () => (await apiGet<S['PagedResultOfDefectDto']>(`/api/fleet/defects${query({ ...c, page: 1, pageSize: 200 })}`)).items,
    placeholderData: keepPreviousData,
  });
}

function useInspMutation<V, R>(fn: (v: V) => Promise<R>) {
  const client = useQueryClient();
  const tenant = useTenant();
  return useMutation({
    mutationFn: fn,
    onSettled: () => {
      client.invalidateQueries({ queryKey: ['fleet', 'inspections', tenant] });
      client.invalidateQueries({ queryKey: ['fleet', 'work-requests', tenant] });
    },
  });
}

export function useSaveTemplate() {
  return useInspMutation(({ body, id }: { body: S['SaveInspectionTemplateRequest']; id?: string }) =>
    id ? apiSend<TemplateDto>('PUT', `/api/fleet/inspection-templates/${id}`, body) : apiSend<TemplateDto>('POST', '/api/fleet/inspection-templates', body));
}

export function useSubmitInspection() {
  return useInspMutation((body: SubmitInspectionRequest) => apiSend<InspectionDto>('POST', '/api/fleet/inspections', body));
}

export type DefectAction = 'raise-work-request' | 'defer' | 'resolve';

export function useDefectAction() {
  return useInspMutation(({ id, action, body }: { id: string; action: DefectAction; body: S['DefectActionRequest'] }) =>
    apiSend<DefectDto>('POST', `/api/fleet/defects/${id}/${action}`, body));
}
