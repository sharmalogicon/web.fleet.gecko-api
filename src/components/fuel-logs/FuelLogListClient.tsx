'use client'

import { useRouter } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import { DataTable } from '@/components/shared/DataTable'
import { FuelStatusBadge } from './FuelStatusBadge'
import { fmtDate, money } from '@/components/docs/DocBits'
import type { FuelLogRow } from '@/lib/api/fleet/fuelLogs'
import { useT } from '@/i18n/I18nContext'

const col = createColumnHelper<FuelLogRow>()

/** Same columns; no Delete (the API has none: a wrong log is cancelled on its form). */
export function FuelLogListClient({ data }: { data: FuelLogRow[] }) {
  const router = useRouter()
  const { t } = useT()
  const open = (r: FuelLogRow) => router.push(`/fleet/fuel-logs/${r.fuelLogID}`)

  const columns = [
    col.display({
      id: 'equipment',
      header: 'Equipment',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <button type="button" onClick={() => open(r)} className="text-blue-600 hover:underline text-left text-sm font-medium font-mono">
              {r.equipmentCode}
            </button>
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
              {r.costPerLiter != null ? `฿${r.costPerLiter}/L` : '—'}
              {r.totalAmount != null ? ` · ${money(r.totalAmount)}` : ''}
              {' · '}{t(`fuel.source.${r.fuelSource}`)}
            </span>
          </div>
        )
      },
    }),
    col.display({
      id: 'status',
      header: () => t('common.status'),
      cell: (info) => <FuelStatusBadge status={info.row.original.status} />,
    }),
    col.display({
      id: 'actions',
      header: '',
      size: 80,
      cell: (info) => (
        <div className="flex items-center gap-2 justify-end">
          <button type="button" onClick={() => open(info.row.original)} className="text-xs text-blue-600 hover:underline">
            {t('common.edit')}
          </button>
        </div>
      ),
    }),
  ]

  return <DataTable data={data} columns={columns} pageSize={15} />
}
