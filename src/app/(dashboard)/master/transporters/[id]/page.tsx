import { notFound } from 'next/navigation'
import { getTransporter } from '@/lib/data/transporters'
import { TransporterFormClient } from '@/components/transporters/TransporterFormClient'
import { NEW_TRANSPORTER_DEFAULTS } from '@/types/transporter'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  if (id === 'new') return { title: 'New Transporter | Fleet' }
  const transporter = await getTransporter(parseInt(id, 10))
  return { title: transporter ? `${transporter.transporterName} | Fleet` : 'Transporter | Fleet' }
}

export default async function TransporterProfilePage({ params }: PageProps) {
  const { id } = await params

  if (id === 'new') {
    return (
      <TransporterFormClient
        transporter={NEW_TRANSPORTER_DEFAULTS}
        transporterID="new"
        isNew={true}
      />
    )
  }

  const transporterID = parseInt(id, 10)
  if (isNaN(transporterID)) notFound()

  const transporter = await getTransporter(transporterID)
  if (!transporter) notFound()

  return (
    <TransporterFormClient
      transporter={transporter}
      transporterID={id}
      isNew={false}
    />
  )
}
