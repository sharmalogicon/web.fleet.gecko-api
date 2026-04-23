import { notFound } from 'next/navigation'
import { getTireChange } from '@/lib/data/tire-changes'
import { TireChangeFormClient } from '@/components/tire-changes/TireChangeFormClient'
import { NEW_TIRE_CHANGE_DEFAULTS } from '@/types/tire-change'
import type { TireChange } from '@/types/tire-change'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  if (id === 'new') return { title: 'New Tire Change | Fleet' }
  const record = await getTireChange(parseInt(id, 10))
  return {
    title: record ? `${record.documentNo} | Fleet` : 'Tire Change | Fleet',
  }
}

const NEW_RECORD: TireChange = {
  ...NEW_TIRE_CHANGE_DEFAULTS,
  tireChangeID: 0,
  lines: [],
}

export default async function TireChangeDetailPage({ params }: PageProps) {
  const { id } = await params

  if (id === 'new') {
    return (
      <TireChangeFormClient
        tireChange={NEW_RECORD}
        tireChangeID="new"
        isNew={true}
      />
    )
  }

  const tireChangeID = parseInt(id, 10)
  if (isNaN(tireChangeID)) notFound()

  const record = await getTireChange(tireChangeID)
  if (!record) notFound()

  return (
    <TireChangeFormClient
      tireChange={record}
      tireChangeID={id}
      isNew={false}
    />
  )
}
