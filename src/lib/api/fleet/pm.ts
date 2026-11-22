'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiGet, apiSend, query } from '@/lib/api/client';
import type { components } from '@/lib/api/fleet.schema';
import { useAuth } from '@/lib/contexts/AuthContext';
import { optNum } from '@/lib/utils/zod';

/** PM Scheduler ⇄ `pm-programs`, PM Due ⇄ `pm/due` (prompt 08 §B, §C). */

type S = components['schemas'];
export type PmProgramDto = S['PmProgramDto'];
export type PmProgramTaskDto = S['PmProgramTaskDto'];
export type PmAssignmentDto = S['PmAssignmentDto'];
export type SavePmProgramRequest = S['SavePmProgramRequest'];
export type PmDueDto = S['PmDueDto'];

const n = (v: number | string | null | undefined): number | undefined =>
  v === null || v === undefined || v === '' ? undefined : Number(v);
const text = (v: string | null | undefined): string | null => {
  const s = v?.trim();
  return s ? s : null;
};
export const todayIso = () => new Date().toISOString().slice(0, 10);

/** The existing form's fields + the services grid (now editable: a schedule without tasks does nothing). */
export const pmFormSchema = z.object({
  scheduleNo: z.string().trim().min(1, 'pm.rule.codeRequired').max(30).regex(/^[A-Za-z0-9\-_/.]+$/, 'pm.rule.code'),
  scheduleDate: z.string().optional(),
  serviceTypeDescription: z.string().trim().min(1, 'pm.rule.nameRequired').max(200),
  serviceType: z.string().optional(),
  meterKm: optNum,
  remarks: z.string().optional(),
  isActive: z.boolean(),
  services: z.array(z.object({
    serviceTaskId: z.string().min(1, 'pm.rule.taskRequired'),
    meterInterval: optNum,
    remarks: z.string().optional(),
    /** The task as read: hours / days intervals, parts and labour have no inputs and are sent back. */
    pmProgramTaskId: z.string().optional(),
  })).superRefine((rows, ctx) => {
    const seen = new Set<string>();
    rows.forEach((r, i) => {
      if (r.serviceTaskId && seen.has(r.serviceTaskId)) ctx.addIssue({ code: 'custom', path: [i, 'serviceTaskId'], message: 'pm.rule.taskTwice' });
      seen.add(r.serviceTaskId);
    });
  }),
});
export type PmFormValues = z.infer<typeof pmFormSchema>;

export const NEW_PM_FORM: PmFormValues = { scheduleNo: '', serviceTypeDescription: '', isActive: true, services: [] };

export function toFormValues(d: PmProgramDto): PmFormValues {
  return {
    scheduleNo: d.programCode,
    scheduleDate: d.effectiveDate ?? undefined,
    serviceTypeDescription: d.nameEn,
    serviceType: d.categoryCode ?? undefined,
    meterKm: n(d.defaultIntervalKm),
    remarks: d.remarks ?? undefined,
    isActive: d.isActive,
    services: [...d.tasks]
      .sort((a, b) => Number(a.seqNo) - Number(b.seqNo))
      .map((t) => ({ serviceTaskId: t.serviceTaskId, meterInterval: n(t.intervalKm), remarks: t.remarks ?? undefined, pmProgramTaskId: t.pmProgramTaskId })),
  };
}

/** The whole program; `tasks` in the form's order, each with what was read for the fields that have no input. */
export function toRequest(v: PmFormValues, current?: PmProgramDto): SavePmProgramRequest {
  const read = new Map((current?.tasks ?? []).map((t) => [t.pmProgramTaskId, t]));
  return {
    programCode: v.scheduleNo.trim().toUpperCase(),
    nameEn: v.serviceTypeDescription.trim(),
    nameLocal: current?.nameLocal ?? null,
    categoryCode: text(v.serviceType)?.toUpperCase() ?? null,
    effectiveDate: text(v.scheduleDate),
    defaultIntervalKm: v.meterKm === undefined ? null : Math.round(v.meterKm),
    assetClass: current?.assetClass ?? null,
    isActive: v.isActive,
    remarks: text(v.remarks),
    tasks: v.services.map((s) => {
      const was = s.pmProgramTaskId ? read.get(s.pmProgramTaskId) : undefined;
      // A row whose task was changed keeps nothing of the old one but its hours / days intervals when the task is the same.
      const same = was && was.serviceTaskId === s.serviceTaskId ? was : undefined;
      return {
        serviceTaskId: s.serviceTaskId,
        intervalKm: s.meterInterval === undefined ? null : Math.round(s.meterInterval),
        intervalHours: n(same?.intervalHours) ?? null,
        intervalDays: n(same?.intervalDays) ?? null,
        remarks: text(s.remarks),
        parts: same ? same.parts.map((p) => ({ itemId: p.itemId, qty: p.qty })) : null,
        labor: same ? same.labor.map((l) => ({ tradeCode: l.tradeCode, stdHours: l.stdHours })) : null,
      };
    }),
    rowVersion: current?.rowVersion ?? null,
  };
}

/** Assignments still in force (the Equipment tab). */
export const activeAssignments = (d: PmProgramDto | undefined, today = todayIso()) =>
  (d?.assignments ?? []).filter((a) => !a.activeTo || a.activeTo >= today);

export const PM_API_TO_FORM = {
  programcode: 'scheduleNo', nameen: 'serviceTypeDescription', categorycode: 'serviceType', effectivedate: 'scheduleDate',
  defaultintervalkm: 'meterKm', remarks: 'remarks', isactive: 'isActive', tasks: 'services',
} as const;

// ── PM Due ──────────────────────────────────────────────────────────────────
export const DUE_STATUSES = ['OK', 'DUE_SOON', 'DUE', 'OVERDUE'] as const;

export interface DueView {
  id: string;
  assetCode: string;
  registrationNo?: string;
  branchId: string;
  programCode: string;
  taskCode: string;
  taskDescription: string;
  lastDoneAt?: string;
  lastDoneKm?: number;
  lastDoneHours?: number;
  lastDoneSource?: string;
  nextDueAt?: string;
  nextDueKm?: number;
  nextDueHours?: number;
  kmLeft?: number;
  hoursLeft?: number;
  daysLeft?: number;
  status: string;
  rowVersion: string;
}

export function toDueView(d: PmDueDto): DueView {
  return {
    id: d.pmTaskStateId, assetCode: d.assetCode, registrationNo: d.registrationNo ?? undefined, branchId: d.branchId,
    programCode: d.programCode, taskCode: d.taskCode, taskDescription: d.taskDescription, lastDoneAt: d.lastDoneAt ?? undefined,
    lastDoneKm: n(d.lastDoneKm), lastDoneHours: n(d.lastDoneHours), lastDoneSource: d.lastDoneSource ?? undefined,
    nextDueAt: d.nextDueAt ?? undefined, nextDueKm: n(d.nextDueKm), nextDueHours: n(d.nextDueHours), kmLeft: n(d.kmLeft),
    hoursLeft: n(d.hoursLeft), daysLeft: n(d.daysLeft), status: d.status, rowVersion: d.rowVersion,
  };
}

/** "1,200 km left" / "350 km late" (negative = late). */
export function leftText(value: number | undefined, unit: string, t: (k: string) => string): string | null {
  if (value === undefined) return null;
  return value < 0 ? `${Math.abs(value).toLocaleString()} ${unit} ${t('pm.late')}` : `${value.toLocaleString()} ${unit} ${t('pm.left')}`;
}

// ── calls + hooks ───────────────────────────────────────────────────────────
const PROGRAMS = '/api/fleet/pm-programs';
const keys = {
  all: (tenant?: string) => ['fleet', 'pm', tenant] as const,
  programs: (tenant: string | undefined, c: object) => ['fleet', 'pm', tenant, 'programs', c] as const,
  program: (tenant: string | undefined, id: string) => ['fleet', 'pm', tenant, 'program', id] as const,
  due: (tenant: string | undefined, c: object) => ['fleet', 'pm', tenant, 'due', c] as const,
};

function useTenant() {
  return useAuth().user?.tenantId;
}

export function usePmPrograms(c: { search?: string; category?: string }) {
  const tenant = useTenant();
  return useQuery({
    queryKey: keys.programs(tenant, c),
    queryFn: async () => (await apiGet<S['PagedResultOfPmProgramDto']>(`${PROGRAMS}${query({ ...c, page: 1, pageSize: 200 })}`)).items,
    placeholderData: keepPreviousData,
  });
}

export function usePmProgram(id: string | null) {
  const tenant = useTenant();
  return useQuery({ queryKey: keys.program(tenant, id ?? ''), queryFn: () => apiGet<PmProgramDto>(`${PROGRAMS}/${id}`), enabled: !!id });
}

function usePmMutation<V, R>(fn: (v: V) => Promise<R>) {
  const client = useQueryClient();
  const tenant = useTenant();
  return useMutation({ mutationFn: fn, onSettled: () => client.invalidateQueries({ queryKey: keys.all(tenant) }) });
}

export function useSavePmProgram() {
  return usePmMutation(({ values, current }: { values: PmFormValues; current?: PmProgramDto }) =>
    current
      ? apiSend<PmProgramDto>('PUT', `${PROGRAMS}/${current.pmProgramId}`, toRequest(values, current))
      : apiSend<PmProgramDto>('POST', PROGRAMS, toRequest(values)));
}

/** "Add equipment": assign from today. */
export function useAssignPm() {
  return usePmMutation(({ programId, assetProfileIds }: { programId: string; assetProfileIds: string[] }) =>
    apiSend<PmProgramDto>('POST', `${PROGRAMS}/${programId}/assignments`, { assetProfileIds, activeFrom: todayIso(), remarks: null }));
}

/** "Remove": end the assignment today (never a delete). */
export function useEndAssignment() {
  return usePmMutation((a: PmAssignmentDto) =>
    apiSend<PmAssignmentDto>('PUT', `/api/fleet/pm-assignments/${a.pmAssignmentId}`, { activeTo: todayIso(), remarks: a.remarks, rowVersion: a.rowVersion }));
}

export interface DueCriteria {
  status?: string;
  dueOnly?: boolean;
  branchId?: string;
  search?: string;
}

export function usePmDue(c: DueCriteria) {
  const tenant = useTenant();
  return useQuery({
    queryKey: keys.due(tenant, c),
    queryFn: async () => (await apiGet<S['PagedResultOfPmDueDto']>(`/api/fleet/pm/due${query({ ...c, page: 1, pageSize: 200 })}`)).items.map(toDueView),
    placeholderData: keepPreviousData,
  });
}

export function useSetBaseline() {
  return usePmMutation(({ id, lastDoneAt, lastDoneKm, lastDoneHours, rowVersion }: { id: string; lastDoneAt: string; lastDoneKm: number | null; lastDoneHours: number | null; rowVersion: string }) =>
    apiSend<PmDueDto>('PUT', `/api/fleet/pm-task-states/${id}/baseline`, { lastDoneAt, lastDoneKm, lastDoneHours, rowVersion }));
}

export function useRecalculatePm() {
  return usePmMutation(() => apiSend<S['PmRecalculateResult']>('POST', '/api/fleet/pm/recalculate'));
}
