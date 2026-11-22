'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiGet, apiSend, query } from '@/lib/api/client';
import type { components } from '@/lib/api/fleet.schema';
import { useAuth } from '@/lib/contexts/AuthContext';

/** Stores + bins (prompt 07 §C). Rules: Gecko.Fleet warehouse endpoints. */

type S = components['schemas'];
export type WarehouseDto = S['WarehouseDto'];
export type BinDto = S['BinDto'];
export type SaveWarehouseRequest = S['SaveWarehouseRequest'];
export type SaveBinRequest = S['SaveBinRequest'];

const BASE = '/api/fleet/warehouses';
export const WAREHOUSE_KINDS = ['MAIN', 'WORKSHOP', 'TYRE_STORE', 'MOBILE_VAN'] as const;

const codeRule = z.string().trim().min(1, 'store.rule.codeRequired').max(30).regex(/^[A-Za-z0-9\-_/.]+$/, 'store.rule.code');

export const storeSchema = z.object({
  branchId: z.string().min(1, 'store.rule.branch'),
  warehouseCode: codeRule,
  nameEn: z.string().trim().min(1, 'store.rule.nameRequired').max(200),
  nameLocal: z.string().max(200).optional(),
  warehouseKind: z.enum(WAREHOUSE_KINDS),
  isDefault: z.boolean(),
  isActive: z.boolean(),
  remarks: z.string().max(1000).optional(),
  bins: z.array(z.object({
    binId: z.string().optional(),
    binCode: codeRule,
    description: z.string().max(200).optional(),
    isActive: z.boolean(),
    rowVersion: z.string().optional(),
  })).superRefine((bins, ctx) => {
    const seen = new Set<string>();
    bins.forEach((b, i) => {
      const c = b.binCode.trim().toUpperCase();
      if (c && seen.has(c)) ctx.addIssue({ code: 'custom', path: [i, 'binCode'], message: 'store.rule.binTwice' });
      seen.add(c);
    });
  }),
});

export type StoreFormValues = z.infer<typeof storeSchema>;
export type BinFormValues = StoreFormValues['bins'][number];

export const NEW_STORE_DEFAULTS: StoreFormValues = {
  branchId: '', warehouseCode: '', nameEn: '', warehouseKind: 'MAIN', isDefault: false, isActive: true, bins: [],
};

const text = (v: string | null | undefined): string | null => {
  const s = v?.trim();
  return s ? s : null;
};

export function toFormValues(d: WarehouseDto): StoreFormValues {
  return {
    branchId: d.branchId,
    warehouseCode: d.warehouseCode,
    nameEn: d.nameEn,
    nameLocal: d.nameLocal ?? undefined,
    warehouseKind: (WAREHOUSE_KINDS as readonly string[]).includes(d.warehouseKind) ? (d.warehouseKind as StoreFormValues['warehouseKind']) : 'MAIN',
    isDefault: d.isDefault,
    isActive: d.isActive,
    remarks: d.remarks ?? undefined,
    bins: d.bins.map((b) => ({ binId: b.binId, binCode: b.binCode, description: b.description ?? undefined, isActive: b.isActive, rowVersion: b.rowVersion })),
  };
}

export function toStoreRequest(v: StoreFormValues, rowVersion?: string): SaveWarehouseRequest {
  return {
    branchId: v.branchId,
    warehouseCode: v.warehouseCode.trim().toUpperCase(),
    nameEn: v.nameEn.trim(),
    nameLocal: text(v.nameLocal),
    warehouseKind: v.warehouseKind,
    isDefault: v.isDefault,
    isActive: v.isActive,
    remarks: text(v.remarks),
    rowVersion: rowVersion ?? null,
  };
}

/** Bins to write: new rows (POST) and rows that differ from what was read (PUT). No deletes (inactive instead). */
export function binChanges(bins: BinFormValues[], stored: BinDto[]) {
  const creates: SaveBinRequest[] = [];
  const updates: { binId: string; body: SaveBinRequest }[] = [];
  for (const b of bins) {
    const body: SaveBinRequest = { binCode: b.binCode.trim().toUpperCase(), description: text(b.description), isActive: b.isActive, rowVersion: b.rowVersion ?? null };
    if (!b.binId) {
      creates.push({ ...body, rowVersion: null });
      continue;
    }
    const was = stored.find((s) => s.binId === b.binId);
    if (!was || was.binCode !== body.binCode || (was.description ?? null) !== body.description || was.isActive !== body.isActive)
      updates.push({ binId: b.binId, body });
  }
  return { creates, updates };
}

export const STORE_API_TO_FORM = {
  branchid: 'branchId', warehousecode: 'warehouseCode', nameen: 'nameEn', namelocal: 'nameLocal', warehousekind: 'warehouseKind',
  isdefault: 'isDefault', isactive: 'isActive', remarks: 'remarks', bincode: 'bins',
} as const;

// ── calls + hooks ───────────────────────────────────────────────────────────
export const getWarehouses = (c: { branchId?: string | null; active?: boolean } = {}) =>
  apiGet<WarehouseDto[]>(`${BASE}${query({ branchId: c.branchId, active: c.active })}`);
export const getWarehouse = (id: string) => apiGet<WarehouseDto>(`${BASE}/${encodeURIComponent(id)}`);

const keys = {
  all: (tenant?: string) => ['fleet', 'warehouses', tenant] as const,
  list: (tenant: string | undefined, c: object) => ['fleet', 'warehouses', tenant, 'list', c] as const,
  one: (tenant: string | undefined, id: string) => ['fleet', 'warehouses', tenant, 'one', id] as const,
};

function useTenant() {
  return useAuth().user?.tenantId;
}

export function useWarehouses(c: { branchId?: string | null; active?: boolean } = {}, enabled = true) {
  const tenant = useTenant();
  return useQuery({ queryKey: keys.list(tenant, c), queryFn: () => getWarehouses(c), enabled });
}

export function useWarehouse(id: string | null) {
  const tenant = useTenant();
  return useQuery({ queryKey: keys.one(tenant, id ?? ''), queryFn: () => getWarehouse(id!), enabled: !!id });
}

/** The branch's default store (the Stock form's reorder fields write its policy). */
export function useDefaultWarehouse(branchId: string | null) {
  const list = useWarehouses({ branchId }, !!branchId);
  return { ...list, data: list.data?.find((w) => w.isDefault && w.isActive) ?? null };
}

/**
 * Save the store, then each new / changed bin (their own endpoints, one by one: each answer carries the
 * store's new state). A failed bin stops there; the store and earlier bins are saved.
 */
export function useSaveStore() {
  const client = useQueryClient();
  const tenant = useTenant();
  return useMutation({
    mutationFn: async ({ values, current }: { values: StoreFormValues; current?: WarehouseDto }) => {
      let store = current
        ? await apiSend<WarehouseDto>('PUT', `${BASE}/${current.warehouseId}`, toStoreRequest(values, current.rowVersion))
        : await apiSend<WarehouseDto>('POST', BASE, toStoreRequest(values));
      const { creates, updates } = binChanges(values.bins, current?.bins ?? []);
      for (const u of updates) store = await apiSend<WarehouseDto>('PUT', `${BASE}/${store.warehouseId}/bins/${u.binId}`, u.body);
      for (const c of creates) store = await apiSend<WarehouseDto>('POST', `${BASE}/${store.warehouseId}/bins`, c);
      return store;
    },
    onSettled: () => client.invalidateQueries({ queryKey: keys.all(tenant) }),
  });
}

/**
 * Stores a transfer may go to from `fromWarehouseId` (owner answer 11 Q6, backend #12): the store's configured list, or
 * every other active store when it has none — the API answers both (`GET /warehouses/{id}/transfer-targets`).
 */
export function useTransferTargets(fromWarehouseId: string | null) {
  const tenant = useTenant();
  return useQuery({
    queryKey: [...keys.one(tenant, fromWarehouseId ?? ''), 'transfer-targets'],
    queryFn: () => apiGet<WarehouseDto[]>(`${BASE}/${encodeURIComponent(fromWarehouseId!)}/transfer-targets`),
    enabled: !!fromWarehouseId,
  });
}
