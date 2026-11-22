'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createColumnHelper } from '@tanstack/react-table'
import type { TransporterView } from '@/lib/api/platform/suppliers'
import { DataTable } from '@/components/shared/DataTable'
import { useT } from '@/i18n/I18nContext'

const col = createColumnHelper<TransporterView>()

interface TransporterListClientProps {
  data: TransporterView[]
}

/** Same columns; rows = suppliers in category TRANSPORT. No delete (a party is deleted on the party screen). */
export function TransporterListClient({ data }: TransporterListClientProps) {
  const router = useRouter()
  const { t } = useT()
  const href = (tr: TransporterView) => `/master/transporters/${encodeURIComponent(tr.partyCode)}`

  const columns = [
    col.display({
      id: 'transporter',
      header: 'Transporter',
      cell: (info) => {
        const tr = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <Link
              href={href(tr)}
              className="text-blue-600 hover:underline text-sm font-medium"
            >
              {tr.transporterName}
            </Link>
            <span className="text-xs text-gray-400 font-mono">{tr.registrationNo}</span>
          </div>
        )
      },
    }),
    col.display({
      id: 'contact',
      header: 'Contact',
      cell: (info) => {
        const tr = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm">{tr.mobileNo || '—'}</span>
            <span className="text-xs text-gray-400">{tr.emailID || '—'}</span>
          </div>
        )
      },
    }),
    col.display({
      id: 'status',
      header: () => t('common.status'),
      size: 100,
      cell: (info) => {
        const { isActive } = info.row.original
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {isActive ? 'Active' : 'Inactive'}
          </span>
        )
      },
    }),
    col.display({
      id: 'actions',
      header: '',
      size: 100,
      cell: (info) => {
        const tr = info.row.original
        return (
          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={() => router.push(href(tr))}
              className="text-xs text-blue-600 hover:underline"
            >
              {t('common.edit')}
            </button>
            {/* No delete here: set the transporter inactive (prompt 06). */}
          </div>
        )
      },
    }),
  ]

  return <DataTable data={data} columns={columns} pageSize={15} />
}
