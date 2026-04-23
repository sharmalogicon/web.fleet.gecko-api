import { notFound } from 'next/navigation'
import { getStandardRate } from '@/lib/data/standard-rates'
import { StandardRateFormClient } from '@/components/standard-rates/StandardRateFormClient'
import { NEW_STANDARD_RATE_DEFAULTS } from '@/types/standard-rate'
import type { StandardRate } from '@/types/standard-rate'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  if (id === 'new') return { title: 'New Standard Rate | Tariff' }
  const record = await getStandardRate(parseInt(id, 10))
  return {
    title: record ? `${record.rateCode} | Tariff` : 'Standard Rate | Tariff',
  }
}

const NEW_RECORD: StandardRate = {
  ...NEW_STANDARD_RATE_DEFAULTS,
  standardRateID: 0,
  isApproved: false,
  lines: [],
}

export default async function StandardRateDetailPage({ params }: PageProps) {
  const { id } = await params

  if (id === 'new') {
    return (
      <StandardRateFormClient
        rate={NEW_RECORD}
        rateID="new"
        isNew={true}
      />
    )
  }

  const standardRateID = parseInt(id, 10)
  if (isNaN(standardRateID)) notFound()

  const record = await getStandardRate(standardRateID)
  if (!record) notFound()

  return (
    <StandardRateFormClient
      rate={record}
      rateID={id}
      isNew={false}
    />
  )
}
