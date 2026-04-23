import { getMockWorkOrders } from '@/lib/mock/work-orders'
import { WOMonitoringClient } from '@/components/work-orders/WOMonitoringClient'

export const metadata = { title: 'WO Monitoring | Fleet' }

export default function WOMonitoringPage() {
  const orders = getMockWorkOrders()
  return <WOMonitoringClient orders={orders} />
}
