import { RechargesView } from '@/components/recharges/RechargesView'

export const metadata = { title: 'Recharges | Fleet' }

interface PageProps {
  searchParams: Promise<{ tab?: string; status?: string; mode?: string; billTo?: string }>
}

/** New page (prompt 12 §C): work orders to release, and the released recharges. */
export default async function RechargesPage({ searchParams }: PageProps) {
  const p = await searchParams
  return <RechargesView tab={p.tab ?? 'release'} status={p.status ?? ''} mode={p.mode ?? ''} billTo={p.billTo ?? ''} />
}
