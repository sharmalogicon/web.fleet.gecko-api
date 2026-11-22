'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ReasonDialog } from '@/components/shared/ReasonDialog'
import { useT } from '@/i18n/I18nContext'
import { priorityForSeverity, useDefectAction, type DefectAction, type DefectDto } from '@/lib/api/fleet/inspections'
import { useFleetAccess } from '@/lib/api/fleet/access'
import { ApiError } from '@/lib/api/problem'
import { errorText } from '@/lib/api/errorText'
import { useToastStore } from '@/lib/stores/useToastStore'

const SEVERITY_TONE: Record<string, string> = {
  OUT_OF_SERVICE: 'bg-red-50 text-red-700 border-red-300',
  MAJOR: 'bg-amber-50 text-amber-700 border-amber-300',
  MINOR: 'bg-gray-50 text-gray-600 border-gray-200',
}

export function SeverityBadge({ severity }: { severity: string }) {
  const { t } = useT()
  return <span className={`inline-flex w-fit px-2 py-0.5 rounded-full border text-xs font-medium ${SEVERITY_TONE[severity] ?? SEVERITY_TONE.MINOR}`}>{t(`insp.severity.${severity}`)}</span>
}

/** Status + WR link + deferred date, for a defect row. */
export function DefectStatus({ d }: { d: DefectDto }) {
  const { t } = useT()
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-sm">{t(`insp.defectStatus.${d.status}`)}</span>
      {d.workRequestId && <Link href={`/fleet/work-requests/${d.workRequestId}`} className="text-xs text-blue-600 hover:underline">{t('insp.openWr')}</Link>}
      {d.deferredUntil && <span className="text-xs text-gray-400" title={d.deferredReason ?? undefined}>{t('insp.until')} {d.deferredUntil}</span>}
    </div>
  )
}

const input = 'w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
const PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT']

/**
 * Raise work request / Defer / Resolve (prompt 10 §D). WR_RAISED and RESOLVED accept only Resolve (RESOLVED: none);
 * OUT_OF_SERVICE cannot be deferred. After a 409 the list is refetched (the mutation invalidates it).
 */
export function DefectActions({ d, branchId }: { d: DefectDto; branchId?: string }) {
  const { t } = useT()
  const toast = useToastStore()
  const { canAt, canAnywhere } = useFleetAccess()
  const act = useDefectAction()
  const [action, setAction] = useState<DefectAction | null>(null)
  const [priority, setPriority] = useState(priorityForSeverity(d.severity))
  const [until, setUntil] = useState('')
  const [error, setError] = useState<string | null>(null)

  const manage = branchId ? canAt('fleet.inspection.manage', branchId) : canAnywhere('fleet.inspection.manage')
  const createWr = branchId ? canAt('fleet.workrequest.create', branchId) : canAnywhere('fleet.workrequest.create')
  if (!manage || d.status === 'RESOLVED') return null
  const open = d.status === 'OPEN' || d.status === 'DEFERRED'
  const today = new Date().toISOString().slice(0, 10)

  const run = (a: DefectAction, reason: string) => {
    setError(null)
    act.mutate(
      { id: d.defectId, action: a, body: { reason: reason.trim() || null, deferredUntil: a === 'defer' ? until : null, priority: a === 'raise-work-request' ? priority : null, rowVersion: d.rowVersion } },
      {
        onSuccess: () => { toast.success(t(`insp.done.${a}`)); setAction(null) },
        onError: (e) => {
          if (e instanceof ApiError && e.status === 409) { toast.warning(t('equipment.conflict'), errorText(e, t)); setAction(null) } else setError(errorText(e, t))
        },
      },
    )
  }

  return (
    <div className="flex items-center gap-2 justify-end flex-wrap">
      {open && createWr && <button type="button" onClick={() => setAction('raise-work-request')} className="text-xs text-blue-600 hover:underline">{t('insp.action.raise-work-request')}</button>}
      {open && d.severity !== 'OUT_OF_SERVICE' && <button type="button" onClick={() => setAction('defer')} className="text-xs text-amber-700 hover:underline">{t('insp.action.defer')}</button>}
      <button type="button" onClick={() => setAction('resolve')} className="text-xs text-green-700 hover:underline">{t('insp.action.resolve')}</button>
      {action && (
        <ReasonDialog
          title={`${t(`insp.action.${action}`)} · ${d.description}`}
          confirmLabel={t(`insp.action.${action}`)}
          busy={act.isPending}
          error={error}
          hint={t(`insp.hint.${action}`)}
          onConfirm={(reason) => (action === 'defer' && !(until > today) ? setError(t('insp.rule.deferDate')) : run(action, reason))}
          onClose={() => setAction(null)}
        >
          {action === 'raise-work-request' && (
            <label className="flex flex-col gap-1 text-xs font-medium text-gray-700">{t('form.priority')}
              <select value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)} className={input}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
          )}
          {action === 'defer' && (
            <label className="flex flex-col gap-1 text-xs font-medium text-gray-700">{t('insp.deferredUntil')} *
              <input type="date" min={today} value={until} onChange={(e) => setUntil(e.target.value)} className={input} />
            </label>
          )}
        </ReasonDialog>
      )}
    </div>
  )
}
