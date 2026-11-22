import { InsuranceClaimsListView } from '@/components/insurance-claims/InsuranceClaimViews'

export const metadata = { title: 'Insurance Claims | Fleet' }

interface PageProps {
  searchParams: Promise<{ documentNo?: string; accidentRefNo?: string; vendorName?: string; status?: string }>
}

/** Insurance claims from the Fleet API, read in the browser. */
export default async function InsuranceClaimsPage({ searchParams }: PageProps) {
  const p = await searchParams
  return <InsuranceClaimsListView documentNo={p.documentNo ?? ''} accidentRefNo={p.accidentRefNo ?? ''} vendorName={p.vendorName ?? ''} status={p.status ?? ''} />
}
