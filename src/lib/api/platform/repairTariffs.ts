'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiSend, query } from '@/lib/api/client';
import type { components } from '@/lib/api/platform.schema';
import { useAuth } from '@/lib/contexts/AuthContext';

/**
 * Repair tariff (prompt 12 §A) on the Platform API `/api/revenue/repair-tariffs`. The two tariff pages show the same
 * cards: Standard Rates = `standard=true` (no party), Customer Rates = `standard=false`.
 */
type S = components['schemas'];
export type RepairCardDto = S['RepairRateCardDto'];
export type RepairLineDto = S['RepairRateLineDto'];
export type SaveRepairCardRequest = S['SaveRepairRateCardRequest'];
export type RepairLineInput = S['RepairRateLineInput'];
export type PriceCheckRequest = S['RepairPriceCheckRequest'];
export type PriceCheckResult = S['RepairPriceResult'];

const BASE = '/api/revenue/repair-tariffs';

export const LINE_KINDS = ['LABOR', 'FLAT', 'MARKUP', 'PART_PRICE', 'SUNDRY'] as const;
export type LineKind = (typeof LINE_KINDS)[number];
export const TIME_BANDS = ['NORMAL', 'OT', 'HOLIDAY'] as const;
export const SUNDRY_KINDS = ['SHOP_SUPPLIES', 'MIN_CHARGE', 'CALL_OUT', 'TOWING'] as const;
export const CARD_STATUSES = ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN'] as const;

/** The "Applies to" inputs each kind shows (everything else is sent null). */
export type AppliesField = 'tradeCode' | 'timeBand' | 'minQty' | 'serviceTaskCode' | 'stdHours' | 'costFrom' | 'costTo' | 'itemCategoryCode' | 'itemCode' | 'sundryKind' | 'capAmount';
export function appliesTo(kind: string, sundryKind?: string | null): AppliesField[] {
  switch (kind) {
    case 'LABOR': return ['tradeCode', 'timeBand', 'minQty'];
    case 'FLAT': return ['serviceTaskCode', 'stdHours'];
    case 'MARKUP': return ['costFrom', 'costTo', 'itemCategoryCode'];
    case 'PART_PRICE': return ['itemCode'];
    case 'SUNDRY': return sundryKind === 'SHOP_SUPPLIES' ? ['sundryKind', 'capAmount'] : ['sundryKind'];
    default: return [];
  }
}

/** What `rate` means for the kind (column hint). */
export function rateMeaning(kind: string, sundryKind?: string | null): 'perHour' | 'fixed' | 'percent' | 'perUnit' | 'amount' {
  switch (kind) {
    case 'LABOR': return 'perHour';
    case 'FLAT': return 'fixed';
    case 'MARKUP': return 'percent';
    case 'PART_PRICE': return 'perUnit';
    default: return sundryKind === 'SHOP_SUPPLIES' ? 'percent' : 'amount';
  }
}

export const DEFAULT_CHARGE: Record<string, string> = { LABOR: 'WO_LABOR', FLAT: 'WO_LABOR', MARKUP: 'WO_PARTS', PART_PRICE: 'WO_PARTS', SUNDRY: 'WO_SUNDRY' };
/** MARKUP on the SUBLET category prices sublet work. */
export function defaultChargeCode(kind: string, itemCategoryCode?: string | null) {
  return kind === 'MARKUP' && itemCategoryCode === 'SUBLET' ? 'WO_SUBLET' : DEFAULT_CHARGE[kind] ?? 'WO_SUNDRY';
}

export const CARD_STATUS_CLASS: Record<string, string> = {
  DRAFT: 'bg-blue-100 text-blue-700', PENDING: 'bg-amber-100 text-amber-700', APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700', WITHDRAWN: 'bg-gray-100 text-gray-600',
};

// ── form rows ───────────────────────────────────────────────────────────────
export interface RateRow {
  key: string; lineKind: string; chargeCode: string; description: string; billingUnitCode: string; rate: string
  tradeCode: string; timeBand: string; minQty: string; serviceTaskCode: string; stdHours: string; costFrom: string; costTo: string
  itemCategoryCode: string; itemCode: string; sundryKind: string; capAmount: string
}
const s = (v: unknown) => (v === null || v === undefined ? '' : String(v));

export function newRow(kind: string = 'LABOR'): RateRow {
  return {
    key: `n${Math.random().toString(36).slice(2)}`, lineKind: kind, chargeCode: defaultChargeCode(kind), description: '', billingUnitCode: '', rate: '',
    tradeCode: '', timeBand: kind === 'LABOR' ? 'NORMAL' : '', minQty: '', serviceTaskCode: '', stdHours: '', costFrom: '', costTo: '',
    itemCategoryCode: '', itemCode: '', sundryKind: kind === 'SUNDRY' ? 'SHOP_SUPPLIES' : '', capAmount: '',
  };
}

export function toRow(l: RepairLineDto): RateRow {
  return {
    key: l.repairRateLineId, lineKind: l.lineKind, chargeCode: l.chargeCode, description: s(l.description), billingUnitCode: l.billingUnitCode, rate: s(l.rate),
    tradeCode: s(l.tradeCode), timeBand: s(l.timeBand), minQty: s(l.minQty), serviceTaskCode: s(l.serviceTaskCode), stdHours: s(l.stdHours),
    costFrom: s(l.costFrom), costTo: s(l.costTo), itemCategoryCode: s(l.itemCategoryCode), itemCode: s(l.itemCode), sundryKind: s(l.sundryKind), capAmount: s(l.capAmount),
  };
}

/** A row → the request line: only the kind's "Applies to" fields are sent, the rest null. */
export function toLineInput(r: RateRow): RepairLineInput {
  const keep = new Set(appliesTo(r.lineKind, r.sundryKind));
  const txt = (f: AppliesField) => (keep.has(f) ? (r[f] as string).trim().toUpperCase() || null : null);
  const nr = (f: AppliesField) => (keep.has(f) && (r[f] as string).trim() !== '' ? Number(r[f]) : null);
  return {
    lineKind: r.lineKind, chargeCode: r.chargeCode.trim().toUpperCase() || null, description: r.description.trim() || null,
    rate: r.rate.trim() === '' ? null : Number(r.rate),
    tradeCode: txt('tradeCode'), timeBand: txt('timeBand'), minQty: nr('minQty'), serviceTaskCode: txt('serviceTaskCode'), stdHours: nr('stdHours'),
    costFrom: nr('costFrom'), costTo: nr('costTo'), itemCategoryCode: txt('itemCategoryCode'), itemCode: txt('itemCode'), sundryKind: txt('sundryKind'),
    capAmount: nr('capAmount'),
  };
}

export interface CardHeader {
  cardCode: string; cardDate: string; effectiveFrom: string; effectiveTo: string; partyCode: string; currencyCode: string
  pricesIncludeTax: boolean; description: string; salesPerson: string; contactNo: string; remarks: string
}
export function toCardRequest(h: CardHeader, rows: RateRow[], standard: boolean, rowVersion?: string | null): SaveRepairCardRequest {
  const t = (v: string) => v.trim() || null;
  return {
    cardCode: h.cardCode.trim().toUpperCase(), cardDate: h.cardDate, effectiveFrom: h.effectiveFrom, effectiveTo: standard ? null : h.effectiveTo || null,
    partyCode: standard ? null : t(h.partyCode)?.toUpperCase() ?? null, currencyCode: t(h.currencyCode)?.toUpperCase() ?? 'THB',
    pricesIncludeTax: h.pricesIncludeTax, description: t(h.description), salesPerson: t(h.salesPerson), contactNo: t(h.contactNo), remarks: t(h.remarks),
    lines: rows.map(toLineInput), rowVersion: rowVersion ?? null,
  };
}

/** "Copy to new card": same header and lines, new code, today, DRAFT. */
export function copyCard(d: RepairCardDto): { header: CardHeader; rows: RateRow[] } {
  const today = new Date().toISOString().slice(0, 10);
  return {
    header: {
      cardCode: `${d.cardCode}-COPY`, cardDate: today, effectiveFrom: today, effectiveTo: '', partyCode: d.partyCode ?? '', currencyCode: d.currencyCode,
      pricesIncludeTax: d.pricesIncludeTax, description: s(d.description), salesPerson: s(d.salesPerson), contactNo: s(d.contactNo), remarks: s(d.remarks),
    },
    rows: d.lines.map((l) => ({ ...toRow(l), key: `c${l.repairRateLineId}` })),
  };
}

// ── calls + hooks ───────────────────────────────────────────────────────────
function useTenant() {
  return useAuth().user?.tenantId;
}
const keys = { all: (t?: string) => ['revenue', 'repair-tariffs', t] as const };

export function useRepairCards(c: { standard: boolean; search?: string; partyCode?: string; status?: string }) {
  const tenant = useTenant();
  return useQuery({
    queryKey: [...keys.all(tenant), 'list', c],
    queryFn: async () => (await apiGet<S['PagedResultOfRepairRateCardDto']>(`${BASE}${query({ ...c, page: 1, pageSize: 200 })}`)).items,
    placeholderData: keepPreviousData,
  });
}

export function useRepairCard(id: string | null) {
  const tenant = useTenant();
  return useQuery({ queryKey: [...keys.all(tenant), 'one', id], queryFn: () => apiGet<RepairCardDto>(`${BASE}/${id}`), enabled: !!id });
}

export function useRepairCardMutations() {
  const client = useQueryClient();
  const tenant = useTenant();
  const settle = () => client.invalidateQueries({ queryKey: keys.all(tenant) });
  const save = useMutation({
    mutationFn: ({ id, body }: { id?: string; body: SaveRepairCardRequest }) => (id ? apiSend<RepairCardDto>('PUT', `${BASE}/${id}`, body) : apiSend<RepairCardDto>('POST', BASE, body)),
    onSettled: settle,
  });
  const action = useMutation({
    mutationFn: ({ id, action, body }: { id: string; action: string; body: unknown }) => apiSend<RepairCardDto>('POST', `${BASE}/${id}/${action}`, body),
    onSettled: settle,
  });
  const priceCheck = useMutation({ mutationFn: (body: PriceCheckRequest) => apiSend<PriceCheckResult>('POST', `${BASE}/price-check`, body) });
  return { save, action, priceCheck };
}
