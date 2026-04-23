import { notFound } from 'next/navigation'
import { getReturn } from '@/lib/data/return-to-vendor'
import { ReturnFormClient } from '@/components/return-to-vendor/ReturnFormClient'
import { NEW_RETURN_DEFAULTS } from '@/types/return-to-vendor'
import type { ReturnToVendor } from '@/types/return-to-vendor'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  if (id === 'new') return { title: 'New Return to Vendor | Fleet' }
  const record = await getReturn(parseInt(id, 10))
  return {
    title: record ? `${record.documentNo} | Fleet` : 'Return to Vendor | Fleet',
  }
}

const NEW_RECORD: ReturnToVendor = {
  ...NEW_RETURN_DEFAULTS,
  returnID: 0,
  lines: [],
}

export default async function ReturnToVendorDetailPage({ params }: PageProps) {
  const { id } = await params

  if (id === 'new') {
    return (
      <ReturnFormClient
        returnToVendor={NEW_RECORD}
        returnID="new"
        isNew={true}
      />
    )
  }

  const returnID = parseInt(id, 10)
  if (isNaN(returnID)) notFound()

  const record = await getReturn(returnID)
  if (!record) notFound()

  return (
    <ReturnFormClient
      returnToVendor={record}
      returnID={id}
      isNew={false}
    />
  )
}
