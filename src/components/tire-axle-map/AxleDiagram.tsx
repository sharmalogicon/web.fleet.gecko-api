'use client'

import type { PositionSlot, Tire, VehicleConfig } from '@/types/tire-axle-map'
import { positionsFor, tireHealth, pressureAlert } from '@/types/tire-axle-map'
import type { ActiveDrag, DragPayload } from './useTireDrag'
import { HEALTH_COLOR } from './colors'
import { useT } from '@/i18n/I18nContext'

// ── geometry (SVG user units) ────────────────────────────────────────────
const W = 400
const CX = W / 2
const TW = 24 // tire width  (top-down)
const TH = 50 // tire length (top-down)
const SINGLE_X = 104
const DUAL_OUT_X = 118
const DUAL_IN_X = 90
const RAIL_X = 30

interface Layout {
  axleY: number[]
  frameTop: number
  frameEnd: number
  spareY: number
  height: number
}

function layoutFor(config: VehicleConfig): Layout {
  const axleY: number[] = []
  let y = config.body === 'trailer' ? 250 : 78
  config.axles.forEach((a, i) => {
    if (i > 0) {
      const prev = config.axles[i - 1]
      const groupChange = prev.kind === 'steer' && a.kind !== 'steer'
      y += groupChange ? 190 : 76
    }
    axleY.push(y)
  })
  const frameTop = config.body === 'trailer' ? 22 : 30
  const frameEnd = axleY[axleY.length - 1] + 70
  const spareY = frameEnd + 48
  const height = config.spares > 0 ? spareY + 52 : frameEnd + 30
  return { axleY, frameTop, frameEnd, spareY, height }
}

function slotCenter(slot: PositionSlot, config: VehicleConfig, l: Layout): { x: number; y: number; horizontal: boolean } {
  if (slot.axleIndex < 0) {
    const n = Number(slot.code.slice(2))
    const gap = TH + 16
    const x0 = CX - ((config.spares - 1) * gap) / 2
    return { x: x0 + (n - 1) * gap, y: l.spareY, horizontal: true }
  }
  const off = slot.axle?.dual ? (slot.inner ? DUAL_IN_X : DUAL_OUT_X) : SINGLE_X
  return { x: CX + (slot.side === 'L' ? -off : off), y: l.axleY[slot.axleIndex], horizontal: false }
}

export interface AxleDiagramProps {
  config: VehicleConfig
  fitment: Record<string, Tire>
  selected: string | null
  drag: ActiveDrag | null
  armed: boolean
  onSelect: (code: string) => void
  onStartDrag: (e: { button: number; clientX: number; clientY: number }, payload: DragPayload, label: string, color: string) => void
  consumedByDrag: () => boolean
}

export function AxleDiagram({ config, fitment, selected, drag, armed, onSelect, onStartDrag, consumedByDrag }: AxleDiagramProps) {
  const { t } = useT()
  const l = layoutFor(config)
  const slots = positionsFor(config)
  const dragging = drag !== null
  const dragFrom = drag?.payload.source === 'position' ? drag.payload.code : null

  return (
    <svg
      viewBox={`0 0 ${W} ${l.height}`}
      className="w-full h-auto max-w-[460px] mx-auto select-none"
      role="group"
      aria-label={t('tireMap.diagramLabel')}
    >
      <defs>
        <pattern id="tread" width="6" height="7" patternUnits="userSpaceOnUse">
          <path d="M0 3.5 L3 1 L6 3.5" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="1.2" />
        </pattern>
        <linearGradient id="cab" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#e2e8f0" />
          <stop offset="1" stopColor="#cbd5e1" />
        </linearGradient>
      </defs>

      {/* direction marker */}
      <g fill="#94a3b8" fontSize="9" fontWeight={600} letterSpacing="0.08em">
        <path d={`M${CX - 7} 14 L${CX} 5 L${CX + 7} 14 Z`} />
        <text x={CX + 12} y="13">{t('tireMap.front')}</text>
        <text x="10" y={l.frameTop + 12}>{t('tireMap.left')}</text>
        <text x={W - 10} y={l.frameTop + 12} textAnchor="end">{t('tireMap.right')}</text>
      </g>

      <Body config={config} l={l} />

      {/* axle beams + labels */}
      {config.axles.map((axle, i) => {
        const y = l.axleY[i]
        const half = axle.dual ? DUAL_OUT_X : SINGLE_X
        return (
          <g key={i}>
            <rect x={CX - half} y={y - 4} width={half * 2} height={8} rx={3} fill="#475569" />
            {axle.kind === 'drive' && <rect x={CX - 14} y={y - 11} width={28} height={22} rx={8} fill="#334155" />}
            {axle.kind === 'lift' && (
              <rect x={CX - 40} y={y - 9} width={80} height={18} rx={9} fill="none" stroke="#64748b" strokeDasharray="3 3" />
            )}
            <text x="8" y={y - 2} fontSize="10" fontWeight={700} fill="#334155">{`A${i + 1}`}</text>
            <text x="8" y={y + 10} fontSize="8.5" fill="#64748b">{t(`tireMap.axle.${axle.kind}`)}</text>
          </g>
        )
      })}

      {config.spares > 0 && (
        <text x={CX} y={l.spareY - TW / 2 - 8} textAnchor="middle" fontSize="9" fontWeight={600} fill="#64748b" letterSpacing="0.06em">
          {t('tireMap.spares').toUpperCase()}
        </text>
      )}

      {slots.map((slot) => {
        const c = slotCenter(slot, config, l)
        const tire = fitment[slot.code]
        return (
          <TireSlot
            key={slot.code}
            slot={slot}
            cx={c.x}
            cy={c.y}
            horizontal={c.horizontal}
            tire={tire}
            selected={selected === slot.code}
            isOver={drag?.over === slot.code && dragFrom !== slot.code}
            isDropCandidate={(dragging && dragFrom !== slot.code) || (armed && !tire)}
            isDragSource={dragFrom === slot.code}
            onSelect={() => {
              if (consumedByDrag()) return
              onSelect(slot.code)
            }}
            onPointerDown={(e) => {
              if (!tire) return
              onStartDrag(e, { source: 'position', code: slot.code }, tire.serialNo, HEALTH_COLOR[tireHealth(tire)])
            }}
            ariaLabel={
              tire
                ? `${slot.code}: ${tire.serialNo}, ${tire.treadMM.toFixed(1)} mm`
                : `${slot.code}: ${t('tireMap.empty')}`
            }
          />
        )
      })}
    </svg>
  )
}

function Body({ config, l }: { config: VehicleConfig; l: Layout }) {
  const rails = (
    <>
      <rect x={CX - RAIL_X - 5} y={l.frameTop} width={10} height={l.frameEnd - l.frameTop} rx={2} fill="#94a3b8" />
      <rect x={CX + RAIL_X - 5} y={l.frameTop} width={10} height={l.frameEnd - l.frameTop} rx={2} fill="#94a3b8" />
      {Array.from({ length: Math.floor((l.frameEnd - l.frameTop) / 70) }, (_, i) => (
        <rect key={i} x={CX - RAIL_X} y={l.frameTop + 40 + i * 70} width={RAIL_X * 2} height={5} fill="#a8b4c4" />
      ))}
    </>
  )

  if (config.body === 'trailer') {
    return (
      <g>
        <rect x={CX - 84} y={l.frameTop} width={168} height={l.frameEnd - l.frameTop} rx={6} fill="#f1f5f9" stroke="#cbd5e1" strokeDasharray="6 4" />
        {rails}
        <circle cx={CX} cy={l.frameTop + 34} r={9} fill="#334155" />
        <circle cx={CX} cy={l.frameTop + 34} r={4} fill="#cbd5e1" />
        <rect x={CX - 70} y={l.frameTop + 150} width={14} height={14} rx={2} fill="#64748b" />
        <rect x={CX + 56} y={l.frameTop + 150} width={14} height={14} rx={2} fill="#64748b" />
      </g>
    )
  }

  const cabBottom = l.axleY[0] + 46
  return (
    <g>
      {config.body === 'rigid' && (
        <rect x={CX - 80} y={cabBottom + 8} width={160} height={l.frameEnd - cabBottom - 8} rx={4} fill="#f1f5f9" stroke="#cbd5e1" strokeDasharray="6 4" />
      )}
      {rails}
      {/* cab, top-down */}
      <rect x={CX - 78} y={22} width={156} height={cabBottom - 22} rx={14} fill="url(#cab)" stroke="#94a3b8" />
      <path d={`M${CX - 66} 34 Q${CX} 26 ${CX + 66} 34 L${CX + 60} 50 Q${CX} 44 ${CX - 60} 50 Z`} fill="#93c5fd" opacity={0.7} />
      <rect x={CX - 86} y={44} width={8} height={14} rx={2} fill="#94a3b8" />
      <rect x={CX + 78} y={44} width={8} height={14} rx={2} fill="#94a3b8" />
      {config.body === 'tractor' && (() => {
        const ys = l.axleY.slice(1)
        const fy = ys.length ? (ys[0] + ys[ys.length - 1]) / 2 : l.frameEnd - 60
        return (
          <g>
            <circle cx={CX} cy={fy} r={30} fill="#e2e8f0" stroke="#64748b" strokeWidth={2} />
            <path d={`M${CX - 5} ${fy + 30} L${CX - 3} ${fy} L${CX + 3} ${fy} L${CX + 5} ${fy + 30} Z`} fill="#64748b" />
          </g>
        )
      })()}
    </g>
  )
}

interface SlotProps {
  slot: PositionSlot
  cx: number
  cy: number
  horizontal: boolean
  tire?: Tire
  selected: boolean
  isOver: boolean
  isDropCandidate: boolean
  isDragSource: boolean
  onSelect: () => void
  onPointerDown: (e: React.PointerEvent) => void
  ariaLabel: string
}

function TireSlot({ slot, cx, cy, horizontal, tire, selected, isOver, isDropCandidate, isDragSource, onSelect, onPointerDown, ariaLabel }: SlotProps) {
  const w = horizontal ? TH : TW
  const h = horizontal ? TW : TH
  const x = cx - w / 2
  const y = cy - h / 2
  const health = tire ? tireHealth(tire) : null
  const fill = health ? HEALTH_COLOR[health] : '#ffffff'
  const pAlert = tire ? pressureAlert(tire) : false

  return (
    <g
      data-drop-target={slot.code}
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-pressed={selected}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      onPointerDown={onPointerDown}
      className="outline-none focus-visible:[&>.focus-ring]:opacity-100"
      style={{ cursor: tire ? 'grab' : 'pointer', touchAction: 'none', opacity: isDragSource ? 0.35 : 1 }}
    >
      {/* generous invisible hit area */}
      <rect x={x - 6} y={y - 6} width={w + 12} height={h + 12} fill="transparent" />
      <rect className="focus-ring" x={x - 5} y={y - 5} width={w + 10} height={h + 10} rx={9} fill="none" stroke="#2563eb" strokeWidth={2} strokeDasharray="3 2" opacity={0} />
      {isDropCandidate && !isOver && (
        <rect x={x - 4} y={y - 4} width={w + 8} height={h + 8} rx={8} fill="none" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="4 3">
          <animate attributeName="stroke-dashoffset" from="0" to="14" dur="0.8s" repeatCount="indefinite" />
        </rect>
      )}
      {isOver && <rect x={x - 5} y={y - 5} width={w + 10} height={h + 10} rx={9} fill="rgba(34,197,94,0.18)" stroke="#16a34a" strokeWidth={2.5} />}
      {selected && <rect x={x - 5} y={y - 5} width={w + 10} height={h + 10} rx={9} fill="none" stroke="#1d4ed8" strokeWidth={2.5} />}

      {tire ? (
        <>
          <rect x={x} y={y} width={w} height={h} rx={6} fill={fill} stroke="#1e293b" strokeOpacity={0.35} />
          <rect x={x + 2} y={y + 2} width={w - 4} height={h - 4} rx={4} fill="url(#tread)" />
          <text
            x={cx}
            y={cy}
            fill="#fff"
            fontSize="9.5"
            fontWeight={700}
            textAnchor="middle"
            dominantBaseline="central"
            transform={horizontal ? undefined : `rotate(-90 ${cx} ${cy})`}
            style={{ pointerEvents: 'none' }}
          >
            {tire.treadMM.toFixed(1)}
          </text>
          {tire.type === 'recap' && (
            <g style={{ pointerEvents: 'none' }}>
              <circle cx={x + 4} cy={y + 4} r={5.5} fill="#7c3aed" stroke="#fff" strokeWidth={1} />
              <text x={x + 4} y={y + 4} fontSize="7" fontWeight={700} fill="#fff" textAnchor="middle" dominantBaseline="central">R</text>
            </g>
          )}
          {pAlert && (
            <g style={{ pointerEvents: 'none' }}>
              <circle cx={x + w - 3} cy={y + 3} r={6} fill="#f59e0b" stroke="#fff" strokeWidth={1} />
              <text x={x + w - 3} y={y + 3} fontSize="7.5" fontWeight={800} fill="#fff" textAnchor="middle" dominantBaseline="central">P</text>
            </g>
          )}
        </>
      ) : (
        <>
          <rect x={x} y={y} width={w} height={h} rx={6} fill="#f8fafc" stroke="#94a3b8" strokeDasharray="4 3" />
          <text x={cx} y={cy} fontSize="14" fill="#94a3b8" textAnchor="middle" dominantBaseline="central">+</text>
        </>
      )}
      <text
        x={cx}
        y={horizontal ? y + h + 11 : y + h + 12}
        fontSize="8.5"
        fontWeight={600}
        fill={selected ? '#1d4ed8' : '#475569'}
        textAnchor="middle"
        style={{ pointerEvents: 'none' }}
      >
        {slot.code}
      </text>
    </g>
  )
}
