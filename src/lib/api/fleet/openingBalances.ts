'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFile, apiSend, apiUpload, openFile } from '@/lib/api/client';
import type { components } from '@/lib/api/fleet.schema';
import { useAuth } from '@/lib/contexts/AuthContext';

/**
 * Go-live opening balances from Excel (prompt 18 §A) + "Sync everything from Trucking" (§B).
 * Each kind: download the template → upload & check (commit=false) → import (commit=true) once the same file checked clean.
 */

type S = components['schemas'];
export type OpeningImportResultDto = S['OpeningImportResultDto'];
export type TruckingSyncResult = S['TruckingSyncResult'];

/** In the runbook's order. */
export const OPENING_KINDS = ['METERS', 'PM_BASELINES', 'STOCK', 'TYRES'] as const;
export type OpeningKind = (typeof OPENING_KINDS)[number];

/** The permission that shows each card. */
export const KIND_PERMISSION: Record<OpeningKind, string> = {
  METERS: 'fleet.meter.record',
  PM_BASELINES: 'fleet.pm.manage',
  STOCK: 'fleet.inventory.manage',
  TYRES: 'fleet.tyre.manage',
};

/** Template columns (help text). */
export const KIND_COLUMNS: Record<OpeningKind, string> = {
  METERS: 'AssetCode, Kind (KM|HOUR), Reading, ReadingDate',
  PM_BASELINES: 'AssetCode, ProgramCode, TaskCode, LastDoneDate, LastDoneKm, LastDoneHours',
  STOCK: 'WarehouseCode, ItemCode, Qty, UnitCost, BinCode, LotNo, SerialNo',
  TYRES: 'SerialNo, WarehouseCode | AssetCode + Position, FittedKm, BrandCode, ModelName, SizeCode, TyreType, RecapCount, OriginalTreadMm, CurrentTreadMm, PurchasedDate, PurchaseCost',
};

/** A file's identity for the "same file" rule (name + size + last change). */
export const fileKey = (f: Pick<File, 'name' | 'size' | 'lastModified'>) => `${f.name}|${f.size}|${f.lastModified}`;

export interface ImportView {
  rows: number;
  valid: number;
  committed: number;
  dryRun: boolean;
  /** Excel row number + message, in row order. */
  errors: { row: number; message: string }[];
  clean: boolean;
}

export function toImportView(r: OpeningImportResultDto): ImportView {
  const errors = (r.errors ?? []).map((e) => ({ row: Number(e.row), message: e.message })).sort((a, b) => a.row - b.row);
  return { rows: Number(r.rows), valid: Number(r.valid), committed: Number(r.committed), dryRun: r.dryRun, errors, clean: errors.length === 0 && Number(r.rows) > 0 };
}

/**
 * Import is allowed only after a check (dry run) with no errors on the SAME file still picked.
 * `checked` = the last check: its file key and result.
 */
export function canImport(picked: File | null, checked: { key: string; view: ImportView } | null): boolean {
  return !!picked && !!checked && checked.key === fileKey(picked) && checked.view.dryRun && checked.view.clean;
}

// ── calls ───────────────────────────────────────────────────────────────────
export async function downloadTemplate(kind: OpeningKind) {
  openFile(await apiFile(`/api/fleet/opening-balances/${kind}/template`), true);
}

export function useOpeningImport(kind: OpeningKind) {
  const client = useQueryClient();
  const tenant = useAuth().user?.tenantId;
  return useMutation({
    mutationFn: async ({ file, commit }: { file: File; commit: boolean }) => {
      const form = new FormData();
      form.append('file', file);
      return toImportView(await apiUpload<OpeningImportResultDto>(`/api/fleet/opening-balances/${kind}?commit=${commit}`, form));
    },
    onSuccess: (_v, { commit }) => {
      if (!commit) return;
      const area = { METERS: 'meter-readings', PM_BASELINES: 'pm-programs', STOCK: 'items', TYRES: 'tyres' }[kind];
      client.invalidateQueries({ queryKey: ['fleet', area, tenant] });
    },
  });
}

export function useTruckingSyncAll() {
  const client = useQueryClient();
  const tenant = useAuth().user?.tenantId;
  return useMutation({
    mutationFn: () => apiSend<TruckingSyncResult>('POST', '/api/fleet/sync/trucking'),
    onSettled: () => {
      for (const k of ['assets', 'drivers', 'meter-readings', 'asset-meters']) client.invalidateQueries({ queryKey: ['fleet', k, tenant] });
    },
  });
}
