'use client'

import { useRouter } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import type { DriverView } from '@/lib/api/fleet/drivers'
import { DataTable } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatDate, isDateExpired } from '@/lib/utils/driver'
import { useT } from '@/i18n/I18nContext'

const col = createColumnHelper<DriverView>()


interface DriversListClientProps {
  data: DriverView[]
}

/** Same columns as before; rows from the Fleet API. Personal data (licence no., phone) is never read for the list. */
export function DriversListClient({ data }: DriversListClientProps) {
  const router = useRouter()
  const { t } = useT()

  const columns = [
    col.display({
      id: 'driver',
      header: 'Driver',
      cell: (info) => {
        const d = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => router.push(`/master/drivers/${d.id}`)}
              className="text-blue-600 hover:underline text-left font-medium"
            >
              {d.driverName}
            </button>
            <span className="text-xs text-gray-400 font-mono flex items-center gap-1.5">
              {d.driverCode}
              <span className={`px-1.5 py-0 rounded border text-[10px] font-sans font-medium ${d.isTrucking ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-gray-200 bg-gray-50 text-gray-600'}`}>
                {d.isTrucking ? t('driver.sourceTrucking') : t('driver.sourceFleet')}
              </span>
            </span>
          </div>
        )
      },
    }),
    col.display({
      id: 'license',
      header: 'License',
      cell: (info) => {
        // The licence number is personal data (read only on the form): the list shows the class.
        const { licenseExpiryDate } = info.row.original
        const licenseNo = info.row.original.dto.licenceClass
        const expired = isDateExpired(licenseExpiryDate)
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm">{licenseNo || '—'}</span>
            <span className={`text-xs ${expired ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
              {licenseExpiryDate ? formatDate(licenseExpiryDate) : '—'}
            </span>
          </div>
        )
      },
    }),
    col.display({
      id: 'contact',
      header: 'Contact',
      cell: (info) => {
        // Phone numbers are personal data (never read for the list).
        const phone = undefined as string | undefined
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm">{phone || '—'}</span>
            <span className="text-xs text-gray-400">{info.row.original.position || ''}</span>
          </div>
        )
      },
    }),
    col.accessor('status', {
      header: () => t('common.status'),
      size: 120,
      cell: (info) => <StatusBadge status={info.getValue()} />,
    }),
    col.display({
      id: 'actions',
      header: '',
      size: 80,
      cell: (info) => (
        <div className="flex items-center gap-2 justify-end">
          <button
            type="button"
            onClick={() => router.push(`/master/drivers/${info.row.original.id}`)}
            className="text-xs text-blue-600 hover:underline"
          >
            {t('common.edit')}
          </button>
          {/* No delete in the API: a driver who leaves is set Inactive (prompt 05). */}
        </div>
      ),
    }),
  ]

  return <DataTable data={data} columns={columns} pageSize={15} />
}
