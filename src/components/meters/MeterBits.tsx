'use client'

import { useEffect, useState } from 'react'
import { Button, Panel } from '@/components/fleet-setup/ui'
import { useT } from '@/i18n/I18nContext'
import { useFleetAccess } from '@/lib/api/fleet/access'
import { useReverseMeter, useReviewMeter, type MeterReadingView } from '@/lib/api/fleet/meters'
import { useAssets, type AssetView } from '@/lib/api/fleet/assets'
import { useDrivers, type DriverView } from '@/lib/api/fleet/drivers'
import { errorText } from '@/lib/api/errorText'
import { useToastStore } from '@/lib/stores/useToastStore'

const STATUS_TONE: Record<string, string> = {
  VALID: 'bg-green-50 text-green-700 border-green-200',
  ACCEPTED: 'bg-green-50 text-green-700 border-green-200',
  SUSPECT: 'bg-amber-50 text-amber-700 border-amber-300',
  REJECTED: 'bg-red-50 text-red-700 border-red-200',
  REVERSED: 'bg-gray-50 text-gray-500 border-gray-200 line-through',
  CANCELLED: 'bg-gray-50 text-gray-500 border-gray-200',
}

/** The reading's status in the existing value cell; the suspect reason as tooltip. */
export function MeterStatusBadge({ status, reason }: { status: string; reason?: string | null }) {
  const { t } = useT()
  const label = t(`meter.status.${status}`)
  return (
    <span title={reason ?? undefined} className={`inline-flex w-fit px-1.5 py-0 rounded border text-[10px] font-medium ${STATUS_TONE[status] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
      {label.startsWith('meter.') ? status : label}
    </span>
  )
}

type Action = 'ACCEPTED' | 'REJECTED' | 'REVERSE'

/**
 * Accept / Reject (SUSPECT) and Reverse (a counted reading). All need fleet.meter.override and a reason
 * (required for Reverse and Reject). Readings are never edited or deleted.
 */
export function MeterReadingActions({ reading, variant = 'link' }: { reading: MeterReadingView; variant?: 'link' | 'button' }) {
  const { t } = useT()
  const toast = useToastStore()
  const { canAt } = useFleetAccess()
  const review = useReviewMeter()
  const reverse = useReverseMeter()
  const [action, setAction] = useState<Action | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!canAt('fleet.meter.override', reading.dto.branchId)) return null
  const suspect = reading.status === 'SUSPECT'
  const counted = reading.status === 'VALID' || reading.status === 'ACCEPTED'
  if (!suspect && !counted) return null

  const busy = review.isPending || reverse.isPending
  const needsReason = action === 'REVERSE' || action === 'REJECTED'
  const open = (a: Action) => { setAction(a); setReason(''); setError(null) }
  const run = () => {
    if (!action) return
    const done = { onSuccess: () => { toast.success(t(`meter.done.${action}`)); setAction(null) }, onError: (e: unknown) => setError(errorText(e, t)) }
    if (action === 'REVERSE') reverse.mutate({ id: reading.id, reason }, done)
    else review.mutate({ id: reading.id, decision: action, reason }, done)
  }

  const link = (a: Action, cls: string) =>
    variant === 'link'
      ? <button type="button" onClick={() => open(a)} className={`text-xs hover:underline ${cls}`}>{t(`meter.action.${a}`)}</button>
      : <Button variant={a === 'ACCEPTED' ? 'primary' : 'danger'} onClick={() => open(a)}>{t(`meter.action.${a}`)}</Button>

  return (
    <>
      {suspect && link('ACCEPTED', 'text-green-700')}
      {suspect && link('REJECTED', 'text-red-500')}
      {counted && link('REVERSE', 'text-red-500')}
      {action && (
        <Panel
          open
          variant="modal"
          title={`${t(`meter.action.${action}`)} · ${reading.equipmentCode} · ${reading.value.toLocaleString()} ${reading.meterType === 'KM' ? 'km' : 'hrs'}`}
          onClose={() => setAction(null)}
          footer={(
            <>
              <Button onClick={() => setAction(null)}>{t('common.cancel')}</Button>
              <Button variant={action === 'ACCEPTED' ? 'primary' : 'danger'} busy={busy} disabled={needsReason && !reason.trim()} onClick={run}>
                {t(`meter.action.${action}`)}
              </Button>
            </>
          )}
        >
          {reading.suspectReason && <p className="text-sm text-amber-700">{reading.suspectReason}</p>}
          {action === 'REVERSE' && <p className="text-sm text-gray-600">{t('meter.reverseHint')}</p>}
          <label className="flex flex-col gap-1 text-xs font-medium text-gray-700">
            {t('meter.reason')}{needsReason ? ' *' : ''}
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={400}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </label>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        </Panel>
      )}
    </>
  )
}

/** Debounced value for the pickers' searches. */
function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms)
    return () => clearTimeout(id)
  }, [value, ms])
  return v
}

/**
 * The existing "Equipment Code" text input, with suggestions from GET /assets?search=.
 * `onResolve` gets the asset whose code matches exactly (or null).
 */
export function AssetCodeInput({ value, onChange, onResolve, className, placeholder, id = 'asset-codes' }: {
  value: string
  onChange: (v: string) => void
  onResolve: (asset: AssetView | null) => void
  className: string
  placeholder?: string
  id?: string
}) {
  const search = useDebounced(value.trim())
  const assets = useAssets({ search: search || undefined })
  const rows = assets.data?.rows
  useEffect(() => {
    if (!rows) return
    onResolve(rows.find((a) => a.code.toUpperCase() === value.trim().toUpperCase()) ?? null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, value])
  return (
    <>
      <input value={value} onChange={(e) => onChange(e.target.value)} list={id} className={className} placeholder={placeholder} autoComplete="off" />
      <datalist id={id}>
        {rows?.slice(0, 50).map((a) => <option key={a.id} value={a.code}>{a.registrationNo ?? ''}</option>)}
      </datalist>
    </>
  )
}

/** The existing "Driver Name" text input, with suggestions from GET /drivers?search= (value = driver code). */
export function DriverCodeInput({ value, onChange, onResolve, className, placeholder, id = 'driver-codes' }: {
  value: string
  onChange: (v: string) => void
  onResolve: (driver: DriverView | null) => void
  className: string
  placeholder?: string
  id?: string
}) {
  const search = useDebounced(value.trim())
  const drivers = useDrivers({ search: search || undefined, status: 'ACTIVE' })
  const rows = drivers.data
  useEffect(() => {
    if (!rows) return
    const v = value.trim().toUpperCase()
    onResolve(v ? rows.find((d) => d.driverCode.toUpperCase() === v || d.driverName.toUpperCase() === v) ?? null : null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, value])
  return (
    <>
      <input value={value} onChange={(e) => onChange(e.target.value)} list={id} className={className} placeholder={placeholder} autoComplete="off" />
      <datalist id={id}>
        {rows?.slice(0, 50).map((d) => <option key={d.id} value={d.driverCode}>{d.driverName}</option>)}
      </datalist>
    </>
  )
}
