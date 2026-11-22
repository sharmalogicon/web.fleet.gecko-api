'use client'

import { useRouter } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import { DataTable } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useT } from '@/i18n/I18nContext'
import { FLEET_TRADE, useCodeList } from '@/lib/api/fleet/setup'
import { useBranchContext } from '@/lib/api/platform/branches'
import type { TechnicianView } from '@/lib/api/fleet/technicians'

const col = createColumnHelper<TechnicianView>()

/** Multi-line rows in the Drivers list style (prompt 04). No delete: a technician who leaves is set INACTIVE. */
export function TechniciansListClient({ data }: { data: TechnicianView[] }) {
  const router = useRouter()
  const { t, lang } = useT()
  const trades = useCodeList(FLEET_TRADE)
  const { branches } = useBranchContext()

  const tradeName = (code: string) => {
    const v = trades.data?.find((x) => x.code === code)
    return v ? (lang === 'th' && v.descriptionLocal ? v.descriptionLocal : v.descriptionEn) : code
  }
  const branchCode = (id: string) => branches.find((b) => b.branchId === id)?.branchCode ?? id.slice(0, 8)
  const open = (id: string) => router.push(`/master/technicians/${id}`)

  const columns = [
    col.display({
      id: 'technician',
      header: t('nav.technicians'),
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <button type="button" onClick={() => open(r.id)} className="text-blue-600 hover:underline text-left font-medium">
              {r.fullName}{r.nickname ? <span className="text-gray-500 font-normal"> ({r.nickname})</span> : null}
            </button>
            <span className="text-xs text-gray-400 font-mono">{r.technicianCode}</span>
          </div>
        )
      },
    }),
    col.display({
      id: 'trade',
      header: t('technician.trade'),
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-1">
            <span className="text-sm">{tradeName(r.primaryTradeCode)}</span>
            {r.skills.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {r.skills.map((s) => (
                  <span key={s.tradeCode} className="inline-flex px-1.5 py-0.5 rounded border border-gray-200 bg-gray-50 text-[11px] text-gray-600">
                    {tradeName(s.tradeCode)} · {t(`technician.level.${s.skillLevel}`)}
                  </span>
                ))}
              </div>
            )}
          </div>
        )
      },
    }),
    col.display({
      id: 'branch',
      header: t('technician.branch'),
      cell: (info) => <span className="text-sm">{branchCode(info.row.original.branchId)}</span>,
    }),
    col.display({
      id: 'employment',
      header: t('technician.employment'),
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm">{t(`technician.employmentType.${r.employmentType}`)}</span>
            <span className="text-xs text-gray-400">{r.employmentType === 'CONTRACTOR' ? r.vendorPartyCode || '—' : ''}</span>
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
      size: 60,
      cell: (info) => (
        <div className="flex items-center gap-2 justify-end">
          <button type="button" onClick={() => open(info.row.original.id)} className="text-xs text-blue-600 hover:underline">
            {t('common.edit')}
          </button>
        </div>
      ),
    }),
  ]

  return <DataTable data={data} columns={columns} pageSize={15} />
}
