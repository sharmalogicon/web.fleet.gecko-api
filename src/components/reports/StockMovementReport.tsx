'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Alert, Loading, cellInput, fmtDate, money, num } from '@/components/docs/DocBits'
import { useT } from '@/i18n/I18nContext'
import { apiGet, query } from '@/lib/api/client'
import { errorText } from '@/lib/api/errorText'
import type { components } from '@/lib/api/fleet.schema'
import { useItems } from '@/lib/api/fleet/items'
import { useWarehouses } from '@/lib/api/fleet/warehouses'
import { useAuth } from '@/lib/contexts/AuthContext'

type Ledger = components['schemas']['StockLedgerDto']

/**
 * Stock Movement Report = the item ledger `GET /items/{id}/ledger` (owner answer 11 Q1: movements go into a report,
 * not a tab on the stock form). Newest first: movement, qty, unit cost, value, qty / average after, source document.
 */
export function StockMovementReport({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const { t } = useT()
  const tenant = useAuth().user?.tenantId
  const items = useItems({ active: true })
  const stores = useWarehouses({ active: true })
  const [code, setCode] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  const item = items.data?.find((x) => x.itemCode.toUpperCase() === code.trim().toUpperCase())
  const ledger = useQuery({
    queryKey: ['fleet', 'items', tenant, 'ledger', item?.itemId, warehouseId, dateFrom, dateTo],
    queryFn: async () => (await apiGet<components['schemas']['PagedResultOfStockLedgerDto']>(
      `/api/fleet/items/${item!.itemId}/ledger${query({ warehouseId: warehouseId || undefined, from: dateFrom || undefined, to: dateTo || undefined, page: 1, pageSize: 500 })}`)).items,
    enabled: !!item,
  })
  const storeCode = (id: string) => stores.data?.find((w) => w.warehouseId === id)?.warehouseCode ?? id.slice(0, 8)
  const rows: Ledger[] = ledger.data ?? []
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3 items-end">
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-500">
          {t('report.stockItem')} *
          <input value={code} list="smr-items" onChange={(e) => setCode(e.target.value.toUpperCase())} className={`${cellInput} w-48 font-mono`} />
          <datalist id="smr-items">{items.data?.map((x) => <option key={x.itemId} value={x.itemCode}>{x.descriptionEn}</option>)}</datalist>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-500">
          {t('docs.store')}
          <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className={`${cellInput} w-48`}>
            <option value="">{t('common.all')}</option>
            {stores.data?.map((w) => <option key={w.warehouseId} value={w.warehouseId}>{w.warehouseCode} · {w.nameEn}</option>)}
          </select>
        </label>
        {item && <span className="text-sm text-gray-600 pb-1.5">{item.descriptionEn} · {item.baseUomCode}</span>}
      </div>
      {!item ? <p className="text-sm text-gray-500">{t('report.pickItem')}</p>
        : ledger.isLoading ? <Loading />
        : ledger.error ? <Alert>{errorText(ledger.error, t)}</Alert>
        : !rows.length ? <p className="text-sm text-gray-500">{t('report.noMovements')}</p>
        : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500"><tr className="text-left">
                <th className="px-3 py-2">{t('common.date')}</th><th className="px-3 py-2">{t('report.movement')}</th><th className="px-3 py-2">{t('docs.store')}</th>
                <th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2 text-right">{t('tariff.unitCost')}</th><th className="px-3 py-2 text-right">{t('common.amount')}</th>
                <th className="px-3 py-2 text-right">{t('report.qtyAfter')}</th><th className="px-3 py-2 text-right">{t('report.avgAfter')}</th><th className="px-3 py-2">{t('report.sourceDoc')}</th>
              </tr></thead>
              <tbody>{rows.map((r) => (
                <tr key={r.stockLedgerId} className="border-t border-gray-100">
                  <td className="px-3 py-1.5">{fmtDate(r.postedAt)}</td><td className="px-3 py-1.5 text-xs font-medium">{r.movementType}{r.reversesStockLedgerId ? ' ↩' : ''}</td>
                  <td className="px-3 py-1.5 font-mono text-xs">{storeCode(r.warehouseId)}</td>
                  <td className={`px-3 py-1.5 text-right tabular-nums ${num(r.qty) < 0 ? 'text-red-600' : 'text-green-700'}`}>{num(r.qty) > 0 ? '+' : ''}{num(r.qty)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{money(r.unitCost)}</td><td className="px-3 py-1.5 text-right tabular-nums">{money(r.amount)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{num(r.qtyAfter)}</td><td className="px-3 py-1.5 text-right tabular-nums">{money(r.avgCostAfter)}</td>
                  <td className="px-3 py-1.5 font-mono text-xs">{r.sourceDocNo}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
    </div>
  )
}
