import { Suspense } from 'react'
import Link from 'next/link'
import { getPurchaseOrders } from '@/lib/data/purchase-orders'
import { POListClient } from '@/components/purchase-orders/POListClient'
import { POFilters } from '@/components/purchase-orders/POFilters'
import { ListPage } from '@/components/shared/ListPage'

export const metadata = { title: 'Purchase Orders | Fleet' }

interface PageProps {
  searchParams: Promise<{
    documentNo?: string
    vendorName?: string
    status?: string
    dateFrom?: string
    dateTo?: string
  }>
}

export default async function PurchaseOrdersPage({ searchParams }: PageProps) {
  const params = await searchParams
  const purchaseOrders = await getPurchaseOrders({
    documentNo: params.documentNo,
    vendorName: params.vendorName,
    status: params.status,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  })

  return (
    <ListPage
      title="Purchase Orders"
      subtitle={`${purchaseOrders.length} purchase order${purchaseOrders.length !== 1 ? 's' : ''} found`}
      actions={
        <Link
          href="/fleet/purchase-orders/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          + New Purchase Order
        </Link>
      }
      filters={
        <POFilters
          documentNo={params.documentNo ?? ''}
          vendorName={params.vendorName ?? ''}
          status={params.status ?? 'ALL'}
          dateFrom={params.dateFrom ?? ''}
          dateTo={params.dateTo ?? ''}
        />
      }
    >
      <Suspense fallback={null}>
        <POListClient initialData={purchaseOrders} />
      </Suspense>
    </ListPage>
  )
}
