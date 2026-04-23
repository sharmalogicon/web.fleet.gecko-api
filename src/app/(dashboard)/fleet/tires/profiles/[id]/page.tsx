import { notFound } from 'next/navigation'
import { getTireProfile } from '@/lib/data/tire-profiles'
import { TireProfileFormClient } from '@/components/tire-profiles/TireProfileFormClient'
import { NEW_TIRE_PROFILE_DEFAULTS } from '@/types/tire-profile'
import type { TireProfile } from '@/types/tire-profile'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  if (id === 'new') return { title: 'New Tire Profile | Fleet' }
  const record = await getTireProfile(parseInt(id, 10))
  return {
    title: record ? `${record.serialNo} | Fleet` : 'Tire Profile | Fleet',
  }
}

const NEW_RECORD: TireProfile = {
  ...NEW_TIRE_PROFILE_DEFAULTS,
  tireProfileID: 0,
  timeRecaped: 0,
  recapCost: 0,
  totalInspectionCost: 0,
  totalRepairCost: 0,
}

export default async function TireProfileDetailPage({ params }: PageProps) {
  const { id } = await params

  if (id === 'new') {
    return (
      <TireProfileFormClient
        tireProfile={NEW_RECORD}
        tireProfileID="new"
        isNew={true}
      />
    )
  }

  const tireProfileID = parseInt(id, 10)
  if (isNaN(tireProfileID)) notFound()

  const record = await getTireProfile(tireProfileID)
  if (!record) notFound()

  return (
    <TireProfileFormClient
      tireProfile={record}
      tireProfileID={id}
      isNew={false}
    />
  )
}
