'use client'

import { useRouter } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import { DataTable } from '@/components/shared/DataTable'
import { viewWrStatus, type WorkRequestDto } from '@/lib/api/fleet/workRequests'
import { useT } from '@/i18n/I18nContext'

/** The old row shape, from a work request (API). */
interface WorkRequest {
  wrID: string
  documentNo: string
  orderDate: string
  equipmentCode: string
  billingCustomerName?: string
  vendorName?: string
  priorityType: string
  description: string
  status: string
  approved: boolean
  rejectReason: string | null
  workOrderNo: string | null
}

const toRow = (d: WorkRequestDto): WorkRequest => {
  const v = viewWrStatus(d)
  return {
    wrID: d.workRequestId, documentNo: d.documentNo, orderDate: d.documentDate, equipmentCode: d.assetCode,
    billingCustomerName: d.billToPartyCode ?? undefined, vendorName: d.vendorPartyCode ?? undefined, priorityType: d.priority,
    description: d.problem, status: v.status, approved: v.approved, rejectReason: v.rejected ? d.rejectReason : null, workOrderNo: d.workOrderNo,
  }
}

const col = createColumnHelper<WorkRequest>()

const WR_BADGE: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  'IN PROGRESS': 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-600',
}

const PRIORITY_BADGE: Record<string, string> = {
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
  NORMAL: 'bg-gray-100 text-gray-600',
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

interface WorkRequestListClientProps {
  data: WorkRequestDto[]
}

/** Same columns; rows = work requests (API). Status is the API's; no delete (Cancel on the form). */
export function WorkRequestListClient({ data }: WorkRequestListClientProps) {
  const router = useRouter()
  const { t } = useT()
  const rows = data.map(toRow)

  const columns = [
    col.display({
      id: 'request',
      header: 'Request',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => router.push(`/fleet/work-requests/${r.wrID}`)}
              className="text-blue-600 hover:underline text-left text-sm font-medium font-mono"
            >
              {r.documentNo || `WR-${r.wrID}`}
            </button>
            <span className="text-xs text-gray-400">{formatDate(r.orderDate)}</span>
          </div>
        )
      },
    }),
    col.display({
      id: 'equipmentCustomer',
      header: 'Equipment / Customer',
      cell: (info) => {
        const r = info.row.original
        const secondary = r.billingCustomerName || r.vendorName
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">{r.equipmentCode || '—'}</span>
            {secondary && <span className="text-xs text-gray-400">{secondary}</span>}
          </div>
        )
      },
    }),
    col.display({
      id: 'priorityDescription',
      header: 'Priority / Description',
      cell: (info) => {
        const r = info.row.original
        const priorityClass =
          PRIORITY_BADGE[r.priorityType ?? ''] ?? 'bg-gray-100 text-gray-600'
        return (
          <div className="flex flex-col gap-0.5">
            {r.priorityType && (
              <span
                className={`inline-flex w-fit items-center px-2 py-0.5 rounded-full text-xs font-medium ${priorityClass}`}
              >
                {r.priorityType}
              </span>
            )}
            {r.description && (
              <span className="text-xs text-gray-400 truncate max-w-xs">{r.description}</span>
            )}
          </div>
        )
      },
    }),
    col.display({
      id: 'status',
      header: () => t('common.status'),
      cell: (info) => {
        const { status, approved, rejectReason, workOrderNo } = info.row.original
        const cls = WR_BADGE[status] ?? 'bg-gray-100 text-gray-600'
        return (
          <div className="flex flex-col gap-0.5 items-start">
            <span
              title={rejectReason ?? undefined}
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}
            >
              {status}
            </span>
            {approved && status === 'SUBMITTED' && <span className="text-[10px] text-green-700">{t('wr.approved')}</span>}
            {rejectReason && <span className="text-[10px] text-red-600">{t('wr.rejected')}</span>}
            {workOrderNo && <span className="text-[10px] text-gray-400 font-mono">{workOrderNo}</span>}
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
              onClick={() => router.push(`/fleet/work-requests/${r.wrID}`)}
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

  return <DataTable data={rows} columns={columns} pageSize={15} />
}
