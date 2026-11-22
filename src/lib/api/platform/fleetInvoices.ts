'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiSend, query } from '@/lib/api/client';
import type { components } from '@/lib/api/platform.schema';
import { useAuth } from '@/lib/contexts/AuthContext';

/** WO invoices = Revenue invoices of fleet recharges (prompt 12 §D), Platform API `/api/revenue/fleet/...`. */
type S = components['schemas'];
export type FleetInvoiceDto = S['FleetInvoiceDto'];
export type FleetInvoiceLineDto = S['FleetInvoiceLineDto'];
export type FleetChargeDto = S['FleetChargeDto'];
export type FleetInvoiceable = S['FleetInvoiceableDto'];
export type IssueFleetInvoiceRequest = S['IssueFleetInvoiceRequest'];
export type PartyDetail = S['PartyDetailResponse'];

const BASE = '/api/revenue/fleet';

/** Invoice status → the screen's ACTIVE / CANCELLED (voiding is Revenue's credit-note flow). */
export const viewInvoiceStatus = (s: string): 'ACTIVE' | 'CANCELLED' => (s === 'CANCELLED' || s === 'VOID' || s === 'VOIDED' ? 'CANCELLED' : 'ACTIVE');

/** One address line from the party (address, address2, city, state, postcode). */
export function partyAddress(p: Pick<PartyDetail, 'address' | 'address2' | 'city' | 'state' | 'postcode'> | undefined | null) {
  if (!p) return '';
  return [p.address, p.address2, [p.city, p.state, p.postcode].filter(Boolean).join(' ')].filter((x) => x && String(x).trim()).join(', ');
}

/** Invoice line + its fleet charge → the screen's line (equipment, service type = source line type, stock type = rate ref). */
export interface InvoiceLineView {
  key: string; workOrderNo: string; chargeCode: string; chargeName: string; quantity: number; unitPrice: number; totalAmount: number
  equipmentCode: string; serviceType: string; transactionType: string; stockType: string
}
/** Fields the invoice line carries itself (owner answer 12 Q6); optional until `npm run api:types` brings them in. */
export type InvoiceLineWithCharge = FleetInvoiceLineDto & { assetCode?: string | null; sourceLineType?: string | null; rateCardRef?: string | null; rechargeNo?: string | null };
/** True while a line lacks them, so the screen must join `/fleet/charges`. */
export const linesNeedCharges = (lines: InvoiceLineWithCharge[]) => lines.some((l) => l.sourceLineType === undefined);

export function toInvoiceLines(lines: InvoiceLineWithCharge[], charges: FleetChargeDto[]): InvoiceLineView[] {
  const byId = new Map(charges.map((c) => [c.fleetChargeId, c]));
  return lines.map((l) => {
    const c = byId.get(l.fleetChargeId);
    return {
      key: l.invoiceLineId, workOrderNo: l.workOrderNo ?? c?.workOrderNo ?? '', chargeCode: l.chargeCode, chargeName: l.chargeName,
      quantity: Number(l.quantity), unitPrice: Number(l.unitRate), totalAmount: Number(l.amount),
      equipmentCode: l.assetCode ?? c?.assetCode ?? '', serviceType: l.sourceLineType ?? c?.sourceLineType ?? '',
      transactionType: l.rechargeNo ?? c?.rechargeNo ?? '', stockType: l.rateCardRef ?? c?.rateCardRef ?? '',
    };
  });
}

function useTenant() {
  return useAuth().user?.tenantId;
}
const key = (tenant?: string, ...rest: unknown[]) => ['revenue', 'fleet', tenant, ...rest];

export function useFleetInvoices(c: { branchId?: string; payerPartyCode?: string; search?: string; status?: string; from?: string; to?: string }) {
  const tenant = useTenant();
  return useQuery({
    queryKey: key(tenant, 'invoices', c),
    queryFn: async () => (await apiGet<S['PagedResultOfFleetInvoiceDto']>(`${BASE}/invoices${query({ ...c, page: 1, pageSize: 200 })}`)).items,
    placeholderData: keepPreviousData,
  });
}

export function useFleetInvoice(id: string | null) {
  const tenant = useTenant();
  return useQuery({ queryKey: key(tenant, 'invoice', id), queryFn: () => apiGet<FleetInvoiceDto>(`${BASE}/invoices/${id}`), enabled: !!id });
}

export function useFleetCharges(c: { branchId?: string; payerPartyCode?: string; status?: string; workOrderNo?: string }, enabled = true) {
  const tenant = useTenant();
  return useQuery({
    queryKey: key(tenant, 'charges', c),
    queryFn: async () => (await apiGet<S['PagedResultOfFleetChargeDto']>(`${BASE}/charges${query({ ...c, page: 1, pageSize: 500 })}`)).items,
    enabled,
  });
}

export function useInvoiceable(branchId: string | null) {
  const tenant = useTenant();
  return useQuery({ queryKey: key(tenant, 'invoiceable', branchId), queryFn: () => apiGet<FleetInvoiceable[]>(`${BASE}/invoiceable${query({ branchId: branchId ?? undefined })}`) });
}

export function useParty(partyCode: string | null) {
  const tenant = useTenant();
  return useQuery({
    queryKey: ['platform', 'party', tenant, partyCode],
    queryFn: () => apiGet<PartyDetail>(`/api/master/parties/${encodeURIComponent(partyCode!)}`),
    enabled: !!partyCode,
    staleTime: 5 * 60_000,
  });
}

export function useIssueFleetInvoice() {
  const client = useQueryClient();
  const tenant = useTenant();
  return useMutation({
    mutationFn: (body: IssueFleetInvoiceRequest) => apiSend<FleetInvoiceDto>('POST', `${BASE}/invoices`, body),
    onSettled: () => {
      client.invalidateQueries({ queryKey: key(tenant) });
      client.invalidateQueries({ queryKey: ['fleet', 'recharges', tenant] });
    },
  });
}
