import { Suspense } from 'react'
import Link from 'next/link'
import { getCustomerRates } from '@/lib/data/customer-rates'
import { CustomerRateListClient } from '@/components/customer-rates/CustomerRateListClient'
import { CustomerRateFilters } from '@/components/customer-rates/CustomerRateFilters'
import { ListPage } from '@/components/shared/ListPage'

export const metadata = { title: 'Customer Rates | Tariff' }

interface PageProps {
  searchParams: Promise<{
    quotationNo?: string
    customerName?: string
    agentCode?: string
    status?: string
    dateFrom?: string
    dateTo?: string
  }>
}

export default async function CustomerRatesPage({ searchParams }: PageProps) {
  const params = await searchParams

  const isApproved =
    params.status === 'approved' ? true : params.status === 'draft' ? false : 'all'

  const rates = await getCustomerRates({
    quotationNo: params.quotationNo,
    customerName: params.customerName,
    agentCode: params.agentCode,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    isApproved,
  })

  return (
    <ListPage
      title="Customer Rates"
      subtitle={`${rates.length} record${rates.length !== 1 ? 's' : ''} found`}
      actions={
        <Link
          href="/tariff/customer-rates/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          + New Customer Rate
        </Link>
      }
      filters={
        <CustomerRateFilters
          quotationNo={params.quotationNo ?? ''}
          customerName={params.customerName ?? ''}
          agentCode={params.agentCode ?? ''}
          status={params.status ?? ''}
          dateFrom={params.dateFrom ?? ''}
          dateTo={params.dateTo ?? ''}
        />
      }
    >
      <Suspense fallback={null}>
        <CustomerRateListClient initialData={rates} />
      </Suspense>
    </ListPage>
  )
}
