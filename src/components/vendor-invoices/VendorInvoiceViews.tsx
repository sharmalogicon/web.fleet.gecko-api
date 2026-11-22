'use client'

import { useState } from 'react'
import Link from 'next/link'
import { notFound, useSearchParams } from 'next/navigation'
import { ListPage } from '@/components/shared/ListPage'
import { Alert, Loading } from '@/components/docs/DocBits'
import { useT } from '@/i18n/I18nContext'
import {
  groupUnbilled, lineFromUnbilled, newInvoiceForm, toFormValues, toRow, unbilledKey, useUnbilled, useVendorInvoice, useVendorInvoices,
} from '@/lib/api/fleet/vendorInvoices'
import { useFleetAccess } from '@/lib/api/fleet/access'
import { useBranchContext } from '@/lib/api/platform/branches'
import { ApiError } from '@/lib/api/problem'
import { errorText } from '@/lib/api/errorText'
import { UnbilledInvoiceClient } from './UnbilledInvoiceClient'
import { UnbilledInvoiceFilters } from './UnbilledInvoiceFilters'
import { VendorInvoiceFilters } from './VendorInvoiceFilters'
import { VendorInvoiceListClient } from './VendorInvoiceListClient'
import { VendorInvoiceFormClient } from './VendorInvoiceFormClient'
import { ExportDialog } from './ExportDialog'

// ── A. unbilled ─────────────────────────────────────────────────────────────
export function UnbilledListView(p: { vendorName: string; poNo: string; grNo: string; dateFrom: string; dateTo: string }) {
  const { t } = useT()
  const { canAnywhere } = useFleetAccess()
  // One API `search` (document, PO, supplier…): the first box that is filled.
  const list = useUnbilled({ search: p.grNo || p.poNo || p.vendorName || undefined, from: p.dateFrom || undefined, to: p.dateTo || undefined })
  const rows = groupUnbilled(list.data ?? [])
  return (
    <ListPage
      title={t('nav.unbilledInvoices')}
      subtitle={`${rows.length} unbilled item${rows.length !== 1 ? 's' : ''} found`}
      filters={<UnbilledInvoiceFilters {...p} />}
    >
      {list.isLoading ? <Loading /> : list.error ? <div className="m-4"><Alert>{errorText(list.error, t)}</Alert></div> : (
        <UnbilledInvoiceClient data={rows} canCreate={canAnywhere('fleet.vendorinvoice.manage')} />
      )}
    </ListPage>
  )
}

// ── B. invoices ─────────────────────────────────────────────────────────────
interface ListProps {
  documentNo: string
  customerName: string
  vendorInvoiceNo: string
  status: string
  dateFrom: string
  dateTo: string
}

export function VendorInvoicesListView(p: ListProps) {
  const { t } = useT()
  const { canAnywhere } = useFleetAccess()
  const [exporting, setExporting] = useState(false)
  const list = useVendorInvoices({
    search: p.documentNo || p.vendorInvoiceNo || p.customerName || undefined, status: p.status && p.status !== 'ALL' ? p.status : undefined,
    from: p.dateFrom || undefined, to: p.dateTo || undefined,
  })
  const rows = (list.data ?? []).map(toRow)
  return (
    <ListPage
      title={t('nav.vendorInvoices')}
      subtitle={`${rows.length} invoice${rows.length !== 1 ? 's' : ''} found`}
      actions={
        <div className="flex items-center gap-2">
          {canAnywhere('fleet.vendorinvoice.export') && (
            <button type="button" onClick={() => setExporting(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50">
              {t('vinv.export.button')}
            </button>
          )}
          {canAnywhere('fleet.vendorinvoice.manage') && (
            <Link href="/invoice/vendor/new" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700">
              + {t('nav.vendorInvoices')}
            </Link>
          )}
        </div>
      }
      filters={<VendorInvoiceFilters {...p} />}
    >
      {list.isLoading ? <Loading /> : list.error ? <div className="m-4"><Alert>{errorText(list.error, t)}</Alert></div> : <VendorInvoiceListClient data={rows} />}
      {exporting && <ExportDialog onClose={() => setExporting(false)} />}
    </ListPage>
  )
}

/** `new?supplier=&branch=&pick=` (from Unbilled): the supplier and that row's lines pre-selected. */
function NewInvoice() {
  const sp = useSearchParams()
  const { current } = useBranchContext()
  const supplier = sp.get('supplier') ?? ''
  const branch = sp.get('branch') ?? current?.branchId ?? ''
  const pick = sp.get('pick')
  const unbilled = useUnbilled({ supplierPartyCode: supplier || undefined, branchId: branch || undefined }, !!pick && !!supplier)
  if (pick && unbilled.isLoading) return <Loading />
  const record = newInvoiceForm(branch, supplier)
  if (pick) record.lines = (unbilled.data ?? []).filter((l) => unbilledKey(l) === pick).map(lineFromUnbilled)
  return <VendorInvoiceFormClient key={`${branch}:${supplier}:${pick}`} record={record} isNew />
}

export function VendorInvoiceView({ id }: { id: string }) {
  const { t } = useT()
  const isNew = id === 'new'
  const inv = useVendorInvoice(isNew ? null : id)
  if (isNew) return <NewInvoice />
  if (inv.isLoading) return <Loading />
  if (inv.error instanceof ApiError && (inv.error.status === 404 || inv.error.status === 400)) notFound()
  if (inv.error || !inv.data) return <Alert>{errorText(inv.error, t)}</Alert>
  return <VendorInvoiceFormClient key={inv.data.rowVersion} record={toFormValues(inv.data)} current={inv.data} isNew={false} />
}
