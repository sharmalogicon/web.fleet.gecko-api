'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet, query } from '@/lib/api/client';
import type { components } from '@/lib/api/fleet.schema';
import { useAuth } from '@/lib/contexts/AuthContext';

/**
 * Stock cost corrections from invoice price variance (prompt 20): read-only. Posted when a vendor invoice is approved
 * (billed at another price than received), reversed when it is cancelled.
 */

export type CostAdjustmentDto = components['schemas']['CostAdjustmentDto'];

export interface CostCorrectionRow {
  id: string;
  itemCode: string;
  warehouseCode: string;
  sourceDocNo: string;
  valueDelta: number;
  avgCostBefore: number;
  avgCostAfter: number;
  revaluedAmount: number;
  expensedAmount: number;
  postedAt: string;
  /** This row reverses an earlier correction (the invoice was cancelled). */
  isReversal: boolean;
  /** An earlier correction that a later row reverses. */
  isReversed: boolean;
}

const num = (v: number | string | null | undefined) => (v === null || v === undefined || v === '' ? 0 : Number(v));

/** Newest first; a reversal and the row it reverses are both marked. */
export function toCostCorrections(rows: CostAdjustmentDto[]): CostCorrectionRow[] {
  const reversed = new Set(rows.map((r) => r.reversesCostAdjustmentId).filter(Boolean) as string[]);
  return [...rows]
    .sort((a, b) => b.postedAt.localeCompare(a.postedAt))
    .map((r) => ({
      id: r.costAdjustmentId, itemCode: r.itemCode, warehouseCode: r.warehouseCode, sourceDocNo: r.sourceDocNo ?? '',
      valueDelta: num(r.valueDelta), avgCostBefore: num(r.avgCostBefore), avgCostAfter: num(r.avgCostAfter),
      revaluedAmount: num(r.revaluedAmount), expensedAmount: num(r.expensedAmount), postedAt: r.postedAt,
      isReversal: !!r.reversesCostAdjustmentId, isReversed: reversed.has(r.costAdjustmentId),
    }));
}

export function useCostAdjustments(c: { itemId?: string; warehouseId?: string; vendorInvoiceId?: string; from?: string; to?: string }, enabled = true) {
  const tenant = useAuth().user?.tenantId;
  return useQuery({
    queryKey: ['fleet', 'items', tenant, 'cost-adjustments', c],
    queryFn: async () => toCostCorrections(await apiGet<CostAdjustmentDto[]>(`/api/fleet/cost-adjustments${query({ ...c })}`)),
    enabled,
  });
}
