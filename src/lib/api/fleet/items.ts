'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiSend, query } from '@/lib/api/client';
import type { components } from '@/lib/api/fleet.schema';
import { useAuth } from '@/lib/contexts/AuthContext';
import type { StockFormValues } from '@/types/stock';

/**
 * Stock screen ⇄ Fleet `items` (prompt 07 §B). The reorder fields are ONE stock policy: the default store of
 * the branch picked in the header. Other stores' policies are sent back unchanged.
 */

type S = components['schemas'];
export type ItemDto = S['ItemDto'];
export type SaveItemRequest = S['SaveItemRequest'];
export type StockPolicyDto = S['StockPolicyDto'];
export type StockPolicyInput = S['StockPolicyInput'];
export type ItemCatalogue = S['ItemCatalogueResponse'];

const BASE = '/api/fleet/items';
export const ITEM_CATEGORY_LIST = 'FLEET_ITEM_CATEGORY';

export interface StockView extends StockFormValues {
  id: string;
  rowVersion: string;
  dto: ItemDto;
}

const n = (v: number | string | null | undefined): number | undefined =>
  v === null || v === undefined || v === '' ? undefined : Number(v);
const opt = (v: number | undefined) => (v === undefined || Number.isNaN(v) ? null : v);
const text = (v: string | null | undefined): string | null => {
  const s = v?.trim();
  return s ? s : null;
};

/** The policy of one store (the header branch's default store). */
export function policyFor(d: Pick<ItemDto, 'stockPolicies'> | undefined, warehouseId: string | null | undefined) {
  return warehouseId ? d?.stockPolicies.find((p) => p.warehouseId === warehouseId) : undefined;
}

export function toViewModel(d: ItemDto, defaultWarehouseId?: string | null): StockView {
  const p = policyFor(d, defaultWarehouseId);
  return {
    id: d.itemId,
    rowVersion: d.rowVersion,
    dto: d,
    code: d.itemCode,
    description: d.descriptionEn,
    isActive: d.isActive,
    stockCategory: d.categoryCode ?? undefined,
    stockType: d.itemType,
    brand: d.brandCode ?? undefined,
    uom: d.baseUomCode,
    isOriginalPart: d.isOriginalPart,
    warrantyValue: n(d.warrantyValue),
    warrantyPeriod: d.warrantyPeriod ?? undefined,
    remarks: d.remarks ?? undefined,
    location: p?.defaultBinCode ?? undefined,
    leadTime: n(p?.leadTimeDays),
    reOrderLevel: n(p?.reorderPoint),
    minQty: n(p?.minQty),
    maxQty: n(p?.maxQty),
    reOrderQty: n(p?.reorderQty),
    // Repair tariff (P5) and stock ledger (P4): not on this API yet.
    sellingPrice: undefined,
    markupClaim: undefined,
    totalQtyOnHand: undefined,
    avgCostPerUnit: undefined,
    lowestCostPerUnit: undefined,
    highestCostPerUnit: undefined,
    pendingQty: undefined,
  };
}

const asInput = (p: StockPolicyDto): StockPolicyInput => ({
  warehouseId: p.warehouseId, defaultBinCode: p.defaultBinCode, reorderPoint: p.reorderPoint, minQty: p.minQty,
  maxQty: p.maxQty, reorderQty: p.reorderQty, leadTimeDays: p.leadTimeDays,
});

/**
 * `stockPolicies`: the policies read, with the default store's entry replaced by the form's values.
 * No default store → null (= unchanged). A policy with every field empty is dropped (= no policy at that store).
 */
export function stockPoliciesFor(v: StockFormValues, current: ItemDto | undefined, defaultWarehouseId: string | null | undefined): StockPolicyInput[] | null {
  if (!defaultWarehouseId) return null;
  const others = (current?.stockPolicies ?? []).filter((p) => p.warehouseId !== defaultWarehouseId).map(asInput);
  const mine: StockPolicyInput = {
    warehouseId: defaultWarehouseId,
    defaultBinCode: text(v.location)?.toUpperCase() ?? null,
    reorderPoint: opt(v.reOrderLevel),
    minQty: opt(v.minQty),
    maxQty: opt(v.maxQty),
    reorderQty: opt(v.reOrderQty),
    leadTimeDays: v.leadTime === undefined ? null : Math.round(v.leadTime),
  };
  const empty = [mine.defaultBinCode, mine.reorderPoint, mine.minQty, mine.maxQty, mine.reorderQty, mine.leadTimeDays].every((x) => x === null);
  return empty ? others : [...others, mine];
}

export function toRequest(v: StockFormValues, current: StockView | undefined, defaultWarehouseId: string | null | undefined): SaveItemRequest {
  const d = current?.dto;
  const warranty = v.warrantyValue !== undefined && v.warrantyPeriod;
  return {
    itemCode: v.code.trim().toUpperCase(),
    descriptionEn: v.description.trim(),
    descriptionLocal: d?.descriptionLocal ?? null,
    itemType: text(v.stockType)?.toUpperCase() ?? d?.itemType ?? 'PART',
    categoryCode: text(v.stockCategory)?.toUpperCase() ?? null,
    brandCode: text(v.brand)?.toUpperCase() ?? null,
    baseUomCode: text(v.uom)?.toUpperCase() ?? '',
    tracking: d?.tracking ?? 'NONE',
    oemPartNo: d?.oemPartNo ?? null,
    isOriginalPart: v.isOriginalPart,
    // Both or neither (the API refuses one without the other).
    warrantyValue: warranty ? Math.round(v.warrantyValue!) : null,
    warrantyPeriod: warranty ? v.warrantyPeriod! : null,
    warrantyKm: d?.warrantyKm ?? null,
    isActive: v.isActive,
    remarks: text(v.remarks),
    aliases: null,
    vendors: null,
    stockPolicies: stockPoliciesFor(v, d, defaultWarehouseId),
    rowVersion: current?.rowVersion ?? null,
  };
}

export const ITEM_API_TO_FORM = {
  itemcode: 'code', descriptionen: 'description', itemtype: 'stockType', categorycode: 'stockCategory', brandcode: 'brand',
  baseuomcode: 'uom', isoriginalpart: 'isOriginalPart', warrantyvalue: 'warrantyValue', warrantyperiod: 'warrantyPeriod',
  isactive: 'isActive', remarks: 'remarks', stockpolicies: 'reOrderLevel',
  'stockpolicies.defaultbincode': 'location', 'stockpolicies.reorderpoint': 'reOrderLevel', 'stockpolicies.minqty': 'minQty',
  'stockpolicies.maxqty': 'maxQty', 'stockpolicies.reorderqty': 'reOrderQty', 'stockpolicies.leadtimedays': 'leadTime',
} as const;

/** `stockPolicies[0].minQty` → `stockpolicies.minqty` so the map above finds it. */
export function normaliseItemErrors(fieldMap: Record<string, string>) {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(fieldMap)) out[k.replace(/\[\d+\]/g, '')] = v;
  return out;
}

// ── calls + hooks ───────────────────────────────────────────────────────────
export const getItems = (c: { search?: string; category?: string; active?: boolean }) =>
  apiGet<S['PagedResultOfItemDto']>(`${BASE}${query({ ...c, page: 1, pageSize: 200 })}`);
export const getItem = (id: string) => apiGet<ItemDto>(`${BASE}/${encodeURIComponent(id)}`);
export const getItemCatalogue = () => apiGet<ItemCatalogue>(`${BASE}/catalogue`);

const keys = {
  all: (tenant?: string) => ['fleet', 'items', tenant] as const,
  list: (tenant: string | undefined, c: object) => ['fleet', 'items', tenant, 'list', c] as const,
  one: (tenant: string | undefined, id: string) => ['fleet', 'items', tenant, 'one', id] as const,
  catalogue: (tenant?: string) => ['fleet', 'items', tenant, 'catalogue'] as const,
};

function useTenant() {
  return useAuth().user?.tenantId;
}

export function useItems(c: { search?: string; category?: string; active?: boolean }) {
  const tenant = useTenant();
  return useQuery({ queryKey: keys.list(tenant, c), queryFn: async () => (await getItems(c)).items, placeholderData: keepPreviousData });
}

export function useItem(id: string | null) {
  const tenant = useTenant();
  return useQuery({ queryKey: keys.one(tenant, id ?? ''), queryFn: () => getItem(id!), enabled: !!id });
}

export function useItemCatalogue() {
  const tenant = useTenant();
  return useQuery({ queryKey: keys.catalogue(tenant), queryFn: getItemCatalogue, staleTime: 30 * 60_000 });
}

export function useSaveItem() {
  const client = useQueryClient();
  const tenant = useTenant();
  return useMutation({
    mutationFn: ({ values, current, defaultWarehouseId }: { values: StockFormValues; current?: StockView; defaultWarehouseId: string | null }) =>
      current
        ? apiSend<ItemDto>('PUT', `${BASE}/${encodeURIComponent(current.id)}`, toRequest(values, current, defaultWarehouseId))
        : apiSend<ItemDto>('POST', BASE, toRequest(values, undefined, defaultWarehouseId)),
    onSettled: () => client.invalidateQueries({ queryKey: keys.all(tenant) }),
  });
}

// ── stock snapshot (prompt 11 §A) ───────────────────────────────────────────
export type StockBalanceDto = S['StockBalanceDto'];
export type OpenPoLineDto = S['OpenPoLineDto'];

/** Qty on hand (all stores / bins / lots), cost per unit (weighted, lowest, highest per store) and qty on order. */
export function stockSnapshot(balances: StockBalanceDto[], openLines: OpenPoLineDto[]) {
  const qty = balances.reduce((s, b) => s + Number(b.qtyOnHand), 0);
  const value = balances.reduce((s, b) => s + Number(b.stockValue), 0);
  const costs = balances.filter((b) => Number(b.qtyOnHand) > 0).map((b) => Number(b.avgUnitCost));
  // Real reserved / available since P12 (prompt 19 §B); available falls back to on hand − reserved.
  const reserved = balances.reduce((s, b) => s + Number(b.qtyReserved ?? 0), 0);
  const available = balances.reduce((s, b) => s + (b.qtyAvailable === null || b.qtyAvailable === undefined ? Number(b.qtyOnHand) - Number(b.qtyReserved ?? 0) : Number(b.qtyAvailable)), 0);
  return {
    totalQtyOnHand: qty,
    totalQtyReserved: reserved,
    totalQtyAvailable: available,
    avgCostPerUnit: qty > 0 ? Math.round((value / qty) * 10000) / 10000 : undefined,
    lowestCostPerUnit: costs.length ? Math.min(...costs) : undefined,
    highestCostPerUnit: costs.length ? Math.max(...costs) : undefined,
    pendingQty: openLines.reduce((s, l) => s + Number(l.pendingQty), 0),
  };
}

export function useStockSnapshot(itemId: string | null) {
  const tenant = useTenant();
  return useQuery({
    queryKey: ['fleet', 'items', tenant, 'snapshot', itemId],
    queryFn: async () => {
      const [stock, open] = await Promise.all([
        apiGet<S['PagedResultOfStockBalanceDto']>(`/api/fleet/stock${query({ itemId, onlyInStock: false, page: 1, pageSize: 200 })}`),
        apiGet<OpenPoLineDto[]>(`/api/fleet/purchase-orders/open-lines${query({ itemId })}`),
      ]);
      return stockSnapshot(stock.items, open);
    },
    enabled: !!itemId,
  });
}
