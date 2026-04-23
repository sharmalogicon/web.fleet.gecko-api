'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import type { CustomerRate } from '@/types/customer-rate'
import { DataTable } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useToastStore } from '@/lib/stores/useToastStore'
import { removeMockCustomerRate } from '@/lib/mock/customer-rates'
import { useT } from '@/i18n/I18nContext'

const col = createColumnHelper<CustomerRate>()

interface CustomerRateListClientProps {
  initialData: CustomerRate[]
}

export function CustomerRateListClient({ initialData }: CustomerRateListClientProps) {
  const [data, setData] = useState<CustomerRate[]>(initialData)
  const [deleteTarget, setDeleteTarget] = useState<CustomerRate | null>(null)
  const router = useRouter()
  const { success, error } = useToastStore()
  const { t } = useT()

  const columns = [
    col.display({
      id: 'quotationNoDate',
      header: 'Quotation No / Date',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => router.push(`/tariff/customer-rates/${r.customerRateID}`)}
              className="text-blue-600 hover:underline text-left text-sm font-medium font-mono"
            >
              {r.quotationNo}
            </button>
            <span className="text-xs text-gray-400">{r.quotationDate}</span>
          </div>
        )
      },
    }),
    col.display({
      id: 'customer',
      header: 'Customer',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-gray-900">
              {r.customerName || '—'}
            </span>
            {r.agentCode && (
              <span className="text-xs text-gray-400">Agent: {r.agentCode}</span>
            )}
          </div>
        )
      },
    }),
    col.display({
      id: 'validity',
      header: 'Validity',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-gray-900">{r.effectiveDate}</span>
            <span className="text-xs text-gray-400">→ {r.expiryDate}</span>
          </div>
        )
      },
    }),
    col.display({
      id: 'createdApproved',
      header: 'Created / Approved By',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-gray-700">{r.createdBy || '—'}</span>
            {r.approvedBy ? (
              <span className="text-xs text-gray-400">{r.approvedBy}</span>
            ) : (
              <span className="text-xs text-gray-300">—</span>
            )}
          </div>
        )
      },
    }),
    col.display({
      id: 'statusActions',
      header: () => t('common.status'),
      size: 160,
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-1">
            <span
              className={`inline-block self-start px-2 py-0.5 text-xs font-medium rounded-full ${
                r.isApproved
                  ? 'bg-green-100 text-green-700'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {r.isApproved ? 'Approved' : 'Draft'}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => router.push(`/tariff/customer-rates/${r.customerRateID}`)}
                className="text-xs text-blue-600 hover:underline"
              >
                {t('common.edit')}
              </button>
              {!r.isApproved && (
                <button
                  type="button"
                  onClick={() => setDeleteTarget(r)}
                  className="text-xs text-red-500 hover:underline"
                >
                  {t('common.delete')}
                </button>
              )}
            </div>
          </div>
        )
      },
    }),
  ]

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      removeMockCustomerRate(deleteTarget.customerRateID)
      setData((prev) => prev.filter((r) => r.customerRateID !== deleteTarget.customerRateID))
      success('Customer rate deleted', `${deleteTarget.quotationNo} has been removed.`)
    } catch {
      error('Delete failed', 'An error occurred. Please try again.')
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <>
      <DataTable data={data} columns={columns} pageSize={15} />
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Customer Rate"
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.quotationNo}"? This action cannot be undone.`
            : ''
        }
        confirmLabel={t('common.delete')}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        destructive
      />
    </>
  )
}
