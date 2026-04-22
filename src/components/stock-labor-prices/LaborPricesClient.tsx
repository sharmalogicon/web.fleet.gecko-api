'use client'

import { DataTable } from '@/components/shared/DataTable'
import { createColumnHelper } from '@tanstack/react-table'
import type { LaborPrice } from '@/types/stock-labor-price'
import { MOCK_LABOR_MARKUP, MOCK_LABOR_PRICES } from '@/lib/mock/stock-labor-prices'

const col = createColumnHelper<LaborPrice>()

export function LaborPricesClient() {
  const markup = MOCK_LABOR_MARKUP
  const prices = MOCK_LABOR_PRICES

  const columns = [
    col.display({
      id: 'code',
      header: 'Code / Description',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-medium font-mono text-sm">{r.code}</span>
            <span className="text-xs text-gray-400">{r.description}</span>
          </div>
        )
      },
    }),
    col.display({
      id: 'category',
      header: 'Category',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm">{r.category || '—'}</span>
            <span className={`text-xs font-medium ${r.isActive ? 'text-green-600' : 'text-gray-400'}`}>
              {r.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        )
      },
    }),
    col.display({
      id: 'rate',
      header: 'Rate / OT',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">฿{r.ratePerHour.toLocaleString()}/hr</span>
            {r.overtimeRate && (
              <span className="text-xs text-gray-400">OT: ฿{r.overtimeRate.toLocaleString()}/hr</span>
            )}
          </div>
        )
      },
    }),
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Markup Settings Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Stock Markup Settings
          </h2>
        </div>
        <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-6">
          {[
            { label: 'Markup % (Own)', value: markup.markupValueOwn },
            { label: 'Markup % (Other)', value: markup.markupValueOther },
            { label: 'Claim % (Own)', value: markup.markupClaimOwn },
            { label: 'Claim % (Other)', value: markup.markupClaimOther },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">{label}</label>
              <div className="flex items-center gap-1">
                <span className="text-2xl font-bold text-gray-900">{value}</span>
                <span className="text-sm text-gray-400">%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Labor Price Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Labor Prices
          </h2>
        </div>
        <DataTable data={prices} columns={columns} pageSize={15} />
      </div>
    </div>
  )
}
