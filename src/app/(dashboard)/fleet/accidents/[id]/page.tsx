import { notFound } from 'next/navigation'
import { getAccidentReport } from '@/lib/data/accident-reports'
import { AccidentFormClient } from '@/components/accidents/AccidentFormClient'
import { NEW_ACCIDENT_DEFAULTS } from '@/types/accident-report'
import type { AccidentReport } from '@/types/accident-report'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  if (id === 'new') return { title: 'New Accident Report | Fleet' }
  const record = await getAccidentReport(parseInt(id, 10))
  return {
    title: record ? `${record.documentNo} | Fleet` : 'Accident Report | Fleet',
  }
}

const NEW_RECORD: AccidentReport = {
  ...NEW_ACCIDENT_DEFAULTS,
  accidentID: 0,
  images: [],
}

export default async function AccidentDetailPage({ params }: PageProps) {
  const { id } = await params

  if (id === 'new') {
    return (
      <AccidentFormClient
        accident={NEW_RECORD}
        accidentID="new"
        isNew={true}
      />
    )
  }

  const accidentID = parseInt(id, 10)
  if (isNaN(accidentID)) notFound()

  const record = await getAccidentReport(accidentID)
  if (!record) notFound()

  return (
    <AccidentFormClient
      accident={record}
      accidentID={id}
      isNew={false}
    />
  )
}
