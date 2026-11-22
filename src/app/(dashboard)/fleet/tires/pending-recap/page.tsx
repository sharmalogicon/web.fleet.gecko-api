import { PendingRecapView } from '@/components/tire-profiles/PendingRecapView'

export const metadata = { title: 'Pending Tire Recap | Fleet' }

interface PageProps {
  searchParams: Promise<{ serialNo?: string; brand?: string; status?: string }>
}

/** Tyres AT_RECAP (or AWAITING_REPAIR), prompt 13 §D. */
export default async function PendingRecapPage({ searchParams }: PageProps) {
  const p = await searchParams
  return <PendingRecapView serialNo={p.serialNo ?? ''} brand={p.brand ?? ''} status={p.status ?? 'AT_RECAP'} />
}
