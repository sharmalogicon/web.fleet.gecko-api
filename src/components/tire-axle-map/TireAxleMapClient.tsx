'use client'

import { useCallback, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { Undo2, Send, Truck, Gauge, AlertTriangle, CircleDot, Coins } from 'lucide-react'
import type { RemovedTire, Tire, TireTransaction, Vehicle } from '@/types/tire-axle-map'
import { costPerKm, positionsFor, pressureAlert, tireHealth } from '@/types/tire-axle-map'
import { VEHICLE_CONFIGS, buildMockInventory, buildMockVehicles } from '@/lib/mock/tire-axle-map'
import { useToastStore } from '@/lib/stores/useToastStore'
import { useT } from '@/i18n/I18nContext'
import { AxleDiagram } from './AxleDiagram'
import { AxleDiagramBay } from './AxleDiagramBay'

// WebGL scene is client-only and heavy: load it on demand.
const AxleDiagram3D = dynamic(() => import('./AxleDiagram3D').then((m) => m.AxleDiagram3D), {
  ssr: false,
  loading: () => <div className="h-[600px] w-full animate-pulse rounded-lg bg-slate-100" />,
})
import { TireInventoryPanel } from './TireInventoryPanel'
import { TireDetailPanel } from './TireDetailPanel'
import { TireActionDialog, type ActionRequest, type ActionValues } from './TireActionDialog'
import { useTireDrag, type DragPayload } from './useTireDrag'
import { HEALTH_COLOR } from './colors'

interface BoardState {
  vehicles: Vehicle[]
  inventory: Tire[]
  removed: RemovedTire[]
  transactions: TireTransaction[]
}

let txSeq = 0
const txId = () => `TX-${Date.now().toString(36)}-${++txSeq}`

export function TireAxleMapClient({ variant = 'classic' }: { variant?: 'classic' | 'bay' | '3d' }) {
  const { t } = useT()
  const toast = useToastStore()

  const [state, setState] = useState<BoardState>(() => ({
    vehicles: buildMockVehicles(),
    inventory: buildMockInventory(),
    removed: [],
    transactions: [],
  }))
  const [history, setHistory] = useState<BoardState[]>([])
  const [vehicleCode, setVehicleCode] = useState(state.vehicles[0].code)
  const [selected, setSelected] = useState<string | null>(null)
  const [armedSerial, setArmedSerial] = useState<string | null>(null)
  const [request, setRequest] = useState<ActionRequest | null>(null)

  const vehicle = state.vehicles.find((v) => v.code === vehicleCode)!
  const config = VEHICLE_CONFIGS.find((c) => c.id === vehicle.configId)!
  const slots = useMemo(() => positionsFor(config), [config])
  const slotByCode = useMemo(() => Object.fromEntries(slots.map((s) => [s.code, s])), [slots])
  const vehicleSizes = useMemo(() => [...new Set(config.axles.map((a) => a.tireSize))], [config])
  const armedTire = state.inventory.find((x) => x.serialNo === armedSerial)

  // ── fitment rules → non-blocking warnings ─────────────────────────────
  const warningsFor = useCallback(
    (tire: Tire, code: string): string[] => {
      const slot = slotByCode[code]
      const w: string[] = []
      const size = slot?.axle?.tireSize ?? vehicleSizes[0]
      if (tire.size !== size) w.push(t('tireMap.warn.size').replace('{size}', tire.size).replace('{expected}', size))
      if (slot?.axle?.kind === 'steer' && tire.type === 'recap') w.push(t('tireMap.warn.recapSteer'))
      if (tireHealth(tire) === 'critical') w.push(t('tireMap.warn.lowTread'))
      return w
    },
    [slotByCode, vehicleSizes, t],
  )

  const dualMismatch = useCallback(
    (code: string, tire: Tire, fitment: Record<string, Tire>): string[] => {
      // Dual partners should be within ~3 mm of each other to share load evenly.
      const m = code.match(/^(\d+)([LR])([IO])$/)
      if (!m) return []
      const partner = fitment[`${m[1]}${m[2]}${m[3] === 'I' ? 'O' : 'I'}`]
      if (partner && Math.abs(partner.treadMM - tire.treadMM) > 3) return [t('tireMap.warn.dualMatch')]
      return []
    },
    [t],
  )

  // ── drag & drop routing ───────────────────────────────────────────────
  const handleDrop = useCallback(
    (payload: DragPayload, target: string) => {
      const fit = vehicle.fitment
      if (payload.source === 'inventory') {
        if (!slotByCode[target]) return
        const tire = state.inventory.find((x) => x.serialNo === payload.serialNo)
        if (!tire) return
        setSelected(target)
        setRequest({
          mode: 'install',
          position: target,
          tire,
          replacing: fit[target],
          warnings: [...warningsFor(tire, target), ...dualMismatch(target, tire, fit)],
        })
      } else if (target === 'inventory') {
        const tire = fit[payload.code]
        if (tire) setRequest({ mode: 'remove', position: payload.code, tire, warnings: [] })
      } else if (slotByCode[target] && target !== payload.code) {
        const tireA = fit[payload.code]
        if (!tireA) return
        setSelected(target)
        setRequest({ mode: 'rotate', from: payload.code, to: target, tireA, tireB: fit[target], warnings: warningsFor(tireA, target) })
      }
    },
    [vehicle, state.inventory, slotByCode, warningsFor, dualMismatch],
  )

  const { drag, startDrag, consumedByDrag } = useTireDrag(handleDrop)

  // ── commit a transaction (snapshot for undo) ──────────────────────────
  const commit = (mutate: (draft: BoardState, fitment: Record<string, Tire>) => void) => {
    setHistory((h) => [...h, state])
    const draft: BoardState = {
      vehicles: state.vehicles.map((v) => (v.code === vehicle.code ? { ...v, fitment: { ...v.fitment } } : v)),
      inventory: [...state.inventory],
      removed: [...state.removed],
      transactions: [...state.transactions],
    }
    const target = draft.vehicles.find((v) => v.code === vehicle.code)!
    mutate(draft, target.fitment)
    setState(draft)
  }

  const retire = (draft: BoardState, tire: Tire, from: string, v: ActionValues) => {
    const out = { ...tire, treadMM: v.removedTreadMM, installedOn: undefined }
    if (v.destination === 'stock') draft.inventory.unshift(out)
    else draft.removed.unshift({ tire: out, fromPosition: from, reason: v.reason, destination: v.destination })
  }

  const handleConfirm = (v: ActionValues) => {
    const r = request
    if (!r) return
    const base = { id: txId(), odometerKm: v.odometerKm, date: v.date }
    commit((draft, fit) => {
      if (r.mode === 'install') {
        if (r.replacing) retire(draft, r.replacing, r.position, v)
        fit[r.position] = { ...r.tire, treadMM: v.treadMM, pressurePsi: v.pressurePsi, installedOn: v.date }
        draft.inventory = draft.inventory.filter((x) => x.serialNo !== r.tire.serialNo)
        draft.transactions.unshift({
          ...base,
          type: r.replacing ? 'replace' : 'install',
          position: r.position,
          serialIn: r.tire.serialNo,
          serialOut: r.replacing?.serialNo,
          reason: r.replacing ? v.reason : undefined,
          destination: r.replacing ? v.destination : undefined,
          treadMM: v.treadMM,
          pressurePsi: v.pressurePsi,
        })
      } else if (r.mode === 'remove') {
        retire(draft, r.tire, r.position, v)
        delete fit[r.position]
        draft.transactions.unshift({ ...base, type: 'remove', position: r.position, serialOut: r.tire.serialNo, reason: v.reason, destination: v.destination })
      } else if (r.mode === 'rotate') {
        const a = fit[r.from]
        const b = fit[r.to]
        fit[r.to] = a
        if (b) fit[r.from] = b
        else delete fit[r.from]
        draft.transactions.unshift({ ...base, type: 'rotate', position: r.from, toPosition: r.to, serialIn: a.serialNo, serialOut: b?.serialNo, reason: 'rotation' })
      } else if (r.mode === 'inspect') {
        fit[r.position] = { ...fit[r.position], treadMM: v.treadMM, pressurePsi: v.pressurePsi }
        draft.transactions.unshift({ ...base, type: 'inspect', position: r.position, serialIn: r.tire.serialNo, treadMM: v.treadMM, pressurePsi: v.pressurePsi })
      }
    })
    if (r.mode === 'install') setArmedSerial(null)
    if (r.mode === 'remove') setSelected(null)
    setRequest(null)
  }

  const undo = () => {
    const prev = history[history.length - 1]
    if (!prev) return
    setState(prev)
    setHistory((h) => h.slice(0, -1))
    toast.info(t('tireMap.undone'))
  }

  const post = () => {
    const n = state.transactions.length
    setState((s) => ({ ...s, transactions: [] }))
    setHistory([])
    toast.success(t('tireMap.posted'), t('tireMap.postedMsg').replace('{n}', String(n)))
  }

  // Selecting a position with an armed tire = click-to-install (keyboard/touch friendly).
  const onSelectPosition = (code: string) => {
    if (armedTire && !vehicle.fitment[code]) {
      handleDrop({ source: 'inventory', serialNo: armedTire.serialNo }, code)
      return
    }
    setSelected((cur) => (cur === code ? null : code))
  }

  // ── KPIs ───────────────────────────────────────────────────────────────
  const kpi = useMemo(() => {
    const fitted = slots.filter((s) => s.axleIndex >= 0).map((s) => vehicle.fitment[s.code]).filter(Boolean) as Tire[]
    const axlePositions = slots.filter((s) => s.axleIndex >= 0).length
    const avg = fitted.length ? fitted.reduce((a, x) => a + x.treadMM, 0) / fitted.length : 0
    const attention = fitted.filter((x) => tireHealth(x) !== 'good').length
    const pressure = fitted.filter(pressureAlert).length
    const cpks = fitted.map(costPerKm).filter((x): x is number => x !== null)
    const cpk = cpks.length ? cpks.reduce((a, b) => a + b, 0) / cpks.length : null
    return { fitted: fitted.length, axlePositions, avg, attention, pressure, cpk }
  }, [slots, vehicle])

  const selectedSlot = selected ? slotByCode[selected] ?? null : null
  const diagramProps = {
    config,
    fitment: vehicle.fitment,
    selected,
    drag,
    armed: !!armedTire,
    onSelect: onSelectPosition,
    onStartDrag: startDrag,
    consumedByDrag,
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t(variant === 'bay' ? 'tireMap.bayTitle' : variant === '3d' ? 'tireMap.title3d' : 'tireMap.title')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('tireMap.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={undo}
            disabled={history.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Undo2 className="h-4 w-4" aria-hidden />
            {t('tireMap.undo')}
          </button>
          <button
            type="button"
            onClick={post}
            disabled={state.transactions.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-4 w-4" aria-hidden />
            {t('tireMap.post')}
            {state.transactions.length > 0 && (
              <span className="rounded-full bg-white/25 px-1.5 text-xs tabular-nums">{state.transactions.length}</span>
            )}
          </button>
        </div>
      </div>

      {/* Vehicle bar + KPIs */}
      <div className="grid gap-3 lg:grid-cols-[minmax(260px,1.2fr)_repeat(4,minmax(0,1fr))]">
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-slate-800 text-white">
            <Truck className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <label htmlFor="vehicle" className="sr-only">
              {t('tireMap.vehicle')}
            </label>
            <select
              id="vehicle"
              value={vehicleCode}
              onChange={(e) => {
                setVehicleCode(e.target.value)
                setSelected(null)
                setArmedSerial(null)
              }}
              className="w-full rounded-md border-0 bg-transparent p-0 text-sm font-semibold text-gray-900 focus:ring-0"
            >
              {state.vehicles.map((v) => (
                <option key={v.code} value={v.code}>
                  {v.registrationNo} — {v.code}
                </option>
              ))}
            </select>
            <p className="truncate text-xs text-gray-500">
              {t(`tireMap.configs.${config.labelKey}`)} · {vehicle.odometerKm.toLocaleString('en-US')} km · {vehicle.driverName}
            </p>
          </div>
        </div>
        <Kpi icon={<CircleDot className="h-4 w-4" />} label={t('tireMap.kpi.fitted')} value={`${kpi.fitted} / ${kpi.axlePositions}`} />
        <Kpi icon={<Gauge className="h-4 w-4" />} label={t('tireMap.kpi.avgTread')} value={`${kpi.avg.toFixed(1)} mm`} />
        <Kpi
          icon={<AlertTriangle className="h-4 w-4" />}
          label={t('tireMap.kpi.attention')}
          value={`${kpi.attention} · ${kpi.pressure}`}
          tone={kpi.attention + kpi.pressure > 0 ? 'warn' : 'ok'}
        />
        <Kpi icon={<Coins className="h-4 w-4" />} label={t('tireMap.kpi.cpk')} value={kpi.cpk === null ? '—' : `฿${kpi.cpk.toFixed(3)}`} />
      </div>

      {/* Board */}
      <div className="grid items-start gap-5 xl:grid-cols-[300px_minmax(0,1fr)_320px]">
        <TireInventoryPanel
          inventory={state.inventory}
          vehicleSizes={vehicleSizes}
          armedSerial={armedSerial}
          drag={drag}
          onArm={setArmedSerial}
          onStartDrag={startDrag}
          consumedByDrag={consumedByDrag}
        />

        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          {armedTire && (
            <div className="mb-3 flex items-center justify-between gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800">
              <span>{t('tireMap.armedHint').replace('{serial}', armedTire.serialNo)}</span>
              <button type="button" onClick={() => setArmedSerial(null)} className="font-semibold hover:underline">
                {t('common.cancel')}
              </button>
            </div>
          )}
          {variant === 'bay' ? (
            <div className="overflow-hidden rounded-lg bg-[#272b2f]">
              <AxleDiagramBay {...diagramProps} />
            </div>
          ) : variant === '3d' ? (
            <AxleDiagram3D {...diagramProps} />
          ) : (
            <AxleDiagram {...diagramProps} />
          )}
          <Legend />
        </section>

        <TireDetailPanel
          slot={selectedSlot}
          tire={selected ? vehicle.fitment[selected] : undefined}
          allSlots={slots}
          armedTire={armedTire}
          onInstallArmed={() => armedTire && selected && handleDrop({ source: 'inventory', serialNo: armedTire.serialNo }, selected)}
          onRemove={() => {
            const tire = selected ? vehicle.fitment[selected] : undefined
            if (selected && tire) setRequest({ mode: 'remove', position: selected, tire, warnings: [] })
          }}
          onInspect={() => {
            const tire = selected ? vehicle.fitment[selected] : undefined
            if (selected && tire) setRequest({ mode: 'inspect', position: selected, tire, warnings: [] })
          }}
          onRotateTo={(to) => selected && handleDrop({ source: 'position', code: selected }, to)}
        />
      </div>

      {/* Session log */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <TransactionLog transactions={state.transactions} />
        <RemovedList removed={state.removed} />
      </div>

      <TireActionDialog request={request} odometerKm={vehicle.odometerKm} onConfirm={handleConfirm} onCancel={() => setRequest(null)} />

      {/* drag ghost */}
      {drag && (
        <div
          className="pointer-events-none fixed z-50 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white shadow-xl"
          style={{ left: drag.x, top: drag.y - 18 }}
        >
          <span className="h-3 w-3 rounded-sm" style={{ background: drag.color }} />
          <span className="font-mono">{drag.label}</span>
          {drag.over && <span className="text-slate-300">→ {drag.over === 'inventory' ? t('tireMap.remove') : drag.over}</span>}
        </div>
      )}
    </div>
  )
}

function Kpi({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone?: 'ok' | 'warn' }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
        <span className={tone === 'warn' ? 'text-amber-600' : 'text-gray-400'} aria-hidden>
          {icon}
        </span>
        {label}
      </div>
      <p className={`mt-1 text-lg font-semibold tabular-nums ${tone === 'warn' ? 'text-amber-700' : 'text-gray-900'}`}>{value}</p>
    </div>
  )
}

function Legend() {
  const { t } = useT()
  const items: Array<[string, string]> = [
    [HEALTH_COLOR.good, t('tireMap.legend.good')],
    [HEALTH_COLOR.warning, t('tireMap.legend.warning')],
    [HEALTH_COLOR.critical, t('tireMap.legend.critical')],
  ]
  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-gray-100 pt-3 text-xs text-gray-600">
      {items.map(([c, l]) => (
        <span key={l} className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm" style={{ background: c }} />
          {l}
        </span>
      ))}
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-sm border border-dashed border-gray-400" />
        {t('tireMap.empty')}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-violet-600 text-[8px] font-bold text-white">R</span>
        {t('tireMap.filter.recap')}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500 text-[8px] font-bold text-white">P</span>
        {t('tireMap.legend.pressure')}
      </span>
    </div>
  )
}

function TransactionLog({ transactions }: { transactions: TireTransaction[] }) {
  const { t } = useT()
  return (
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <header className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900">{t('tireMap.log')}</h2>
        <span className="text-xs text-gray-500">{t('tireMap.logHint')}</span>
      </header>
      {transactions.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-gray-500">{t('tireMap.logEmpty')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-2">{t('tireMap.col.action')}</th>
                <th className="px-4 py-2">{t('tireMap.col.position')}</th>
                <th className="px-4 py-2">{t('tireMap.col.tires')}</th>
                <th className="px-4 py-2">{t('tireMap.col.details')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.map((x) => (
                <tr key={x.id} className="align-top">
                  <td className="px-4 py-2.5">
                    <TxBadge type={x.type} />
                    <div className="mt-1 text-[11px] text-gray-400">{x.date}</div>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs font-semibold text-gray-800">
                    {x.position}
                    {x.toPosition && ` → ${x.toPosition}`}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs">
                    {x.serialIn && <div className="text-green-700">+ {x.serialIn}</div>}
                    {x.serialOut && <div className="text-red-600">− {x.serialOut}</div>}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-600">
                    {x.reason && x.type !== 'rotate' && <div>{t(`tireMap.reason.${x.reason}`)}</div>}
                    {x.destination && <div className="text-gray-400">→ {t(`tireMap.dest.${x.destination}`)}</div>}
                    {x.treadMM !== undefined && (
                      <div className="tabular-nums">
                        {x.treadMM} mm · {x.pressurePsi} psi
                      </div>
                    )}
                    <div className="tabular-nums text-gray-400">{x.odometerKm.toLocaleString('en-US')} km</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function TxBadge({ type }: { type: TireTransaction['type'] }) {
  const { t } = useT()
  const cls = {
    install: 'bg-green-50 text-green-700',
    replace: 'bg-blue-50 text-blue-700',
    remove: 'bg-red-50 text-red-700',
    rotate: 'bg-violet-50 text-violet-700',
    inspect: 'bg-gray-100 text-gray-700',
  }[type]
  return <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${cls}`}>{t(`tireMap.tx.${type}`)}</span>
}

function RemovedList({ removed }: { removed: RemovedTire[] }) {
  const { t } = useT()
  return (
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <header className="border-b border-gray-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900">{t('tireMap.removedTitle')}</h2>
      </header>
      {removed.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-gray-500">{t('tireMap.removedEmpty')}</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {removed.map((r, i) => (
            <li key={`${r.tire.serialNo}-${i}`} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div>
                <p className="font-mono text-sm font-semibold text-gray-900">{r.tire.serialNo}</p>
                <p className="text-xs text-gray-500">
                  {r.fromPosition} · {t(`tireMap.reason.${r.reason}`)} · {r.tire.treadMM} mm
                </p>
              </div>
              <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">{t(`tireMap.dest.${r.destination}`)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
