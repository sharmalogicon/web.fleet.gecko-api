'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiSend, query } from '@/lib/api/client';
import type { components } from '@/lib/api/fleet.schema';
import { useAuth } from '@/lib/contexts/AuthContext';

/**
 * Stock reservations (prompt 19 §B): hold stock in a store for a WO part line or a goods-request line.
 * Issuing a WO part consumes its reservation automatically. Permission fleet.stock.issue.
 */

type S = components['schemas'];
export type StockReservationDto = S['StockReservationDto'];
export type SaveStockReservationRequest = S['SaveStockReservationRequest'];

const BASE = '/api/fleet/stock-reservations';

/** A line a reservation can be made for. */
export interface ReservableLine {
  kind: 'WO_PART' | 'GOODS_REQUEST';
  lineId: string;
  itemCode: string;
  description: string;
  qty: number;
  uomCode?: string;
}

/**
 * The request: `qty` empty = what the line still needs (the API works it out); a typed qty must be > 0.
 * Returns null + an i18n key when the input is not valid.
 */
export function reserveRequest(line: Pick<ReservableLine, 'kind' | 'lineId'>, warehouseId: string, qtyInput: string):
  { request: SaveStockReservationRequest | null; error: string | null } {
  if (!warehouseId) return { request: null, error: 'docs.rule.store' };
  const raw = qtyInput.trim();
  let qty: number | null = null;
  if (raw) {
    qty = Number(raw);
    if (Number.isNaN(qty) || qty <= 0) return { request: null, error: 'reserve.rule.qty' };
  }
  return {
    request: {
      warehouseId,
      woPartId: line.kind === 'WO_PART' ? line.lineId : null,
      goodsRequestLineId: line.kind === 'GOODS_REQUEST' ? line.lineId : null,
      qty,
    } as SaveStockReservationRequest,
    error: null,
  };
}

/** The ACTIVE reservation of a line (one per line). */
export function activeFor(rows: StockReservationDto[] | undefined, line: Pick<ReservableLine, 'kind' | 'lineId'>) {
  return (rows ?? []).find((r) => r.status === 'ACTIVE' && (line.kind === 'WO_PART' ? r.woPartId === line.lineId : r.goodsRequestLineId === line.lineId));
}

export interface ReservationCriteria {
  itemId?: string;
  warehouseId?: string;
  workOrderId?: string;
  status?: string;
}

function useTenant() {
  return useAuth().user?.tenantId;
}

export function useStockReservations(c: ReservationCriteria, enabled = true) {
  const tenant = useTenant();
  return useQuery({
    queryKey: ['fleet', 'stock-reservations', tenant, c],
    queryFn: () => apiGet<StockReservationDto[]>(`${BASE}${query({ ...c })}`),
    enabled,
  });
}

function useReservationMutation<V, R>(fn: (v: V) => Promise<R>) {
  const client = useQueryClient();
  const tenant = useTenant();
  return useMutation({
    mutationFn: fn,
    onSettled: () => {
      client.invalidateQueries({ queryKey: ['fleet', 'stock-reservations', tenant] });
      client.invalidateQueries({ queryKey: ['fleet', 'items', tenant] });
    },
  });
}

export function useReserveStock() {
  return useReservationMutation((r: SaveStockReservationRequest) => apiSend<StockReservationDto>('POST', BASE, r));
}

export function useReleaseReservation() {
  return useReservationMutation((id: string) => apiSend<StockReservationDto>('POST', `${BASE}/${id}/release`));
}
