'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createColumnHelper } from '@tanstack/react-table'
import { DataTable } from '@/components/shared/DataTable'
import { ReasonDialog } from '@/components/shared/ReasonDialog'
import { fmtDate, money } from '@/components/docs/DocBits'
import { FuelStatusBadge } from './FuelStatusBadge'
import { useFuelLogAction, type FuelLogRow } from '@/lib/api/fleet/fuelLogs'
import { useFleetAccess } from '@/lib/api/fleet/access'
import { useAuth } from '@/lib/contexts/AuthContext'
import { errorText } from '@/lib/api/errorText'
import { useToastStore } from '@/lib/stores/useToastStore'
import { useT } from '@/i18n/I18nContext'

const col = createColumnHelper<FuelLogRow>()

/** PENDING_APPROVAL logs; Approve / Reject (reason) by fleet.fuel.approve at the log's branch, never on your own entry. */
export function FuelLogApprovalClient({ data }: { data: FuelLogRow[] }) {
  const { t } = useT()
  const toast = useToastStore()
  const { user } = useAuth()
  const { canAt } = useFleetAccess()
  const act = useFuelLogAction()
  const [rejecting, setRejecting] = useState<FuelLogRow | null>(null)
  const [dialogError, setDialogError] = useState<string | null>(null)

  const may = (r: FuelLogRow) => canAt('fleet.fuel.approve', r.branchId) && r.createdBy !== user?.userId
  const run = (r: FuelLogRow, action: 'approve' | 'reject', reason?: string) =>
    act.mutate(
      { id: r.fuelLogID, action, body: { reason: reason?.trim() || null, rowVersion: r.rowVersion } },
      {
        onSuccess: () => { toast.success(t(`fuel.done.${action}`), r.documentNo); setRejecting(null) },
        onError: (e) => { setDialogError(errorText(e, t)); if (action === 'approve') toast.error(t('common.saveFailed'), errorText(e, t)) },
      },
    )

  const columns = [
    col.display({
      id: 'equipment',
      header: 'Equipment',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <Link href={`/fleet/fuel-logs/${r.fuelLogID}`} className="text-sm font-medium font-mono text-blue-600 hover:underline">{r.equipmentCode}</Link>
            {r.registrationNo && <span className="text-xs text-gray-400">{r.registrationNo}</span>}
          </div>
        )
      },
    }),
    col.display({
      id: 'voucherDate',
      header: 'Voucher / Date',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-gray-900">{r.voucherNo || '—'}</span>
            <span className="text-xs text-gray-400">{r.documentNo} · {fmtDate(r.meterUpdateDate)}</span>
          </div>
        )
      },
    }),
    col.display({
      id: 'driver',
      header: 'Driver',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-gray-900">{r.driverName || '—'}</span>
            {r.driverCard && <span className="text-xs text-gray-400">{r.driverCard}</span>}
          </div>
        )
      },
    }),
    col.display({
      id: 'fuel',
      header: 'Fuel',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-gray-900">{r.tankMeter.toLocaleString()} L</span>
            <span className="text-xs text-gray-400">
              {r.costPerLiter != null ? `฿${r.costPerLiter}/L` : t(`fuel.source.${r.fuelSource}`)}
              {r.totalAmount != null ? ` · ${money(r.totalAmount)}` : ''}
            </span>
          </div>
        )
      },
    }),
    col.display({ id: 'status', header: 'Status', cell: (info) => <FuelStatusBadge status={info.row.original.status} /> }),
    col.display({
      id: 'actions',
      header: '',
      size: 170,
      cell: (info) => {
        const r = info.row.original
        if (!may(r)) return <span className="text-xs text-gray-400" title={t('fuel.ownEntryHint')}>{r.createdBy === user?.userId ? t('fuel.ownEntry') : ''}</span>
        return (
          <div className="flex items-center justify-end gap-2">
            <button type="button" disabled={act.isPending} onClick={() => { setDialogError(null); setRejecting(r) }}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50">
              {t('fuel.action.reject')}
            </button>
            <button type="button" disabled={act.isPending} onClick={() => run(r, 'approve')}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50">
              {t('common.approve')}
            </button>
          </div>
        )
      },
    }),
  ]

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-4xl mb-4">✓</div>
        <p className="text-gray-500 text-sm">No pending fuel logs to approve.</p>
      </div>
    )
  }

  return (
    <>
      <DataTable data={data} columns={columns} pageSize={15} />
      {rejecting && (
        <ReasonDialog
          title={`${t('fuel.action.reject')} · ${rejecting.documentNo}`}
          confirmLabel={t('fuel.action.reject')}
          reasonRequired
          danger
          busy={act.isPending}
          error={dialogError}
          onConfirm={(reason) => run(rejecting, 'reject', reason)}
          onClose={() => setRejecting(null)}
        />
      )}
    </>
  )
}
