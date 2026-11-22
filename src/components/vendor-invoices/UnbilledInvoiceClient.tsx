'use client'

import { useRouter } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import { DataTable } from '@/components/shared/DataTable'
import type { UnbilledRow } from '@/lib/api/fleet/vendorInvoices'
import { useT } from '@/i18n/I18nContext'

const col = createColumnHelper<UnbilledRow>()

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr.slice(0, 10) + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatCurrency(value?: number): string {
  if (value === undefined || value === null) return '—'
  return '฿' + value.toLocaleString('en-US', { minimumFractionDigits: 2 })
}

/** One row per GRN (its lines summed), or per sublet / tyre event (source badge). */
export function UnbilledInvoiceClient({ data, canCreate }: { data: UnbilledRow[]; canCreate: boolean }) {
  const router = useRouter()
  const { t } = useT()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columns: import('@tanstack/react-table').ColumnDef<UnbilledRow, any>[] = [
    col.display({
      id: 'grNoDate',
      header: 'GR No / Date',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium font-mono text-gray-900">{r.grNo}</span>
            <span className="text-xs text-gray-400">{formatDate(r.orderDate)}</span>
            {r.source !== 'GRN_LINE' && (
              <span className="inline-flex w-fit px-1.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
                {t(`vinv.source.${r.source}`)}{r.workOrderNo ? ` · ${r.workOrderNo}` : ''}
              </span>
            )}
            {r.lines.length > 1 && <span className="text-[10px] text-gray-400">{r.lines.length} {t('vinv.lines')}</span>}
          </div>
        )
      },
    }),
    col.display({
      id: 'poNo',
      header: 'PO No',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium font-mono text-gray-900">{r.poNo || '—'}</span>
            {r.vendorDoNo && (
              <span className="text-xs text-gray-400">{r.vendorDoNo}</span>
            )}
          </div>
        )
      },
    }),
    col.display({
      id: 'vendor',
      header: 'Vendor',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-gray-900">{r.vendorName}</span>
            <span className="text-xs text-gray-400">{r.vendorCode}{r.vendorInvoiceRef ? ` · ${r.vendorInvoiceRef}` : ''}</span>
          </div>
        )
      },
    }),
    col.display({
      id: 'vatTotal',
      header: 'VAT / Total',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5 text-right">
            <span className="text-sm font-medium text-gray-900">{formatCurrency(r.totalAmount)}</span>
            {r.vatAmount !== undefined && (
              <span className="text-xs text-gray-400">VAT {formatCurrency(r.vatAmount)}</span>
            )}
          </div>
        )
      },
    }),
    col.display({
      id: 'nettAction',
      header: 'Net Amount',
      size: 160,
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-gray-900 tabular-nums">
              {formatCurrency(r.nettAmount)}
            </span>
            {canCreate && <button
              type="button"
              onClick={() => router.push(`/invoice/vendor/new?supplier=${encodeURIComponent(r.vendorCode)}&branch=${r.branchId}&pick=${encodeURIComponent(r.key)}`)}
              className="shrink-0 text-xs px-2 py-1 rounded-md bg-blue-600 text-white hover:bg-blue-700 font-medium"
            >
              Create Invoice
            </button>}
          </div>
        )
      },
    }),
  ]

  return <DataTable data={data} columns={columns} pageSize={15} />
}
