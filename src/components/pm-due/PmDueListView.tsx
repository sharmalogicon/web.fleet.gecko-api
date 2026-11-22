'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import { Loader2, RefreshCw } from 'lucide-react'
import { ListPage } from '@/components/shared/ListPage'
import { DataTable } from '@/components/shared/DataTable'
import { SearchInput } from '@/components/shared/SearchInput'
import { Button, Panel } from '@/components/fleet-setup/ui'
import { useT } from '@/i18n/I18nContext'
import { DUE_STATUSES, leftText, useSetBaseline, useRecalculatePm, usePmDue, type DueView } from '@/lib/api/fleet/pm'
import { useFleetAccess } from '@/lib/api/fleet/access'
import { useBranchContext } from '@/lib/api/platform/branches'
import { errorText } from '@/lib/api/errorText'
import { useToastStore } from '@/lib/stores/useToastStore'

const col = createColumnHelper<DueView>()
const selectClass = 'text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500'
const STATUS_TONE: Record<string, string> = {
  OK: 'bg-green-50 text-green-700 border-green-200',
  DUE_SOON: 'bg-amber-50 text-amber-700 border-amber-200',
  DUE: 'bg-orange-50 text-orange-700 border-orange-300',
  OVERDUE: 'bg-red-50 text-red-700 border-red-300',
}
const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')

interface Props {
  search: string
  status: string
  dueOnly: boolean
  branch: string
}

/** New page (prompt 08 §C): what PM is due, most urgent first (the API sorts). Status is computed for today on each read. */
export function PmDueListView({ search, status, dueOnly, branch }: Props) {
  const { t } = useT()
  const router = useRouter()
  const toast = useToastStore()
  const { canAt, canTenantWide } = useFleetAccess()
  const { branches } = useBranchContext()
  const recalc = useRecalculatePm()
  const [baseline, setBaseline] = useState<DueView | null>(null)
  const due = usePmDue({
    search: search || undefined,
    status: status !== 'ALL' ? status : undefined,
    dueOnly,
    branchId: branch !== 'ALL' ? branch : undefined,
  })
  const rows = due.data ?? []

  const push = useCallback(
    (p: Partial<Props>) => {
      const next = { search, status, dueOnly, branch, ...p }
      const sp = new URLSearchParams()
      if (next.search) sp.set('search', next.search)
      if (next.status !== 'ALL') sp.set('status', next.status)
      if (!next.dueOnly) sp.set('dueOnly', 'false')
      if (next.branch !== 'ALL') sp.set('branch', next.branch)
      router.push(`/fleet/pm-due?${sp.toString()}`)
    },
    [search, status, dueOnly, branch, router],
  )

  const columns = [
    col.display({
      id: 'asset',
      header: () => t('common.equipment'),
      cell: ({ row: { original: r } }) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium font-mono">{r.assetCode}</span>
          <span className="text-xs text-gray-400">{r.registrationNo ?? '—'}</span>
        </div>
      ),
    }),
    col.display({
      id: 'task',
      header: t('pm.scheduleTask'),
      cell: ({ row: { original: r } }) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm">{r.taskDescription}</span>
          <span className="text-xs text-gray-400 font-mono">{r.programCode} · {r.taskCode}</span>
        </div>
      ),
    }),
    col.display({
      id: 'last',
      header: t('pm.lastDone'),
      cell: ({ row: { original: r } }) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm">{fmtDate(r.lastDoneAt)}</span>
          <span className="text-xs text-gray-400">
            {[r.lastDoneKm != null && `${r.lastDoneKm.toLocaleString()} km`, r.lastDoneHours != null && `${r.lastDoneHours.toLocaleString()} hrs`, r.lastDoneSource]
              .filter(Boolean).join(' · ') || '—'}
          </span>
        </div>
      ),
    }),
    col.display({
      id: 'next',
      header: t('pm.nextDue'),
      cell: ({ row: { original: r } }) => {
        const parts = [
          r.nextDueAt && `${fmtDate(r.nextDueAt)}${r.daysLeft != null ? ` (${leftText(r.daysLeft, t('pm.days'), t)})` : ''}`,
          r.nextDueKm != null && `${r.nextDueKm.toLocaleString()} km${r.kmLeft != null ? ` (${leftText(r.kmLeft, 'km', t)})` : ''}`,
          r.nextDueHours != null && `${r.nextDueHours.toLocaleString()} hrs${r.hoursLeft != null ? ` (${leftText(r.hoursLeft, 'hrs', t)})` : ''}`,
        ].filter(Boolean) as string[]
        const late = [r.daysLeft, r.kmLeft, r.hoursLeft].some((x) => x != null && x < 0)
        return (
          <div className="flex flex-col gap-0.5">
            {parts.length ? parts.map((p) => <span key={p} className={`text-xs ${late ? 'text-red-600' : 'text-gray-700'}`}>{p}</span>) : <span className="text-xs text-gray-400">—</span>}
          </div>
        )
      },
    }),
    col.display({
      id: 'status',
      header: () => t('common.status'),
      size: 110,
      cell: ({ row: { original: r } }) => (
        <span className={`inline-flex px-2 py-0.5 rounded-full border text-xs font-medium ${STATUS_TONE[r.status] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
          {t(`pm.status.${r.status}`)}
        </span>
      ),
    }),
    col.display({
      id: 'actions',
      header: '',
      size: 100,
      cell: ({ row: { original: r } }) =>
        canAt('fleet.pm.manage', r.branchId) ? (
          <div className="flex justify-end">
            <button type="button" onClick={() => setBaseline(r)} className="text-xs text-blue-600 hover:underline">{t('pm.setLastDone')}</button>
          </div>
        ) : null,
    }),
  ]

  return (
    <ListPage
      title={t('nav.pmDue')}
      subtitle={`${rows.length} task${rows.length !== 1 ? 's' : ''} ${dueOnly ? t('pm.dueOrLate') : ''}`}
      actions={
        canTenantWide('fleet.pm.manage') && (
          <button
            type="button"
            disabled={recalc.isPending}
            onClick={() =>
              recalc.mutate(undefined, {
                onSuccess: (r) => toast.success(t('pm.recalculated'), `${r.assets} ${t('pm.assets')}`),
                onError: (e) => toast.error(t('pm.recalculateFailed'), errorText(e, t)),
              })
            }
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {recalc.isPending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} {t('pm.recalculate')}
          </button>
        )
      }
      filters={
        <>
          <SearchInput value={search} onChange={(v) => push({ search: v })} placeholder={t('pm.searchPlaceholder')} className="w-64" />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">{t('common.status')}</label>
            <select value={status} onChange={(e) => push({ status: e.target.value })} className={selectClass}>
              <option value="ALL">{t('common.all')}</option>
              {DUE_STATUSES.map((s) => <option key={s} value={s}>{t(`pm.status.${s}`)}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">{t('technician.branch')}</label>
            <select value={branch} onChange={(e) => push({ branch: e.target.value })} className={selectClass}>
              <option value="ALL">{t('common.all')}</option>
              {branches.map((b) => <option key={b.branchId} value={b.branchId}>{b.branchCode} · {b.displayName}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 pb-2">
            <input type="checkbox" checked={dueOnly} onChange={(e) => push({ dueOnly: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-blue-600" />
            {t('pm.dueOnly')}
          </label>
        </>
      }
    >
      {due.isLoading ? (
        <div className="flex justify-center py-12 text-gray-400"><Loader2 size={20} className="animate-spin" /></div>
      ) : due.error ? (
        <div role="alert" className="m-4 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">{errorText(due.error, t)}</div>
      ) : (
        <DataTable data={rows} columns={columns} pageSize={20} />
      )}
      {baseline && <BaselineDialog row={baseline} onClose={() => setBaseline(null)} />}
    </ListPage>
  )
}

/** "Set last done": the go-live opening balance of one task on one asset. */
function BaselineDialog({ row, onClose }: { row: DueView; onClose: () => void }) {
  const { t } = useT()
  const toast = useToastStore()
  const save = useSetBaseline()
  const [date, setDate] = useState(row.lastDoneAt?.slice(0, 10) ?? '')
  const [km, setKm] = useState(row.lastDoneKm != null ? String(row.lastDoneKm) : '')
  const [hours, setHours] = useState(row.lastDoneHours != null ? String(row.lastDoneHours) : '')
  const [error, setError] = useState<string | null>(null)
  const num = (s: string) => (s.trim() === '' ? null : Number(s))
  const input = 'w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  const submit = () =>
    save.mutate(
      { id: row.id, lastDoneAt: date, lastDoneKm: num(km), lastDoneHours: num(hours), rowVersion: row.rowVersion },
      { onSuccess: () => { toast.success(t('pm.baselineSaved'), `${row.assetCode} · ${row.taskCode}`); onClose() }, onError: (e) => setError(errorText(e, t)) },
    )

  return (
    <Panel
      open
      variant="modal"
      title={`${t('pm.setLastDone')} · ${row.assetCode} · ${row.taskCode}`}
      onClose={onClose}
      footer={(
        <>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" busy={save.isPending} disabled={!date} onClick={submit}>{t('common.save')}</Button>
        </>
      )}
    >
      <p className="text-sm text-gray-600">{t('pm.baselineHint')}</p>
      <label className="flex flex-col gap-1 text-xs font-medium text-gray-700">{t('pm.lastDoneDate')} *
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={input} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-700">{t('pm.lastDoneKm')}
          <input type="number" min={0} value={km} onChange={(e) => setKm(e.target.value)} className={input} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-700">{t('pm.lastDoneHours')}
          <input type="number" min={0} step="0.1" value={hours} onChange={(e) => setHours(e.target.value)} className={input} />
        </label>
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </Panel>
  )
}
