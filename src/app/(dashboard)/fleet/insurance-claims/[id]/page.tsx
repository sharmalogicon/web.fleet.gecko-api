import { Suspense } from 'react'
import { InsuranceClaimView } from '@/components/insurance-claims/InsuranceClaimViews'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  return { title: id === 'new' ? 'New Insurance Claim | Fleet' : 'Insurance Claim | Fleet' }
}

/** "new" (optionally `?accidentId=`) starts a claim; an id opens it. */
export default async function InsuranceClaimDetailPage({ params }: PageProps) {
  const { id } = await params
  return <Suspense fallback={null}><InsuranceClaimView id={id} /></Suspense>
}
