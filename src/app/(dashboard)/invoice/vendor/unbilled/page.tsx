import { Suspense } from 'react'
import { getUnbilledItems } from '@/lib/data/unbilled-invoices'
import { UnbilledInvoiceClient } from '@/components/vendor-invoices/UnbilledInvoiceClient'
import { UnbilledInvoiceFilters } from '@/components/vendor-invoices/UnbilledInvoiceFilters'
import { ListPage } from '@/components/shared/ListPage'
import { getT } from '@/i18n/server'

export const metadata = { title: 'Unbilled Vendor Invoices | Fleet' }

interface PageProps {
  searchParams: Promise<{
    vendorName?: string
    poNo?: string
    grNo?: string
    dateFrom?: string
    dateTo?: string
  }>
}

export default async function UnbilledInvoicesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const { t } = await getT()
  const items = await getUnbilledItems({
    vendorName: params.vendorName,
    poNo: params.poNo,
    grNo: params.grNo,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  })

  return (
    <ListPage
      title={t('nav.unbilledInvoices')}
      subtitle={`${items.length} unbilled item${items.length !== 1 ? 's' : ''} found`}
      filters={
        <UnbilledInvoiceFilters
          vendorName={params.vendorName ?? ''}
          poNo={params.poNo ?? ''}
          grNo={params.grNo ?? ''}
          dateFrom={params.dateFrom ?? ''}
          dateTo={params.dateTo ?? ''}
        />
      }
    >
      <Suspense fallback={null}>
        <UnbilledInvoiceClient initialData={items} />
      </Suspense>
    </ListPage>
  )
}
