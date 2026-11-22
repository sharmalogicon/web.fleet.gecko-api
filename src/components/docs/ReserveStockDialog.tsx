'use client'

import { useState } from 'react'
import { Button, Panel } from '@/components/fleet-setup/ui'
import { Alert, Loading, cellInput } from '@/components/docs/DocBits'
import { useWarehouses } from '@/lib/api/fleet/warehouses'
import {
  activeFor, reserveRequest, useReleaseReservation, useReserveStock, useStockReservations, type ReservableLine,
} from '@/lib/api/fleet/stockReservations'
import { errorText } from '@/lib/api/errorText'
import { useToastStore } from '@/lib/stores/useToastStore'
import { useT } from '@/i18n/I18nContext'

/**
 * Reserve / release stock for WO part lines or goods-request lines (prompt 19 §B).
 * qty empty = what the line still needs; 409 "Only x is free in <store>" / "already has an active reservation".
 */
export function ReserveStockDialog({ title, lines, branchId, workOrderId, defaultWarehouseId, onClose }: {
  title: string
  lines: ReservableLine[]
  branchId: string
  workOrderId?: string
  defaultWarehouseId?: string | null
  onClose: () => void
}) {
  const { t } = useT()
  const toast = useToastStore()
  const stores = useWarehouses({ branchId, active: true })
  const [warehouseId, setWarehouseId] = useState(defaultWarehouseId ?? '')
  // WO: all of its reservations; goods request: the store's active ones (matched by line id).
  const reservations = useStockReservations(workOrderId ? { workOrderId, status: 'ACTIVE' } : { warehouseId, status: 'ACTIVE' }, !!workOrderId || !!warehouseId)
  const reserve = useReserveStock()
  const release = useReleaseReservation()
  const [qty, setQty] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  const run = (line: ReservableLine) => {
    const { request, error } = reserveRequest(line, warehouseId, qty[line.lineId] ?? '')
    if (!request) { setErrors({ ...errors, [line.lineId]: t(error!) }); return }
    setErrors({ ...errors, [line.lineId]: '' })
    reserve.mutate(request, {
      onSuccess: (r) => toast.success(t('reserve.done'), `${r.itemCode} · ${Number(r.qty).toLocaleString()} @ ${r.warehouseCode}`),
      onError: (e) => setErrors((x) => ({ ...x, [line.lineId]: errorText(e, t) })),
    })
  }

  return (
    <Panel open variant="modal" title={title} onClose={onClose} footer={<Button onClick={onClose}>{t('common.close')}</Button>}>
      <label className="flex flex-col gap-1 text-xs font-medium text-gray-700">{t('docs.store')} *
        <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className={cellInput}>
          <option value="">—</option>
          {stores.data?.map((w) => <option key={w.warehouseId} value={w.warehouseId}>{w.warehouseCode} · {w.nameEn}</option>)}
        </select>
      </label>
      <p className="text-xs text-gray-500">{t('reserve.hint')}</p>
      {reservations.isLoading && (!!workOrderId || !!warehouseId) ? <Loading /> : reservations.error ? <Alert>{errorText(reservations.error, t)}</Alert> : (
        <div className="overflow-x-auto max-h-[50vh]">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-1 pr-3">Item</th><th className="py-1 pr-3 text-right">Qty</th><th className="py-1 pr-3">{t('reserve.reserved')}</th><th className="py-1" />
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 && <tr><td colSpan={4} className="py-4 text-center text-gray-400">{t('reserve.noLines')}</td></tr>}
              {lines.map((l) => {
                const active = activeFor(reservations.data, l)
                return (
                  <tr key={l.lineId} className="border-t border-gray-100 align-top">
                    <td className="py-1.5 pr-3"><span className="font-mono">{l.itemCode}</span> {l.description}
                      {errors[l.lineId] && <p className="text-red-600 mt-0.5">{errors[l.lineId]}</p>}</td>
                    <td className="py-1.5 pr-3 text-right">{l.qty.toLocaleString()} {l.uomCode ?? ''}</td>
                    <td className="py-1.5 pr-3">{active ? <span className="text-green-700">{Number(active.qty).toLocaleString()} @ {active.warehouseCode}</span> : '—'}</td>
                    <td className="py-1.5 text-right whitespace-nowrap">
                      {active ? (
                        <button type="button" disabled={release.isPending} onClick={() => release.mutate(active.stockReservationId, {
                          onSuccess: () => toast.success(t('reserve.released')), onError: (e) => setErrors((x) => ({ ...x, [l.lineId]: errorText(e, t) })),
                        })} className="text-red-600 hover:underline">{t('reserve.release')}</button>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <input value={qty[l.lineId] ?? ''} onChange={(e) => setQty({ ...qty, [l.lineId]: e.target.value })} inputMode="decimal"
                            placeholder={t('reserve.allNeeded')} className={`${cellInput} w-24 text-right`} />
                          <button type="button" disabled={reserve.isPending || !warehouseId} onClick={() => run(l)}
                            className="px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">{t('reserve.reserve')}</button>
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  )
}

/** The Stock form's "Reserved" list (GET /stock-reservations?itemId=) with Release. */
export function ItemReservations({ itemId, canRelease }: { itemId: string; canRelease: boolean }) {
  const { t } = useT()
  const toast = useToastStore()
  const list = useStockReservations({ itemId, status: 'ACTIVE' })
  const release = useReleaseReservation()
  if (list.isLoading) return <Loading />
  if (list.error) return <Alert>{errorText(list.error, t)}</Alert>
  const rows = list.data ?? []
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{t('reserve.listTitle')}</p>
      {rows.length === 0 ? <p className="text-sm text-gray-400">{t('reserve.none')}</p> : (
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-gray-500"><th className="py-1 pr-3">{t('docs.store')}</th><th className="py-1 pr-3 text-right">Qty</th><th className="py-1 pr-3">{t('reserve.for')}</th><th className="py-1 pr-3">{t('common.date')}</th><th /></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.stockReservationId} className="border-t border-gray-100">
                <td className="py-1.5 pr-3 font-mono text-xs">{r.warehouseCode}</td>
                <td className="py-1.5 pr-3 text-right">{Number(r.qty).toLocaleString()}</td>
                <td className="py-1.5 pr-3 text-xs">{r.sourceType === 'WO_PART' ? r.workOrderNo : r.goodsRequestNo}</td>
                <td className="py-1.5 pr-3 text-xs">{new Date(r.createdAt).toLocaleDateString('en-GB')}</td>
                <td className="py-1.5 text-right">
                  {canRelease && (
                    <button type="button" disabled={release.isPending} onClick={() => release.mutate(r.stockReservationId, {
                      onSuccess: () => toast.success(t('reserve.released')), onError: (e) => toast.error(t('common.saveFailed'), errorText(e, t)),
                    })} className="text-xs text-red-600 hover:underline">{t('reserve.release')}</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
