'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Loader2, X } from 'lucide-react'
import { useT } from '@/i18n/I18nContext'
import { ApiError } from '@/lib/api/problem'
import { errorText } from '@/lib/api/errorText'
import { useBranchContext } from '@/lib/api/platform/branches'
import { useToastStore } from '@/lib/stores/useToastStore'

/** `t()` with `{name}` placeholders (the i18n context has no interpolation of its own). */
export function useFmt() {
  const { t, lang } = useT()
  const fmt = (key: string, vars: Record<string, string | number> = {}) =>
    t(key).replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m))
  /** A translated label, or `fallback` when the key has no text yet (API-driven codes). */
  const label = (key: string, fallback: string) => {
    const text = t(key)
    return text === key ? fallback : text
  }
  return { t, fmt, label, lang }
}

/** "Tenant-wide" or "CODE · Name" for a branch id. */
export function useScopeLabel() {
  const { t } = useT()
  const { branches } = useBranchContext()
  return (branchId: string | null | undefined) => {
    if (!branchId) return t('fleetSetup.tenantWide')
    const b = branches.find((x) => x.branchId === branchId)
    return b ? `${b.branchCode} · ${b.displayName}` : branchId.slice(0, 8)
  }
}

/**
 * What a failed setup write shows. 409 = the row changed under the user: a toast, and the
 * caller's mutation refetches the list (useSetupMutation onSettled). 400 field errors are
 * returned for the form to place beside its inputs; anything else is the form's banner text.
 */
export function useWriteErrors() {
  const { t } = useT()
  const toast = useToastStore()
  const [fields, setFields] = useState<Record<string, string>>({})
  const [banner, setBanner] = useState<string | null>(null)

  const clear = () => {
    setFields({})
    setBanner(null)
  }

  const handle = (err: unknown) => {
    if (err instanceof ApiError && err.status === 409) {
      toast.warning(t('fleetSetup.conflictTitle'), errorText(err, t))
      setFields({})
      setBanner(errorText(err, t))
      return
    }
    if (err instanceof ApiError && err.status === 400 && Object.keys(err.fieldErrors).length) {
      setFields(err.fieldMap)
      setBanner(null)
      return
    }
    setFields({})
    setBanner(errorText(err, t))
  }

  return { fields, banner, clear, handle, field: (name: string) => fields[name.toLowerCase()] }
}

export function Section({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  )
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-12">
      <div className="w-11 h-11 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center">{icon}</div>
      <p className="mt-3 text-sm font-semibold text-gray-800">{title}</p>
      <p className="mt-1 max-w-md text-sm text-gray-500">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Loading() {
  return (
    <div className="flex justify-center py-12 text-gray-400">
      <Loader2 size={20} className="animate-spin" />
    </div>
  )
}

export function LoadError({ error }: { error: unknown }) {
  const { t } = useT()
  return (
    <div role="alert" className="m-4 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">
      {t('fleetSetup.loadFailed')} {errorText(error, t)}
    </div>
  )
}

export function Banner({ text }: { text: string | null }) {
  if (!text) return null
  return (
    <div role="alert" className="p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">
      {text}
    </div>
  )
}

const TONES = {
  green: 'bg-green-50 text-green-700 border-green-200',
  gray: 'bg-gray-50 text-gray-600 border-gray-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
} as const
export type Tone = keyof typeof TONES

export function Chip({ tone, children, title }: { tone: Tone; children: ReactNode; title?: string }) {
  return (
    <span title={title} className={`inline-flex px-2 py-0.5 rounded-full border text-xs font-medium whitespace-nowrap ${TONES[tone]}`}>
      {children}
    </span>
  )
}

export function Button({
  children, onClick, variant = 'secondary', disabled, busy, type = 'button', title,
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  disabled?: boolean
  busy?: boolean
  type?: 'button' | 'submit'
  title?: string
}) {
  const styles = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 border-transparent',
    secondary: 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300',
    danger: 'bg-white text-red-600 hover:bg-red-50 border-red-200',
    ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 border-transparent',
  }[variant]
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || busy}
      title={title}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed ${styles}`}
    >
      {busy && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  )
}

/** A labelled form row with its error (from the client rules or the API's 400). */
export function Field({ label, error, hint, children, htmlFor }: {
  label: string
  error?: string
  hint?: ReactNode
  children: ReactNode
  htmlFor?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-xs font-medium text-gray-700">{label}</label>
      {children}
      {error ? <p className="text-xs text-red-600">{error}</p> : hint ? <p className="text-xs text-gray-500">{hint}</p> : null}
    </div>
  )
}

export const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500'

export function Toggle({ checked, onChange, disabled, label, title }: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
  label?: string
  title?: string
}) {
  return (
    <label className={`inline-flex items-center gap-2 text-sm ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`} title={title}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-gray-300'} disabled:cursor-not-allowed`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </button>
      {label && <span className="text-gray-700">{label}</span>}
    </label>
  )
}

/** A modal (`variant="modal"`) or a right-hand side panel, on the native <dialog>. */
export function Panel({ open, title, onClose, children, footer, variant = 'side' }: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer: ReactNode
  variant?: 'side' | 'modal'
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const placement = variant === 'side'
    ? 'm-0 ml-auto h-full max-h-none w-full max-w-md rounded-none'
    : 'rounded-xl max-w-lg w-full'
  return (
    <dialog
      ref={ref}
      onCancel={(e) => { e.preventDefault(); onClose() }}
      className={`p-0 shadow-2xl backdrop:bg-black/40 ${placement}`}
      aria-label={title}
    >
      {open && (
        <div className="flex flex-col h-full">
          <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            <button type="button" onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-500" aria-label="Close">
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">{children}</div>
          <div className="px-5 py-3 border-t border-gray-200 flex justify-end gap-2">{footer}</div>
        </div>
      )}
    </dialog>
  )
}

/** Tenant-wide + the user's branches. */
export function ScopeSelect({ value, onChange, disabled, id, allowTenant = true }: {
  value: string | null
  onChange: (v: string | null) => void
  disabled?: boolean
  id?: string
  allowTenant?: boolean
}) {
  const { t } = useT()
  const { branches } = useBranchContext()
  return (
    <select
      id={id}
      className={inputClass}
      value={value ?? ''}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value || null)}
    >
      {allowTenant && <option value="">{t('fleetSetup.tenantWide')}</option>}
      {branches.map((b) => (
        <option key={b.branchId} value={b.branchId}>{b.branchCode} · {b.displayName}</option>
      ))}
    </select>
  )
}
