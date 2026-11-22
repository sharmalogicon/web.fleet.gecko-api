'use client'

import { useState, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { ReasonDialog } from '@/components/shared/ReasonDialog'
import { useT } from '@/i18n/I18nContext'
import { ApiError } from '@/lib/api/problem'
import { errorText } from '@/lib/api/errorText'
import { useToastStore } from '@/lib/stores/useToastStore'

/** Small shared pieces of the P4 document screens (prompt 11): formatting, loading / error boxes, save + action runners. */

export const cellInput = 'w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50'

export const fmtDate = (d?: string | null) =>
  d ? new Date(d.slice(0, 10) + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export const money = (v?: number | string | null) =>
  v === undefined || v === null || v === '' ? '—' : '฿' + Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const num = (v?: number | string | null) => (v === undefined || v === null || v === '' ? 0 : Number(v))

export function Loading() {
  return <div className="flex justify-center py-12 text-gray-400"><Loader2 size={20} className="animate-spin" /></div>
}

export function Alert({ children }: { children: ReactNode }) {
  return <div role="alert" className="p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">{children}</div>
}

/** The API status under the screen status when they differ. */
export function StatusPill({ view, api, className }: { view: string; api?: string; className: string }) {
  return (
    <div className="flex flex-col gap-0.5 items-start">
      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>{view}</span>
      {api && api !== view && <span className="text-[10px] text-gray-500">{api}</span>}
    </div>
  )
}

/** A save failure as banner text: 400 → the field messages; 409 (changed / not enough stock / over the PO) also toasts. */
export function useSaveFailure() {
  const { t } = useT()
  const toast = useToastStore()
  return (e: unknown): string => {
    if (e instanceof ApiError && e.status === 409) toast.warning(t('equipment.conflict'), errorText(e, t))
    if (e instanceof ApiError && e.status === 400) return Object.values(e.fieldMap).join(' ') || errorText(e, t)
    return errorText(e, t)
  }
}

interface ActionMutation {
  mutate: (v: { id: string; action: string; body: unknown }, o: { onSuccess: () => void; onError: (e: unknown) => void }) => void
  isPending: boolean
}

/** One action run (with an optional reason dialog) on a saved document: `{ ...body, rowVersion }`. */
export function useDocActions(action: ActionMutation, id: string | undefined, rowVersion: string | undefined) {
  const { t } = useT()
  const toast = useToastStore()
  const [dialog, setDialog] = useState<{ act: string; title: string; required?: boolean; body?: (reason: string) => object } | null>(null)
  const [dialogError, setDialogError] = useState<string | null>(null)
  const run = (act: string, body: object = { reason: null }, inDialog = false) => {
    if (!id || !rowVersion) return
    setDialogError(null)
    action.mutate({ id, action: act, body: { ...body, rowVersion } }, {
      onSuccess: () => { toast.success(t('docs.done')); setDialog(null) },
      onError: (e) => { setDialogError(errorText(e, t)); if (!inDialog) toast.error(t('common.saveFailed'), errorText(e, t)) },
    })
  }
  const ask = (act: string, title: string, required = false, body?: (reason: string) => object) => { setDialogError(null); setDialog({ act, title, required, body }) }
  const dialogNode = dialog && (
    <ReasonDialog
      title={dialog.title}
      confirmLabel={dialog.title.split(' · ')[0]}
      reasonRequired={dialog.required}
      danger
      busy={action.isPending}
      error={dialogError}
      onConfirm={(reason) => run(dialog.act, dialog.body ? dialog.body(reason) : { reason: reason || null }, true)}
      onClose={() => setDialog(null)}
    />
  )
  return { run, ask, dialogNode }
}
