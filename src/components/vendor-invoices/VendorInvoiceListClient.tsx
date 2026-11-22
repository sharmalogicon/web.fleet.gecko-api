'use client'

import { useRouter } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import { DataTable } from '@/components/shared/DataTable'
import { fmtDate, money } from '@/components/docs/DocBits'
import { INVOICE_STATUS_TONE, type InvoiceRow } from '@/lib/api/fleet/vendorInvoices'
import { useT } from '@/i18n/I18nContext'

const col = createColumnHelper<InvoiceRow>()

/** Same columns; the API status + match badge; no Delete (a draft is cancelled). */
export function VendorInvoiceListClient({ data }: { data: InvoiceRow[] }) {
  const router = useRouter()
  const { t } = useT()
  const open = (r: InvoiceRow) => router.push(`/invoice/vendor/${r.vendorInvoiceID}`)

  const columns = [
    col.display({
      id: 'docNoDate',
      header: 'Invoice No / Date',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <button type="button" onClick={() => open(r)} className="text-blue-600 hover:underline text-left text-sm font-medium font-mono">{r.documentNo}</button>
            <span className="text-xs text-gray-400">{fmtDate(r.documentDate)}</span>
          </div>
        )
      },
    }),
    col.display({
      id: 'customer',
      header: () => t('common.customer'),
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-gray-900 font-medium">{r.customerName || '—'}</span>
            {r.vendorInvoiceNo && <span className="text-xs text-gray-400">{r.vendorInvoiceNo}</span>}
          </div>
        )
      },
    }),
    col.display({
      id: 'creditTerm',
      header: 'Credit Term',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-gray-900 font-medium">{r.creditTerm || '—'}</span>
            {r.address && <span className="text-xs text-gray-400 truncate max-w-[180px]">{r.address}</span>}
          </div>
        )
      },
    }),
    col.display({
      id: 'amount',
      header: () => t('common.amount'),
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-gray-900">{money(r.nettAmount)}</span>
            <span className="text-xs text-gray-400">VAT {r.vat}%{r.outstandingAmount > 0 && r.outstandingAmount !== r.nettAmount ? ` · ${t('vinv.outstanding')} ${money(r.outstandingAmount)}` : ''}</span>
          </div>
        )
      },
    }),
    col.display({
      id: 'status',
      header: () => t('common.status'),
      size: 150,
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-1">
            <span className={`inline-block self-start px-2 py-0.5 text-xs font-medium rounded-full ${INVOICE_STATUS_TONE[r.status] ?? 'bg-gray-100 text-gray-700'}`}>
              {t(`vinv.status.${r.status}`)}
            </span>
            {r.matchStatus && r.matchStatus !== 'MATCHED' && <span className="text-[10px] text-red-600">{t(`vinv.match.${r.matchStatus}`)}</span>}
            <button type="button" onClick={() => open(r)} className="text-xs text-blue-600 hover:underline text-left">{t('common.edit')}</button>
          </div>
        )
      },
    }),
  ]

  return <DataTable data={data} columns={columns} pageSize={15} />
}
