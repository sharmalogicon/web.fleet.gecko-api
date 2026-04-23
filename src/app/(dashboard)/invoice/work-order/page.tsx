import { Suspense } from 'react'
import Link from 'next/link'
import { getWOInvoices } from '@/lib/data/wo-invoices'
import { WOInvoiceListClient } from '@/components/wo-invoices/WOInvoiceListClient'
import { WOInvoiceFilters } from '@/components/wo-invoices/WOInvoiceFilters'
import { ListPage } from '@/components/shared/ListPage'
import { getT } from '@/i18n/server'

export const metadata = { title: 'WO Invoices | Fleet' }

interface PageProps {
  searchParams: Promise<{
    receiptNo?: string
    customerName?: string
    status?: string
    dateFrom?: string
    dateTo?: string
  }>
}

export default async function WOInvoicesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const { t } = await getT()
  const invoices = await getWOInvoices({
    receiptNo: params.receiptNo,
    customerName: params.customerName,
    status: params.status,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  })

  return (
    <ListPage
      title={t('nav.woInvoices')}
      subtitle={`${invoices.length} WO invoice${invoices.length !== 1 ? 's' : ''} found`}
      actions={
        <Link
          href="/invoice/work-order/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          + {t('nav.woInvoices')}
        </Link>
      }
      filters={
        <WOInvoiceFilters
          receiptNo={params.receiptNo ?? ''}
          customerName={params.customerName ?? ''}
          status={params.status ?? 'ALL'}
          dateFrom={params.dateFrom ?? ''}
          dateTo={params.dateTo ?? ''}
        />
      }
    >
      <Suspense fallback={null}>
        <WOInvoiceListClient initialData={invoices} />
      </Suspense>
    </ListPage>
  )
}
