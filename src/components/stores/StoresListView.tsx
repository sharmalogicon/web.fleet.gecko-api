'use client'

import { useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import { Loader2 } from 'lucide-react'
import { ListPage } from '@/components/shared/ListPage'
import { DataTable } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useT } from '@/i18n/I18nContext'
import { useWarehouses, type WarehouseDto } from '@/lib/api/fleet/warehouses'
import { useFleetAccess } from '@/lib/api/fleet/access'
import { useBranchContext } from '@/lib/api/platform/branches'
import { errorText } from '@/lib/api/errorText'

const col = createColumnHelper<WarehouseDto>()
const selectClass = 'text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500'

/** The Master list pattern (Technicians / Drivers): filters, multi-line rows, Edit. No delete (inactive). */
export function StoresListView({ branch, status }: { branch: string; status: string }) {
  const { t } = useT()
  const router = useRouter()
  const { canAnywhere } = useFleetAccess()
  const { branches } = useBranchContext()
  const list = useWarehouses({
    branchId: branch !== 'ALL' ? branch : undefined,
    active: status === 'ACTIVE' ? true : status === 'INACTIVE' ? false : undefined,
  })
  const rows = list.data ?? []
  const branchCode = (id: string) => branches.find((b) => b.branchId === id)?.branchCode ?? id.slice(0, 8)
  const open = (id: string) => router.push(`/master/stores/${id}`)

  const push = useCallback(
    (p: { branch?: string; status?: string }) => {
      const next = { branch, status, ...p }
      const sp = new URLSearchParams()
      if (next.branch !== 'ALL') sp.set('branch', next.branch)
      if (next.status !== 'ALL') sp.set('status', next.status)
      router.push(`/master/stores?${sp.toString()}`)
    },
    [branch, status, router],
  )

  const columns = [
    col.display({
      id: 'store',
      header: t('nav.stores'),
      cell: ({ row: { original: w } }) => (
        <div className="flex flex-col gap-0.5">
          <button type="button" onClick={() => open(w.warehouseId)} className="text-blue-600 hover:underline text-left font-medium">
            {w.nameEn}
          </button>
          <span className="text-xs text-gray-400 font-mono flex items-center gap-1.5">
            {w.warehouseCode}
            {w.isDefault && (
              <span className="px-1.5 rounded border border-blue-200 bg-blue-50 text-blue-700 text-[10px] font-sans font-medium">{t('store.default')}</span>
            )}
          </span>
        </div>
      ),
    }),
    col.display({
      id: 'branch',
      header: t('technician.branch'),
      cell: ({ row: { original: w } }) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm">{branchCode(w.branchId)}</span>
          <span className="text-xs text-gray-400">{t(`store.kind.${w.warehouseKind}`)}</span>
        </div>
      ),
    }),
    col.display({
      id: 'bins',
      header: t('store.bins'),
      cell: ({ row: { original: w } }) => {
        const active = w.bins.filter((b) => b.isActive).length
        return <span className="text-sm">{active}{active !== w.bins.length ? <span className="text-xs text-gray-400"> / {w.bins.length}</span> : null}</span>
      },
    }),
    col.display({
      id: 'status',
      header: () => t('common.status'),
      size: 120,
      cell: ({ row: { original: w } }) => <StatusBadge status={w.isActive ? 'ACTIVE' : 'INACTIVE'} />,
    }),
    col.display({
      id: 'actions',
      header: '',
      size: 60,
      cell: ({ row: { original: w } }) => (
        <div className="flex justify-end">
          <button type="button" onClick={() => open(w.warehouseId)} className="text-xs text-blue-600 hover:underline">{t('common.edit')}</button>
        </div>
      ),
    }),
  ]

  return (
    <ListPage
      title={t('nav.stores')}
      subtitle={`${rows.length} store${rows.length !== 1 ? 's' : ''} found`}
      actions={
        canAnywhere('fleet.inventory.manage') && (
          <Link href="/master/stores/new" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700">
            + {t('nav.stores')}
          </Link>
        )
      }
      filters={
        <>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">{t('technician.branch')}</label>
            <select value={branch} onChange={(e) => push({ branch: e.target.value })} className={selectClass}>
              <option value="ALL">{t('common.all')}</option>
              {branches.map((b) => <option key={b.branchId} value={b.branchId}>{b.branchCode} · {b.displayName}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">{t('common.status')}</label>
            <select value={status} onChange={(e) => push({ status: e.target.value })} className={selectClass}>
              {['ALL', 'ACTIVE', 'INACTIVE'].map((s) => <option key={s} value={s}>{s === 'ALL' ? t('common.all') : s}</option>)}
            </select>
          </div>
        </>
      }
    >
      {list.isLoading ? (
        <div className="flex justify-center py-12 text-gray-400"><Loader2 size={20} className="animate-spin" /></div>
      ) : list.error ? (
        <div role="alert" className="m-4 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">{errorText(list.error, t)}</div>
      ) : (
        <DataTable data={rows} columns={columns} pageSize={15} />
      )}
    </ListPage>
  )
}
