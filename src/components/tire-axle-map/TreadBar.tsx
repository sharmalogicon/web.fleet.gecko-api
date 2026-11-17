import type { Tire } from '@/types/tire-axle-map'
import { tireHealth, TREAD_CRITICAL_MM, TREAD_WARNING_MM } from '@/types/tire-axle-map'
import { HEALTH_COLOR } from './colors'

/** Remaining-tread bar with critical / warning threshold ticks. */
export function TreadBar({ tire, showTicks = false }: { tire: Tire; showTicks?: boolean }) {
  const max = Math.max(tire.originalTreadMM, tire.treadMM)
  const pct = Math.min(100, (tire.treadMM / max) * 100)
  return (
    <div className="relative h-1.5 w-full rounded-full bg-gray-100">
      <div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{ width: `${pct}%`, background: HEALTH_COLOR[tireHealth(tire)] }}
      />
      {showTicks &&
        [TREAD_CRITICAL_MM, TREAD_WARNING_MM].map((mm) => (
          <div key={mm} className="absolute -top-0.5 h-2.5 w-px bg-gray-400" style={{ left: `${(mm / max) * 100}%` }} />
        ))}
    </div>
  )
}
