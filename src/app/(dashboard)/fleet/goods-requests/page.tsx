import { GoodsRequestsListView } from '@/components/goods-requests/GoodsRequestViews'
import { getT } from '@/i18n/server'

export const metadata = { title: 'Goods Requests | Fleet' }

/** One API document (/goods-requests) behind both screens (prompt 11 §B). */
export default async function Page({ searchParams }: { searchParams: Promise<{ search?: string; status?: string }> }) {
  const p = await searchParams
  const { t } = await getT()
  return <GoodsRequestsListView base="/fleet/goods-requests" title={t('nav.goodsRequests')} search={p.search ?? ''} status={p.status ?? 'ALL'} />
}
