import { notFound } from 'next/navigation'
import { getCustomerRate } from '@/lib/data/customer-rates'
import { CustomerRateFormClient } from '@/components/customer-rates/CustomerRateFormClient'
import { NEW_CUSTOMER_RATE_DEFAULTS } from '@/types/customer-rate'
import type { CustomerRate } from '@/types/customer-rate'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  if (id === 'new') return { title: 'New Customer Rate | Tariff' }
  const record = await getCustomerRate(parseInt(id, 10))
  return {
    title: record ? `${record.quotationNo} | Tariff` : 'Customer Rate | Tariff',
  }
}

const NEW_RECORD: CustomerRate = {
  ...NEW_CUSTOMER_RATE_DEFAULTS,
  customerRateID: 0,
  isApproved: false,
  lines: [],
}

export default async function CustomerRateDetailPage({ params }: PageProps) {
  const { id } = await params

  if (id === 'new') {
    return (
      <CustomerRateFormClient
        rate={NEW_RECORD}
        rateID="new"
        isNew={true}
      />
    )
  }

  const customerRateID = parseInt(id, 10)
  if (isNaN(customerRateID)) notFound()

  const record = await getCustomerRate(customerRateID)
  if (!record) notFound()

  return (
    <CustomerRateFormClient
      rate={record}
      rateID={id}
      isNew={false}
    />
  )
}
