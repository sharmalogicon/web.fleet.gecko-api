'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, ArrowLeftRight, ArrowRight } from 'lucide-react'
import type { RemovalDestination, RemovalReason, Tire } from '@/types/tire-axle-map'
import { useT } from '@/i18n/I18nContext'

export type ActionRequest =
  | { mode: 'install'; position: string; tire: Tire; replacing?: Tire; warnings: string[] }
  | { mode: 'remove'; position: string; tire: Tire; warnings: string[] }
  | { mode: 'rotate'; from: string; to: string; tireA: Tire; tireB?: Tire; warnings: string[] }
  | { mode: 'inspect'; position: string; tire: Tire; warnings: string[] }

export interface ActionValues {
  date: string
  odometerKm: number
  treadMM: number
  pressurePsi: number
  removedTreadMM: number
  reason: RemovalReason
  destination: RemovalDestination
  /** Store for a tyre removed to STOCK ('' = the branch default store); owner-approved finding A2. */
  warehouseId: string
}

export interface StoreOption {
  warehouseId: string
  label: string
  isDefault: boolean
}

const REASONS: RemovalReason[] = ['wornOut', 'puncture', 'sidewall', 'irregularWear', 'separation', 'rotation', 'recap', 'other']
const DESTINATIONS: RemovalDestination[] = ['stock', 'recap', 'repair', 'scrap']

/** Sensible destination for a given removal reason. */
const DEFAULT_DEST: Record<RemovalReason, RemovalDestination> = {
  wornOut: 'recap',
  puncture: 'repair',
  sidewall: 'scrap',
  irregularWear: 'recap',
  separation: 'scrap',
  rotation: 'stock',
  recap: 'recap',
  other: 'stock',
}

interface Props {
  request: ActionRequest | null
  odometerKm: number
  /** Stores of the vehicle's branch, for a tyre removed to STOCK. */
  stores?: StoreOption[]
  onConfirm: (values: ActionValues) => void
  onCancel: () => void
}

export function TireActionDialog({ request, odometerKm, stores, onConfirm, onCancel }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const { t } = useT()

  useEffect(() => {
    if (request) ref.current?.showModal()
    else ref.current?.close()
  }, [request])

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault()
        onCancel()
      }}
      aria-labelledby="tire-action-title"
      className="m-auto w-full max-w-md rounded-xl p-0 shadow-2xl backdrop:bg-slate-900/50"
    >
      {request && (
        <DialogBody
          // remount per request so the form starts from fresh defaults
          key={JSON.stringify([request.mode, 'position' in request ? request.position : request.from])}
          request={request}
          odometerKm={odometerKm}
          stores={stores}
          onConfirm={onConfirm}
          onCancel={onCancel}
          t={t}
        />
      )}
    </dialog>
  )
}

function DialogBody({ request, odometerKm, stores = [], onConfirm, onCancel, t }: Props & { request: ActionRequest; t: (k: string) => string }) {
  const subject = request.mode === 'rotate' ? request.tireA : request.tire
  const outgoing =
    request.mode === 'remove' ? request.tire : request.mode === 'install' ? request.replacing : undefined

  const [v, setV] = useState<ActionValues>({
    date: new Date().toISOString().slice(0, 10),
    odometerKm,
    treadMM: subject.treadMM,
    pressurePsi: subject.targetPsi,
    removedTreadMM: outgoing?.treadMM ?? 0,
    reason: outgoing && outgoing.treadMM < 4 ? 'wornOut' : 'rotation',
    destination: outgoing && outgoing.treadMM < 4 ? 'recap' : 'stock',
    warehouseId: stores.find((s) => s.isDefault)?.warehouseId ?? '',
  })
  const set = <K extends keyof ActionValues>(k: K, val: ActionValues[K]) => setV((p) => ({ ...p, [k]: val }))

  const title = {
    install: request.mode === 'install' && request.replacing ? t('tireMap.dlg.replaceTitle') : t('tireMap.dlg.installTitle'),
    remove: t('tireMap.dlg.removeTitle'),
    rotate: request.mode === 'rotate' && request.tireB ? t('tireMap.dlg.swapTitle') : t('tireMap.dlg.moveTitle'),
    inspect: t('tireMap.dlg.inspectTitle'),
  }[request.mode]

  const showMeasurements = request.mode === 'install' || request.mode === 'inspect'

  return (
    <form
      method="dialog"
      onSubmit={(e) => {
        e.preventDefault()
        onConfirm(v)
      }}
      className="flex flex-col"
    >
      <header className="border-b border-gray-100 px-5 py-4">
        <h2 id="tire-action-title" className="text-base font-semibold text-gray-900">
          {title}
        </h2>
        <Summary request={request} t={t} />
      </header>

      <div className="flex flex-col gap-4 px-5 py-4">
        {request.warnings.length > 0 && (
          <ul className="flex flex-col gap-1.5 rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
            {request.warnings.map((w) => (
              <li key={w} className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" aria-hidden />
                {w}
              </li>
            ))}
          </ul>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label={t('tireMap.dlg.date')}>
            <input type="date" required value={v.date} onChange={(e) => set('date', e.target.value)} className={inputCls} />
          </Field>
          <Field label={t('tireMap.dlg.odometer')}>
            <input type="number" required min={0} value={v.odometerKm} onChange={(e) => set('odometerKm', Number(e.target.value))} className={inputCls} />
          </Field>
          {showMeasurements && (
            <>
              <Field label={t('tireMap.dlg.treadMM')}>
                <input type="number" required min={0} max={30} step={0.1} value={v.treadMM} onChange={(e) => set('treadMM', Number(e.target.value))} className={inputCls} />
              </Field>
              <Field label={t('tireMap.dlg.pressure')}>
                <input type="number" required min={0} max={200} value={v.pressurePsi} onChange={(e) => set('pressurePsi', Number(e.target.value))} className={inputCls} />
              </Field>
            </>
          )}
        </div>

        {outgoing && (
          <fieldset className="flex flex-col gap-3 rounded-lg border border-gray-200 p-3">
            <legend className="px-1 text-xs font-semibold text-gray-700">
              {t('tireMap.dlg.removedTire')} · <span className="font-mono">{outgoing.serialNo}</span>
            </legend>
            <Field label={t('tireMap.dlg.reason')}>
              <select
                value={v.reason}
                onChange={(e) => {
                  const r = e.target.value as RemovalReason
                  setV((p) => ({ ...p, reason: r, destination: DEFAULT_DEST[r] }))
                }}
                className={inputCls}
              >
                {REASONS.map((r) => (
                  <option key={r} value={r}>
                    {t(`tireMap.reason.${r}`)}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('tireMap.dlg.removedTread')}>
                <input type="number" required min={0} max={30} step={0.1} value={v.removedTreadMM} onChange={(e) => set('removedTreadMM', Number(e.target.value))} className={inputCls} />
              </Field>
              <Field label={t('tireMap.dlg.destination')}>
                <select value={v.destination} onChange={(e) => set('destination', e.target.value as RemovalDestination)} className={inputCls}>
                  {DESTINATIONS.map((d) => (
                    <option key={d} value={d}>
                      {t(`tireMap.dest.${d}`)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            {v.destination === 'stock' && (
              <Field label={t('tireMap.dlg.store')}>
                <select value={v.warehouseId} onChange={(e) => set('warehouseId', e.target.value)} className={inputCls}>
                  <option value="">{t('tireMap.dlg.branchDefaultStore')}</option>
                  {stores.map((s) => (
                    <option key={s.warehouseId} value={s.warehouseId}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            {v.destination === 'stock' && !v.warehouseId && !stores.some((s) => s.isDefault) && (
              <p className="text-xs text-amber-700">{t('tireMap.dlg.noDefaultStore')}</p>
            )}
          </fieldset>
        )}
      </div>

      <footer className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-3">
        <button type="button" onClick={onCancel} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          {t('common.cancel')}
        </button>
        <button
          type="submit"
          autoFocus
          className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${
            request.mode === 'remove' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {t('tireMap.dlg.confirm')}
        </button>
      </footer>
    </form>
  )
}

const inputCls =
  'w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-gray-600">{label}</span>
      {children}
    </label>
  )
}

function Chip({ children, tone = 'gray' }: { children: React.ReactNode; tone?: 'gray' | 'blue' | 'red' }) {
  const cls = { gray: 'bg-gray-100 text-gray-700', blue: 'bg-blue-100 text-blue-700', red: 'bg-red-100 text-red-700' }[tone]
  return <span className={`rounded-md px-1.5 py-0.5 font-mono text-xs font-semibold ${cls}`}>{children}</span>
}

function Summary({ request, t }: { request: ActionRequest; t: (k: string) => string }) {
  const arrow = <ArrowRight className="h-3.5 w-3.5 text-gray-400" aria-hidden />
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-gray-600">
      {request.mode === 'install' && (
        <>
          {request.replacing && (
            <>
              <Chip tone="red">{request.replacing.serialNo}</Chip>
              <span>{t('tireMap.dlg.out')}</span>
              <span className="mx-1 text-gray-300">|</span>
            </>
          )}
          <Chip tone="blue">{request.tire.serialNo}</Chip>
          {arrow}
          <Chip>{request.position}</Chip>
        </>
      )}
      {request.mode === 'remove' && (
        <>
          <Chip>{request.position}</Chip>
          {arrow}
          <Chip tone="red">{request.tire.serialNo}</Chip>
        </>
      )}
      {request.mode === 'rotate' && (
        <>
          <Chip>{request.from}</Chip>
          {request.tireB ? <ArrowLeftRight className="h-3.5 w-3.5 text-gray-400" aria-hidden /> : arrow}
          <Chip>{request.to}</Chip>
        </>
      )}
      {request.mode === 'inspect' && (
        <>
          <Chip>{request.position}</Chip>
          <Chip tone="blue">{request.tire.serialNo}</Chip>
        </>
      )}
    </div>
  )
}
