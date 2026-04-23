import { LaborPricesClient } from '@/components/stock-labor-prices/LaborPricesClient'
import { getT } from '@/i18n/server'

export const metadata = { title: 'Stock & Labor Prices | Fleet' }

export default async function StockLaborPricesPage() {
  const { t } = await getT()
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('nav.stockLaborPrices')}</h1>
        <p className="mt-1 text-sm text-gray-500">Markup settings and labor charge rates</p>
      </div>
      <LaborPricesClient />
    </div>
  )
}
