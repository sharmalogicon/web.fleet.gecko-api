import { notFound } from 'next/navigation'
import { getStock } from '@/lib/data/stock'
import { StockProfileClient } from '@/components/stock/StockProfileClient'
import { NEW_STOCK_DEFAULTS } from '@/types/stock'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  if (id === 'new') return { title: 'New Stock Item | Fleet' }
  const stock = await getStock(parseInt(id, 10))
  return { title: stock ? `${stock.code} | Fleet` : 'Stock | Fleet' }
}

export default async function StockProfilePage({ params }: PageProps) {
  const { id } = await params
  if (id === 'new') {
    return <StockProfileClient stock={NEW_STOCK_DEFAULTS} stockID="new" isNew={true} />
  }
  const stockID = parseInt(id, 10)
  if (isNaN(stockID)) notFound()
  const stock = await getStock(stockID)
  if (!stock) notFound()
  return <StockProfileClient stock={stock} stockID={id} isNew={false} />
}
