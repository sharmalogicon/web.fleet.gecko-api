'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiSend, query } from '@/lib/api/client';
import { useAuth } from '@/lib/contexts/AuthContext';

/**
 * Shared plumbing for the P4 stock / purchasing documents (prompt 11): one list / one record / save / action / approval
 * per document path. Every document is DRAFT → actions; PUT replaces the lines; actions take { reason?, rowVersion }.
 */

export const DOC_PATHS = {
  goodsRequests: '/api/fleet/goods-requests',
  purchaseOrders: '/api/fleet/purchase-orders',
  goodsReceipts: '/api/fleet/goods-receipts',
  vendorReturns: '/api/fleet/vendor-returns',
  stockAdjustments: '/api/fleet/stock-adjustments',
  stockTransfers: '/api/fleet/stock-transfers',
  stockCounts: '/api/fleet/stock-counts',
  stockIssues: '/api/fleet/stock-issues',
} as const;
export type DocKind = keyof typeof DOC_PATHS;

function useTenant() {
  return useAuth().user?.tenantId;
}
const docKey = (tenant: string | undefined, kind: DocKind, ...rest: unknown[]) => ['fleet', 'docs', tenant, kind, ...rest];

export function useDocList<T>(kind: DocKind, c: Record<string, string | number | boolean | undefined>, enabled = true) {
  const tenant = useTenant();
  return useQuery({
    queryKey: docKey(tenant, kind, 'list', c),
    queryFn: async () => (await apiGet<{ items: T[] }>(`${DOC_PATHS[kind]}${query({ ...c, page: 1, pageSize: 200 })}`)).items,
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useDoc<T>(kind: DocKind, id: string | null) {
  const tenant = useTenant();
  return useQuery({ queryKey: docKey(tenant, kind, 'one', id), queryFn: () => apiGet<T>(`${DOC_PATHS[kind]}/${id}`), enabled: !!id });
}

/** Save (POST when no id, PUT otherwise) and actions; every write refreshes all P4 documents and stock. */
export function useDocMutations<T>(kind: DocKind) {
  const client = useQueryClient();
  const tenant = useTenant();
  const settle = () => {
    client.invalidateQueries({ queryKey: ['fleet', 'docs', tenant] });
    client.invalidateQueries({ queryKey: ['fleet', 'items', tenant] });
    client.invalidateQueries({ queryKey: ['fleet', 'work-orders', tenant] });
  };
  const save = useMutation({
    mutationFn: ({ id, body }: { id?: string; body: unknown }) =>
      id ? apiSend<T>('PUT', `${DOC_PATHS[kind]}/${id}`, body) : apiSend<T>('POST', DOC_PATHS[kind], body),
    onSettled: settle,
  });
  const action = useMutation({
    mutationFn: ({ id, action, body }: { id: string; action: string; body: unknown }) => apiSend<T>('POST', `${DOC_PATHS[kind]}/${id}/${action}`, body),
    onSettled: settle,
  });
  return { save, action };
}

// ── status maps ─────────────────────────────────────────────────────────────
/** Goods request API status → the screens' OPEN / FULFILLED / CANCELLED (the API status shows as a badge). */
export function viewGoodsRequestStatus(status: string): 'OPEN' | 'FULFILLED' | 'CANCELLED' {
  if (status === 'FULFILLED') return 'FULFILLED';
  if (status === 'CANCELLED' || status === 'REJECTED') return 'CANCELLED';
  return 'OPEN';
}

/** PO API status → the screen's (DRAFT / PENDING / APPROVED / SENT / PARTIAL / RECEIVED / CLOSED / CANCELLED). */
export function viewPoStatus(status: string): string {
  switch (status) {
    case 'PENDING_APPROVAL': return 'PENDING';
    case 'PARTIALLY_RECEIVED': return 'PARTIAL';
    case 'REJECTED': return 'CANCELLED';
    default: return status;
  }
}

/** The PO actions of a status (the API checks again; approving your own PO is refused there). */
export function poActions(status: string | undefined, approval: string | undefined, can: { manage: boolean; approve: boolean }) {
  const s = status ?? 'NEW';
  return {
    save: (s === 'NEW' || s === 'DRAFT') && can.manage,
    submit: (s === 'NEW' || s === 'DRAFT') && can.manage,
    approve: s === 'PENDING_APPROVAL' && approval === 'PENDING' && can.approve,
    send: s === 'APPROVED' && can.manage,
    close: (s === 'SENT' || s === 'PARTIALLY_RECEIVED') && can.manage,
    cancel: (s === 'DRAFT' || s === 'PENDING_APPROVAL' || s === 'APPROVED' || s === 'SENT') && can.manage,
  };
}

/** The screen keys a positive qty; DECREASE / WRITE_OFF are sent negative (prompt 11 §F). */
export function signedQty(type: string, qty: number): number {
  const q = Math.abs(qty);
  return type === 'DECREASE' || type === 'WRITE_OFF' ? -q : q;
}

/** A receipt line from an open PO line: qty defaults to what is still open; price only if it differs (prompt 11 §D). */
export function receiptLineFromPo(l: { purchaseOrderLineId: string; pendingQty: number | string; unitPrice: number | string }, qty?: number, unitPrice?: number) {
  const pending = Number(l.pendingQty);
  const price = Number(l.unitPrice);
  return {
    purchaseOrderLineId: l.purchaseOrderLineId,
    qty: qty ?? pending,
    unitPrice: unitPrice !== undefined && unitPrice !== price ? unitPrice : null,
  };
}

// ── lookups used by the document screens ────────────────────────────────────
export type OpenPoLine = import('@/lib/api/fleet.schema').components['schemas']['OpenPoLineDto'];
export type StockBalance = import('@/lib/api/fleet.schema').components['schemas']['StockBalanceDto'];

/** PO lines still open for receiving (a supplier and / or a store). */
export function useOpenPoLines(c: { supplierPartyCode?: string; warehouseId?: string }, enabled = true) {
  const tenant = useTenant();
  return useQuery({
    queryKey: docKey(tenant, 'purchaseOrders', 'open-lines', c),
    queryFn: () => apiGet<OpenPoLine[]>(`${DOC_PATHS.purchaseOrders}/open-lines${query(c)}`),
    enabled,
  });
}

/** Stock on hand of a store (one row per item × bin × lot). */
export function useStockBalances(c: { warehouseId?: string; itemId?: string }, enabled = true) {
  const tenant = useTenant();
  return useQuery({
    queryKey: ['fleet', 'items', tenant, 'balances', c],
    queryFn: async () => (await apiGet<{ items: StockBalance[] }>(`/api/fleet/stock${query({ ...c, onlyInStock: true, page: 1, pageSize: 200 })}`)).items,
    enabled,
  });
}
