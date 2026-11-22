'use client'

import { useRouter } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import { WO_BADGE, PRIORITY_BADGE } from '@/types/work-order'
import { DataTable } from '@/components/shared/DataTable'
import { viewWoStatus, type WorkOrderDto } from '@/lib/api/fleet/workOrders'
import { useT } from '@/i18n/I18nContext'

/** The old row shape, from a work order (API). */
interface WorkOrder {
  woID: string
  documentNo: string
  orderDate: string
  equipmentCode: string
  priority: string
  status: string
  onHold: boolean
  closed: boolean
  serviceTypeCategory: string
  billingCustomerName?: string
  vendorName?: string
  grandTotal?: number
}

const toRow = (d: WorkOrderDto): WorkOrder => {
  const v = viewWoStatus(d)
  return {
    woID: d.workOrderId, documentNo: d.documentNo, orderDate: d.documentDate, equipmentCode: d.assetCode, priority: d.priority,
    status: v.status, onHold: v.onHold, closed: v.closed, serviceTypeCategory: d.woType,
    billingCustomerName: d.defaultBillToPartyCode ?? undefined, vendorName: d.vendorPartyCode ?? undefined, grandTotal: Number(d.totalPrice),
  }
}

const col = createColumnHelper<WorkOrder>()

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr.slice(0, 10) + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatCurrency(val?: number): string {
  if (val == null) return '—'
  return `฿${val.toLocaleString()}`
}

interface WorkOrderListClientProps {
  data: WorkOrderDto[]
}

/** Same columns; rows = work orders (API). No delete: Cancel on the form. */
export function WorkOrderListClient({ data }: WorkOrderListClientProps) {
  const router = useRouter()
  const { t } = useT()

  const columns = [
    col.display({
      id: 'workOrder',
      header: 'Work Order',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => router.push(`/fleet/work-orders/${r.woID}`)}
              className="text-blue-600 hover:underline text-left text-sm font-medium font-mono"
            >
              {r.documentNo || `WO-${r.woID}`}
            </button>
            <span className="text-xs text-gray-400">
              {r.equipmentCode || '—'} · {formatDate(r.orderDate)}
            </span>
          </div>
        )
      },
    }),
    col.display({
      id: 'serviceCustomer',
      header: 'Service / Customer',
      cell: (info) => {
        const r = info.row.original
        const secondary = r.billingCustomerName || r.vendorName
        return (
          <div className="flex flex-col gap-0.5">
            {r.serviceTypeCategory && (
              <span className="inline-flex w-fit items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                {r.serviceTypeCategory}
              </span>
            )}
            {secondary && <span className="text-xs text-gray-400">{secondary}</span>}
          </div>
        )
      },
    }),
    col.display({
      id: 'amount',
      header: 'Amount',
      cell: (info) => {
        const r = info.row.original
        const priorityClass = PRIORITY_BADGE[r.priority ?? ''] ?? 'bg-gray-100 text-gray-600'
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-gray-900">
              {formatCurrency(r.grandTotal)}
            </span>
            {r.priority && (
              <span
                className={`inline-flex w-fit items-center px-2 py-0.5 rounded-full text-xs font-medium ${priorityClass}`}
              >
                {r.priority}
              </span>
            )}
          </div>
        )
      },
    }),
    col.display({
      id: 'status',
      header: () => t('common.status'),
      cell: (info) => {
        const { status, onHold, closed } = info.row.original
        const cls = WO_BADGE[status] ?? 'bg-gray-100 text-gray-600'
        return (
          <div className="flex flex-col gap-0.5 items-start">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>{status}</span>
            {onHold && <span className="text-[10px] text-amber-700">{t('wo.onHold')}</span>}
            {closed && <span className="text-[10px] text-gray-500">{t('wo.closed')}</span>}
          </div>
        )
      },
    }),
    col.display({
      id: 'actions',
      header: '',
      size: 100,
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={() => router.push(`/fleet/work-orders/${r.woID}`)}
              className="text-xs text-blue-600 hover:underline"
            >
              {t('common.edit')}
            </button>
            {/* No delete: Cancel on the form (prompt 09). */}
          </div>
        )
      },
    }),
  ]

  return <DataTable data={data.map(toRow)} columns={columns} pageSize={15} />
}
