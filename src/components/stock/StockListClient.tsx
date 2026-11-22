'use client'

import { useRouter } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import type { StockView } from '@/lib/api/fleet/items'
import { DataTable } from '@/components/shared/DataTable'
import { useT } from '@/i18n/I18nContext'

const col = createColumnHelper<StockView>()

interface StockListClientProps {
  data: StockView[]
}

function fmt(value: number | undefined): string {
  if (value == null) return '—'
  return value.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

/** Same columns; rows = Fleet items. Qty / cost arrive with the stock ledger (P4). No delete: inactive. */
export function StockListClient({ data }: StockListClientProps) {
  const router = useRouter()
  const { t } = useT()

  const columns = [
    col.display({
      id: 'stockItem',
      header: 'Stock Item',
      cell: (info) => {
        const s = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => router.push(`/master/stock/${s.id}`)}
              className="text-blue-600 hover:underline text-left text-sm font-medium font-mono"
            >
              {s.code}
            </button>
            <span className="text-xs text-gray-400">{s.description}</span>
          </div>
        )
      },
    }),
    col.display({
      id: 'categoryBrand',
      header: 'Category / Brand',
      cell: (info) => {
        const { stockCategory, brand, uom } = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">{stockCategory || '—'}</span>
            <span className="text-xs text-gray-400">
              {[brand, uom].filter(Boolean).join(' · ') || '—'}
            </span>
          </div>
        )
      },
    }),
    col.display({
      id: 'qtyReorder',
      header: 'Qty / Reorder',
      cell: (info) => {
        const { totalQtyOnHand, reOrderLevel, minQty, maxQty } = info.row.original
        const qty = totalQtyOnHand
        const isLow = qty != null && reOrderLevel != null && qty <= reOrderLevel
        return (
          <div className="flex flex-col gap-0.5">
            <span className={`text-sm font-bold ${isLow ? 'text-orange-500' : 'text-gray-800'}`}>
              {qty != null ? fmt(qty) : '—'}
            </span>
            <span className="text-xs text-gray-400">
              Min: {minQty ?? '—'} / Max: {maxQty ?? '—'}
            </span>
          </div>
        )
      },
    }),
    col.display({
      id: 'price',
      header: 'Price',
      cell: (info) => {
        const { sellingPrice, avgCostPerUnit } = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">
              {sellingPrice != null ? `฿${fmt(sellingPrice)}` : '—'}
            </span>
            <span className="text-xs text-gray-400">
              Avg cost: {avgCostPerUnit != null ? `฿${fmt(avgCostPerUnit)}` : '—'}
            </span>
          </div>
        )
      },
    }),
    col.display({
      id: 'actions',
      header: '',
      size: 120,
      cell: (info) => {
        const s = info.row.original
        return (
          <div className="flex items-center gap-2 justify-end">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                s.isActive
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {s.isActive ? 'Active' : 'Inactive'}
            </span>
            <button
              type="button"
              onClick={() => router.push(`/master/stock/${s.id}`)}
              className="text-xs text-blue-600 hover:underline"
            >
              {t('common.edit')}
            </button>
            {/* No delete in the API: switch the item off instead (prompt 07). */}
          </div>
        )
      },
    }),
  ]

  return <DataTable data={data} columns={columns} pageSize={15} />
}
