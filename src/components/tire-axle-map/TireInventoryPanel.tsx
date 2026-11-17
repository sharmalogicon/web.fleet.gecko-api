'use client'

import { useMemo, useState } from 'react'
import { GripVertical, Search, PackageOpen } from 'lucide-react'
import type { Tire, TireType } from '@/types/tire-axle-map'
import { tireHealth } from '@/types/tire-axle-map'
import type { ActiveDrag, DragPayload } from './useTireDrag'
import { HEALTH_COLOR } from './colors'
import { TreadBar } from './TreadBar'
import { useT } from '@/i18n/I18nContext'

interface Props {
  inventory: Tire[]
  vehicleSizes: string[]
  armedSerial: string | null
  drag: ActiveDrag | null
  onArm: (serialNo: string | null) => void
  onStartDrag: (e: { button: number; clientX: number; clientY: number }, payload: DragPayload, label: string, color: string) => void
  consumedByDrag: () => boolean
}

type TypeFilter = 'all' | TireType

export function TireInventoryPanel({ inventory, vehicleSizes, armedSerial, drag, onArm, onStartDrag, consumedByDrag }: Props) {
  const { t } = useT()
  const [query, setQuery] = useState('')
  const [type, setType] = useState<TypeFilter>('all')
  const [fitsOnly, setFitsOnly] = useState(true)

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return inventory.filter(
      (tire) =>
        (type === 'all' || tire.type === type) &&
        (!fitsOnly || vehicleSizes.includes(tire.size)) &&
        (!q || `${tire.serialNo} ${tire.brand} ${tire.model} ${tire.size}`.toLowerCase().includes(q)),
    )
  }, [inventory, query, type, fitsOnly, vehicleSizes])

  const draggingFitted = drag?.payload.source === 'position'
  const overMe = draggingFitted && drag?.over === 'inventory'

  return (
    <section
      data-drop-target="inventory"
      aria-label={t('tireMap.inventory')}
      className={`flex flex-col rounded-xl border bg-white shadow-sm transition-colors ${
        overMe ? 'border-red-400 bg-red-50/60' : draggingFitted ? 'border-red-300 border-dashed' : 'border-gray-200'
      }`}
    >
      <header className="border-b border-gray-100 p-4 pb-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">{t('tireMap.inventory')}</h2>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{rows.length}</span>
        </div>
        <p className="mt-0.5 text-xs text-gray-500">{t('tireMap.inventoryHint')}</p>
        <label className="relative mt-3 block">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('tireMap.searchPlaceholder')}
            aria-label={t('tireMap.searchPlaceholder')}
            className="w-full rounded-lg border border-gray-300 py-1.5 pl-8 pr-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </label>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {(['all', 'new', 'recap'] as TypeFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setType(f)}
              aria-pressed={type === f}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                type === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t(`tireMap.filter.${f}`)}
            </button>
          ))}
          <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-xs text-gray-600">
            <input type="checkbox" checked={fitsOnly} onChange={(e) => setFitsOnly(e.target.checked)} className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600" />
            {t('tireMap.fitsOnly')}
          </label>
        </div>
      </header>

      {draggingFitted && (
        <div className="mx-4 mt-3 rounded-lg border border-dashed border-red-300 bg-red-50 px-3 py-2 text-center text-xs font-medium text-red-700">
          {t('tireMap.dropToRemove')}
        </div>
      )}

      <ul className="flex max-h-[560px] flex-col gap-2 overflow-y-auto p-4">
        {rows.length === 0 && (
          <li className="flex flex-col items-center gap-2 py-8 text-center text-sm text-gray-500">
            <PackageOpen className="h-6 w-6 text-gray-300" aria-hidden />
            {t('tireMap.noStock')}
          </li>
        )}
        {rows.map((tire) => {
          const armed = armedSerial === tire.serialNo
          const isSource = drag?.payload.source === 'inventory' && drag.payload.serialNo === tire.serialNo
          const color = HEALTH_COLOR[tireHealth(tire)]
          return (
            <li key={tire.serialNo}>
              <div
                role="button"
                tabIndex={0}
                aria-pressed={armed}
                onPointerDown={(e) => {
                  // Touch users drag from the grip so the list can still scroll.
                  if (e.pointerType !== 'mouse' && !(e.target as Element).closest('[data-grip]')) return
                  onStartDrag(e, { source: 'inventory', serialNo: tire.serialNo }, tire.serialNo, color)
                }}
                onClick={() => {
                  if (consumedByDrag()) return
                  onArm(armed ? null : tire.serialNo)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onArm(armed ? null : tire.serialNo)
                  }
                }}
                className={`group flex cursor-grab items-stretch gap-2 rounded-lg border p-2.5 text-left transition-all active:cursor-grabbing ${
                  armed
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                } ${isSource ? 'opacity-40' : ''}`}
              >
                <span data-grip className="flex touch-none items-center text-gray-300 group-hover:text-gray-500" aria-hidden>
                  <GripVertical className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-semibold text-gray-900">{tire.serialNo}</span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        tire.type === 'recap' ? 'bg-violet-100 text-violet-700' : 'bg-sky-100 text-sky-700'
                      }`}
                    >
                      {tire.type === 'recap' ? `${t('tireMap.filter.recap')} ×${tire.recapCount}` : t('tireMap.filter.new')}
                    </span>
                  </div>
                  <div className="truncate text-xs text-gray-500">
                    {tire.brand} {tire.model} · {tire.size}
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <TreadBar tire={tire} />
                    <span className="whitespace-nowrap text-[11px] font-medium tabular-nums text-gray-600">{tire.treadMM.toFixed(1)} mm</span>
                  </div>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
