import { Suspense } from 'react'
import { getVendorPayments } from '@/lib/data/vendor-payments'
import { VendorPaymentListClient } from '@/components/vendor-payments/VendorPaymentListClient'
import { VendorPaymentFilters } from '@/components/vendor-payments/VendorPaymentFilters'
import { ListPage } from '@/components/shared/ListPage'
import { getT } from '@/i18n/server'

export const metadata = { title: 'Vendor Payments | Fleet' }

interface PageProps {
  searchParams: Promise<{
    receiptNo?: string
    vendorName?: string
    status?: string
    dateFrom?: string
    dateTo?: string
  }>
}

export default async function VendorPaymentsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const { t } = await getT()

  // Map status string to isApproved filter
  let isApproved: boolean | 'ALL' = 'ALL'
  if (params.status === 'APPROVED') isApproved = true
  else if (params.status === 'PENDING') isApproved = false

  const records = await getVendorPayments({
    receiptNo: params.receiptNo,
    vendorName: params.vendorName,
    isApproved,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  })

  return (
    <ListPage
      title={t('nav.vendorPayments')}
      subtitle={`${records.length} vendor payment${records.length !== 1 ? 's' : ''} found`}
      filters={
        <VendorPaymentFilters
          receiptNo={params.receiptNo ?? ''}
          vendorName={params.vendorName ?? ''}
          status={params.status ?? 'ALL'}
          dateFrom={params.dateFrom ?? ''}
          dateTo={params.dateTo ?? ''}
        />
      }
    >
      <Suspense fallback={null}>
        <VendorPaymentListClient initialData={records} />
      </Suspense>
    </ListPage>
  )
}
