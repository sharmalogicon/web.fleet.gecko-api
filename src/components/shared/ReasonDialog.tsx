'use client'

import { useState, type ReactNode } from 'react'
import { Button, Panel } from '@/components/fleet-setup/ui'
import { useT } from '@/i18n/I18nContext'

/** A confirm dialog with a reason (required or optional) and optional extra inputs; for status actions. */
export function ReasonDialog({
  title, confirmLabel, reasonRequired, busy, error, onConfirm, onClose, children, hint, danger,
}: {
  title: string
  confirmLabel: string
  reasonRequired?: boolean
  busy?: boolean
  error?: string | null
  onConfirm: (reason: string) => void
  onClose: () => void
  children?: ReactNode
  hint?: string
  danger?: boolean
}) {
  const { t } = useT()
  const [reason, setReason] = useState('')
  return (
    <Panel
      open
      variant="modal"
      title={title}
      onClose={onClose}
      footer={(
        <>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant={danger ? 'danger' : 'primary'} busy={busy} disabled={reasonRequired && !reason.trim()} onClick={() => onConfirm(reason)}>
            {confirmLabel}
          </Button>
        </>
      )}
    >
      {hint && <p className="text-sm text-gray-600">{hint}</p>}
      {children}
      <label className="flex flex-col gap-1 text-xs font-medium text-gray-700">
        {t('meter.reason')}{reasonRequired ? ' *' : ''}
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={400}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </label>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </Panel>
  )
}

/** A toolbar button in the forms' header style. */
export function ToolbarButton({ children, onClick, disabled, tone = 'secondary' }: {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
  tone?: 'primary' | 'secondary' | 'danger' | 'success'
}) {
  const cls = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 border-transparent',
    secondary: 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
    danger: 'border-red-300 text-red-600 hover:bg-red-50 bg-white',
    success: 'border-green-300 text-green-700 hover:bg-green-50 bg-white',
  }[tone]
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`px-4 py-2 text-sm font-medium rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed ${cls}`}>
      {children}
    </button>
  )
}
