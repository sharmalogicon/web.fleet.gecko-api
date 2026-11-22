'use client'

import Link from 'next/link'
import { notFound, useSearchParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import { ListPage } from '@/components/shared/ListPage'
import { DataTable } from '@/components/shared/DataTable'
import { Alert, Loading, fmtDate, money } from '@/components/docs/DocBits'
import { useT } from '@/i18n/I18nContext'
import {
  CN_STATUS_TONE, newCnForm, toFormValues, toRow, useVendorCreditNote, useVendorCreditNotes, type CnRow,
} from '@/lib/api/fleet/vendorCreditNotes'
import { useVendorInvoice } from '@/lib/api/fleet/vendorInvoices'
import { useFleetAccess } from '@/lib/api/fleet/access'
import { useBranchContext } from '@/lib/api/platform/branches'
import { ApiError } from '@/lib/api/problem'
import { errorText } from '@/lib/api/errorText'
import { VendorCreditNoteFilters } from './VendorCreditNoteFilters'
import { VendorCreditNoteFormClient } from './VendorCreditNoteFormClient'

const col = createColumnHelper<CnRow>()

/** Same columns; the API status; no Delete (a note is cancelled). */
function VendorCreditNoteList({ data }: { data: CnRow[] }) {
  const router = useRouter()
  const { t } = useT()
  const open = (r: CnRow) => router.push(`/invoice/credit-notes/vendor/${r.vendorCreditNoteID}`)
  const columns = [
    col.display({
      id: 'noDate', header: 'Credit Note No / Date',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <button type="button" onClick={() => open(r)} className="text-blue-600 hover:underline text-left text-sm font-medium font-mono">{r.creditNoteNo}</button>
            <span className="text-xs text-gray-400">{fmtDate(r.creditNoteDate)}{r.supplierDocNo ? ` · ${r.supplierDocNo}` : ''}</span>
          </div>
        )
      },
    }),
    col.display({
      id: 'vendor', header: () => t('common.vendor'),
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-gray-900 font-medium">{r.vendorName || '—'}</span>
            <span className="text-xs text-gray-400 font-mono">{r.vendorCode}{r.vendorInvoiceNo ? ` · ${r.vendorInvoiceNo}` : ''}</span>
          </div>
        )
      },
    }),
    col.display({
      id: 'amount', header: () => t('common.amount'),
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-gray-900">{money(r.nettAmount)}</span>
            {r.discount > 0 && <span className="text-xs text-gray-400">Disc {r.discountType === 'PERCENT' ? `${r.discount}%` : money(r.discount)}</span>}
          </div>
        )
      },
    }),
    col.display({
      id: 'status', header: () => t('common.status'), size: 140,
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-1">
            <span className={`inline-block self-start px-2 py-0.5 text-xs font-medium rounded-full ${CN_STATUS_TONE[r.status] ?? 'bg-gray-100 text-gray-700'}`}>{t(`vcn.status.${r.status}`)}</span>
            <button type="button" onClick={() => open(r)} className="text-xs text-blue-600 hover:underline text-left">{t('common.edit')}</button>
          </div>
        )
      },
    }),
  ]
  return <DataTable data={data} columns={columns} pageSize={15} />
}

export function VendorCreditNotesListView(p: { creditNoteNo: string; vendorName: string; status: string; dateFrom: string; dateTo: string }) {
  const { t } = useT()
  const { canAnywhere } = useFleetAccess()
  const list = useVendorCreditNotes({
    search: p.creditNoteNo || p.vendorName || undefined, status: p.status && p.status !== 'ALL' ? p.status : undefined,
    from: p.dateFrom || undefined, to: p.dateTo || undefined,
  })
  const rows = (list.data ?? []).map(toRow)
  return (
    <ListPage
      title={t('nav.creditNotesVendor')}
      subtitle={`${rows.length} credit note${rows.length !== 1 ? 's' : ''} found`}
      actions={canAnywhere('fleet.vendorinvoice.manage') && (
        <Link href="/invoice/credit-notes/vendor/new" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700">
          + {t('nav.creditNotesVendor')}
        </Link>
      )}
      filters={<VendorCreditNoteFilters {...p} />}
    >
      {list.isLoading ? <Loading /> : list.error ? <div className="m-4"><Alert>{errorText(list.error, t)}</Alert></div> : <VendorCreditNoteList data={rows} />}
    </ListPage>
  )
}

/** `new?invoiceId=` starts a note against that invoice (its supplier + branch). */
function NewCreditNote() {
  const invoiceId = useSearchParams().get('invoiceId')
  const { current } = useBranchContext()
  const inv = useVendorInvoice(invoiceId)
  if (invoiceId && inv.isLoading) return <Loading />
  const record = inv.data
    ? { ...newCnForm(inv.data.branchId, inv.data.supplierPartyCode), vendorName: inv.data.supplierName ?? '', vendorInvoiceId: inv.data.vendorInvoiceId,
        vendorInvoiceNo: inv.data.documentNo, reasonCode: 'PRICE', vat: Number(inv.data.taxRate) }
    : newCnForm(current?.branchId ?? '')
  return <VendorCreditNoteFormClient key={invoiceId ?? 'blank'} record={record} isNew />
}

export function VendorCreditNoteView({ id }: { id: string }) {
  const { t } = useT()
  const isNew = id === 'new'
  const cn = useVendorCreditNote(isNew ? null : id)
  if (isNew) return <NewCreditNote />
  if (cn.isLoading) return <Loading />
  if (cn.error instanceof ApiError && (cn.error.status === 404 || cn.error.status === 400)) notFound()
  if (cn.error || !cn.data) return <Alert>{errorText(cn.error, t)}</Alert>
  return <VendorCreditNoteFormClient key={cn.data.rowVersion} record={toFormValues(cn.data)} current={cn.data} isNew={false} />
}
