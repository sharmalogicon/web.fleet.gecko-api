'use client'

import { useRouter } from 'next/navigation'
import type { WorkOrder } from '@/types/work-order'
import { WO_BADGE } from '@/types/work-order'

const COLUMNS = [
  { id: 'open', label: 'Open / Draft', statuses: ['OPEN', 'DRAFT'], color: 'border-blue-200 bg-blue-50' },
  { id: 'inprogress', label: 'In Progress', statuses: ['IN PROGRESS'], color: 'border-yellow-200 bg-yellow-50' },
  { id: 'completed', label: 'Completed', statuses: ['COMPLETED'], color: 'border-green-200 bg-green-50' },
  { id: 'closed', label: 'Invoiced / Cancelled', statuses: ['INVOICED', 'CANCELLED'], color: 'border-gray-200 bg-gray-50' },
] as const

interface WOMonitoringClientProps {
  orders: WorkOrder[]
}

export function WOMonitoringClient({ orders }: WOMonitoringClientProps) {
  const router = useRouter()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">WO Monitoring</h1>
        <p className="mt-1 text-sm text-gray-500">{orders.length} work orders total</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUMNS.map((col) => {
          const colOrders = orders.filter((o) =>
            (col.statuses as readonly string[]).includes(o.status ?? ''),
          )
          return (
            <div key={col.id} className={`rounded-xl border-2 ${col.color} flex flex-col gap-0`}>
              <div className="px-4 py-3 border-b border-inherit">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  {col.label}
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">{colOrders.length}</p>
              </div>
              <div className="flex flex-col gap-2 p-3 overflow-y-auto max-h-96">
                {colOrders.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-4">No orders</p>
                )}
                {colOrders.map((wo) => (
                  <button
                    key={wo.woID}
                    type="button"
                    onClick={() => router.push(`/fleet/work-orders/${wo.woID}`)}
                    className="text-left p-3 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-xs font-semibold text-blue-600">
                        {wo.documentNo}
                      </span>
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${WO_BADGE[wo.status ?? 'DRAFT'] ?? ''}`}
                      >
                        {wo.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-gray-800">
                      {wo.equipmentCode || '—'}
                    </p>
                    {wo.billingCustomerName && (
                      <p className="mt-0.5 text-xs text-gray-400">{wo.billingCustomerName}</p>
                    )}
                    {wo.grandTotal != null && wo.grandTotal > 0 && (
                      <p className="mt-1 text-xs font-semibold text-gray-600">
                        ฿{wo.grandTotal.toLocaleString()}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-gray-400">{wo.orderDate}</p>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
