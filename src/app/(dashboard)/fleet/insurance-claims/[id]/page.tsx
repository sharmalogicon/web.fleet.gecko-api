import { notFound } from 'next/navigation'
import { getInsuranceClaim } from '@/lib/data/insurance-claims'
import { InsuranceClaimFormClient } from '@/components/insurance-claims/InsuranceClaimFormClient'
import { NEW_INSURANCE_CLAIM_DEFAULTS } from '@/types/insurance-claim'
import type { InsuranceClaim } from '@/types/insurance-claim'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  if (id === 'new') return { title: 'New Insurance Claim | Fleet' }
  const record = await getInsuranceClaim(parseInt(id, 10))
  return {
    title: record ? `${record.documentNo} | Fleet` : 'Insurance Claim | Fleet',
  }
}

const NEW_RECORD: InsuranceClaim = {
  ...NEW_INSURANCE_CLAIM_DEFAULTS,
  claimID: 0,
  lines: [],
}

export default async function InsuranceClaimDetailPage({ params }: PageProps) {
  const { id } = await params

  if (id === 'new') {
    return (
      <InsuranceClaimFormClient
        claim={NEW_RECORD}
        claimID="new"
        isNew={true}
      />
    )
  }

  const claimID = parseInt(id, 10)
  if (isNaN(claimID)) notFound()

  const record = await getInsuranceClaim(claimID)
  if (!record) notFound()

  return (
    <InsuranceClaimFormClient
      claim={record}
      claimID={id}
      isNew={false}
    />
  )
}
