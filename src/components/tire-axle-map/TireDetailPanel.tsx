'use client'

import { Gauge, MousePointerClick, RotateCw, Trash2, ClipboardCheck, Download } from 'lucide-react'
import type { PositionSlot, Tire } from '@/types/tire-axle-map'
import { costPerKm, pressureAlert, tireHealth } from '@/types/tire-axle-map'
import { HEALTH_BADGE } from './colors'
import { TreadBar } from './TreadBar'
import { useT } from '@/i18n/I18nContext'

interface Props {
  slot: PositionSlot | null
  tire?: Tire
  allSlots: PositionSlot[]
  armedTire?: Tire
  onRemove: () => void
  onInspect: () => void
  onRotateTo: (code: string) => void
  onInstallArmed: () => void
}

export function TireDetailPanel({ slot, tire, allSlots, armedTire, onRemove, onInspect, onRotateTo, onInstallArmed }: Props) {
  const { t } = useT()

  if (!slot) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
          <MousePointerClick className="h-8 w-8 text-gray-300" aria-hidden />
          <p className="text-sm font-medium text-gray-700">{t('tireMap.selectPosition')}</p>
          <p className="text-xs text-gray-500">{t('tireMap.selectPositionHint')}</p>
        </div>
      </Shell>
    )
  }

  const axleLabel = slot.axle ? t(`tireMap.axle.${slot.axle.kind}`) : t('tireMap.spare')

  if (!tire) {
    return (
      <Shell>
        <PositionHeader code={slot.code} subtitle={`${axleLabel}${slot.axle ? ` · ${slot.axle.tireSize}` : ''}`} />
        <div className="flex flex-col gap-3 p-4">
          <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-6 text-center text-sm text-gray-500">
            {t('tireMap.emptyHint')}
          </p>
          {armedTire && (
            <button
              type="button"
              onClick={onInstallArmed}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Download className="h-4 w-4" aria-hidden />
              {t('tireMap.installArmed').replace('{serial}', armedTire.serialNo)}
            </button>
          )}
        </div>
      </Shell>
    )
  }

  const health = tireHealth(tire)
  const cpk = costPerKm(tire)
  const pAlert = pressureAlert(tire)
  const wornPct = Math.round((1 - tire.treadMM / tire.originalTreadMM) * 100)

  return (
    <Shell>
      <PositionHeader code={slot.code} subtitle={axleLabel} />
      <div className="flex flex-col gap-4 p-4">
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-base font-semibold text-gray-900">{tire.serialNo}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${HEALTH_BADGE[health]}`}>
              {t(`tireMap.health.${health}`)}
            </span>
          </div>
          <p className="text-sm text-gray-500">
            {tire.brand} {tire.model} · {tire.size}
          </p>
        </div>

        <div>
          <div className="mb-1.5 flex items-baseline justify-between text-xs">
            <span className="font-medium text-gray-600">{t('tireMap.treadDepth')}</span>
            <span className="tabular-nums text-gray-900">
              <strong className="text-base">{tire.treadMM.toFixed(1)}</strong> / {tire.originalTreadMM} mm
            </span>
          </div>
          <TreadBar tire={tire} showTicks />
          <p className="mt-1 text-[11px] text-gray-500">{t('tireMap.wornPct').replace('{pct}', String(wornPct))}</p>
        </div>

        <dl className="grid grid-cols-2 gap-x-3 gap-y-3 text-sm">
          <Stat label={t('tireMap.pressure')}>
            <span className={pAlert ? 'font-semibold text-amber-600' : ''}>
              {tire.pressurePsi} <span className="text-gray-400">/ {tire.targetPsi} psi</span>
            </span>
          </Stat>
          <Stat label={t('tireMap.type')}>
            {tire.type === 'recap' ? `${t('tireMap.filter.recap')} ×${tire.recapCount}` : t('tireMap.filter.new')}
          </Stat>
          <Stat label={t('tireMap.kmRun')}>{tire.km.toLocaleString('en-US')} km</Stat>
          <Stat label={t('tireMap.cpk')}>{cpk === null ? '—' : `฿${cpk.toFixed(3)}`}</Stat>
          <Stat label={t('tireMap.installedOn')}>{tire.installedOn ?? '—'}</Stat>
          <Stat label={t('tireMap.cost')}>฿{tire.cost.toLocaleString('en-US')}</Stat>
        </dl>

        {pAlert && (
          <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <Gauge className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" aria-hidden />
            {t('tireMap.pressureWarn')}
          </p>
        )}

        <div className="flex flex-col gap-2 border-t border-gray-100 pt-4">
          <label className="text-xs font-medium text-gray-600" htmlFor="rotate-to">
            <RotateCw className="mr-1 inline h-3.5 w-3.5" aria-hidden />
            {t('tireMap.rotateTo')}
          </label>
          <select
            id="rotate-to"
            value=""
            onChange={(e) => e.target.value && onRotateTo(e.target.value)}
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">{t('tireMap.choosePosition')}</option>
            {allSlots
              .filter((s) => s.code !== slot.code)
              .map((s) => (
                <option key={s.code} value={s.code}>
                  {s.code}
                </option>
              ))}
          </select>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onInspect}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <ClipboardCheck className="h-4 w-4" aria-hidden />
              {t('tireMap.inspect')}
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              {t('tireMap.remove')}
            </button>
          </div>
        </div>
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return <section className="rounded-xl border border-gray-200 bg-white shadow-sm">{children}</section>
}

function PositionHeader({ code, subtitle }: { code: string; subtitle: string }) {
  const { t } = useT()
  return (
    <header className="flex items-center gap-3 border-b border-gray-100 p-4">
      <span className="flex h-10 min-w-10 items-center justify-center rounded-lg bg-slate-800 px-2 font-mono text-sm font-bold text-white">{code}</span>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{t('tireMap.position')}</p>
        <p className="text-sm font-medium text-gray-900">{subtitle}</p>
      </div>
    </header>
  )
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-0.5 tabular-nums text-gray-900">{children}</dd>
    </div>
  )
}
