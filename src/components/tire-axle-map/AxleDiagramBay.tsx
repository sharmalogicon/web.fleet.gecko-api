'use client'

/**
 * "Workshop bay" rendering of the axle map: an illustrated top-down truck
 * parked on a painted bay floor. Tires are drawn as rubber; their health is a
 * coloured under-glow on the floor plus a hang tag carrying code and tread.
 * Same props / behaviour as <AxleDiagram>, so the two are interchangeable.
 */

import type { PositionSlot, Tire, VehicleConfig } from '@/types/tire-axle-map'
import { positionsFor, tireHealth, pressureAlert } from '@/types/tire-axle-map'
import type { AxleDiagramProps } from './AxleDiagram'
import { HEALTH_COLOR } from './colors'
import { useT } from '@/i18n/I18nContext'

const W = 440
const CX = W / 2
const TW = 26
const TH = 54
const SINGLE_X = 106
const DUAL_OUT_X = 120
const DUAL_IN_X = 91
const RAIL_X = 30
const TAG_W = 58
const TAG_H = 24
const TAG_MARGIN = 14
const PAINT = '#e3b505'
const FONT = '"Bahnschrift", "DIN Alternate", "Arial Narrow", system-ui, sans-serif'

interface Layout {
  axleY: number[]
  frameTop: number
  frameEnd: number
  spareY: number
  stencilY: number
  height: number
}

function layoutFor(config: VehicleConfig): Layout {
  const axleY: number[] = []
  let y = config.body === 'trailer' ? 300 : 116
  config.axles.forEach((a, i) => {
    if (i > 0) y += config.axles[i - 1].kind === 'steer' && a.kind !== 'steer' ? 200 : 82
    axleY.push(y)
  })
  const frameTop = config.body === 'trailer' ? 40 : 52
  const frameEnd = axleY[axleY.length - 1] + 84
  const spareY = frameEnd + 62
  const stencilY = (config.spares > 0 ? spareY + 92 : frameEnd + 64)
  return { axleY, frameTop, frameEnd, spareY, stencilY, height: stencilY + 26 }
}

interface Placed {
  slot: PositionSlot
  cx: number
  cy: number
  horizontal: boolean
  tag: { x: number; y: number; anchorX: number; anchorY: number }
}

function place(slot: PositionSlot, config: VehicleConfig, l: Layout): Placed {
  if (slot.axleIndex < 0) {
    const n = Number(slot.code.slice(2))
    const gap = TH + 40
    const x = CX - ((config.spares - 1) * gap) / 2 + (n - 1) * gap
    const y = l.spareY
    return {
      slot, cx: x, cy: y, horizontal: true,
      tag: { x: x - TAG_W / 2, y: y + TW / 2 + 12, anchorX: x, anchorY: y + TW / 2 },
    }
  }
  const dual = !!slot.axle?.dual
  const off = dual ? (slot.inner ? DUAL_IN_X : DUAL_OUT_X) : SINGLE_X
  const left = slot.side === 'L'
  const cx = CX + (left ? -off : off)
  const cy = l.axleY[slot.axleIndex]
  const outerEdge = CX + (left ? -1 : 1) * ((dual ? DUAL_OUT_X : SINGLE_X) + TW / 2)
  const tagY = cy + (dual ? (slot.inner ? 15 : -15) : 0) - TAG_H / 2
  const tagX = left ? outerEdge - TAG_MARGIN - TAG_W : outerEdge + TAG_MARGIN
  return {
    slot, cx, cy, horizontal: false,
    tag: { x: tagX, y: tagY, anchorX: cx + (left ? -TW / 2 : TW / 2), anchorY: cy + (dual ? (slot.inner ? 10 : -10) : 0) },
  }
}

export function AxleDiagramBay({ config, fitment, selected, drag, armed, onSelect, onStartDrag, consumedByDrag }: AxleDiagramProps) {
  const { t } = useT()
  const l = layoutFor(config)
  const placed = positionsFor(config).map((s) => place(s, config, l))
  const dragFrom = drag?.payload.source === 'position' ? drag.payload.code : null

  return (
    <svg
      viewBox={`0 0 ${W} ${l.height}`}
      className="bay mx-auto block h-auto w-full max-w-[520px] select-none"
      role="group"
      aria-label={t('tireMap.diagramLabel')}
      style={{ fontFamily: FONT }}
    >
      <style>{`
        .bay .slot { cursor: pointer; outline: none; }
        .bay .slot.has-tire { cursor: grab; }
        .bay .slot .rubber { transition: filter .15s ease; }
        .bay .slot:hover .rubber { filter: brightness(1.45); }
        .bay .slot .focus { opacity: 0; }
        .bay .slot:focus-visible .focus { opacity: 1; }
        .bay .candidate { animation: bay-march .9s linear infinite; }
        @keyframes bay-march { to { stroke-dashoffset: -16; } }
        @media (prefers-reduced-motion: no-preference) {
          .bay .glow-critical { animation: bay-pulse 1.8s ease-in-out infinite; }
        }
        @keyframes bay-pulse { 50% { opacity: .35; } }
        @media (prefers-reduced-motion: reduce) { .bay .candidate { animation: none; } }
      `}</style>

      <defs>
        <radialGradient id="bay-floor" cx="50%" cy="40%" r="75%">
          <stop offset="0" stopColor="#4b5157" />
          <stop offset="1" stopColor="#272b2f" />
        </radialGradient>
        <pattern id="bay-speckle" width="46" height="46" patternUnits="userSpaceOnUse">
          <circle cx="7" cy="9" r="0.9" fill="rgba(255,255,255,.06)" />
          <circle cx="31" cy="17" r="0.7" fill="rgba(0,0,0,.25)" />
          <circle cx="19" cy="38" r="1" fill="rgba(255,255,255,.05)" />
          <circle cx="41" cy="33" r="0.6" fill="rgba(255,255,255,.07)" />
        </pattern>
        <pattern id="bay-tread" width="26" height="8" patternUnits="userSpaceOnUse">
          <rect width="26" height="8" fill="#1b1e21" />
          <path d="M3 1h7l-2 3h-7z M16 1h7l2 3h-7z M3 5h7l-2 2.6h-7z M16 5h7l2 2.6h-7z" fill="#30353a" />
        </pattern>
        <pattern id="bay-tread-h" width="8" height="26" patternUnits="userSpaceOnUse">
          <rect width="8" height="26" fill="#1b1e21" />
          <path d="M1 3v7l3-2v-7z M1 16v7l3 2v-7z M5 3v7l2.6-2v-7z M5 16v7l2.6 2v-7z" fill="#30353a" />
        </pattern>
        <linearGradient id="bay-round" x1="0" x2="1">
          <stop offset="0" stopColor="#000" stopOpacity=".55" />
          <stop offset=".22" stopColor="#000" stopOpacity="0" />
          <stop offset=".5" stopColor="#fff" stopOpacity=".07" />
          <stop offset=".78" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".55" />
        </linearGradient>
        <linearGradient id="bay-round-h" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity=".55" />
          <stop offset=".22" stopColor="#000" stopOpacity="0" />
          <stop offset=".5" stopColor="#fff" stopOpacity=".07" />
          <stop offset=".78" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".55" />
        </linearGradient>
        <linearGradient id="bay-steel" x1="0" x2="1">
          <stop offset="0" stopColor="#5b636b" />
          <stop offset=".5" stopColor="#8a939c" />
          <stop offset="1" stopColor="#4a5158" />
        </linearGradient>
        <linearGradient id="bay-beam" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#7b848d" />
          <stop offset=".5" stopColor="#a3acb4" />
          <stop offset="1" stopColor="#5b636b" />
        </linearGradient>
        <linearGradient id="bay-paint" x1="0" x2="1">
          <stop offset="0" stopColor="#dfe4e8" />
          <stop offset=".5" stopColor="#ffffff" />
          <stop offset="1" stopColor="#d3d9de" />
        </linearGradient>
        <linearGradient id="bay-glass" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#1e3a5f" />
          <stop offset="1" stopColor="#3d6d9e" />
        </linearGradient>
        <radialGradient id="bay-fifth" cx="45%" cy="40%" r="65%">
          <stop offset="0" stopColor="#6b737b" />
          <stop offset="1" stopColor="#2f3438" />
        </radialGradient>
        <filter id="bay-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="7" stdDeviation="6" floodColor="#000" floodOpacity=".5" />
        </filter>
        <filter id="bay-soft" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#000" floodOpacity=".55" />
        </filter>
        <filter id="bay-glow" x="-80%" y="-60%" width="260%" height="220%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>

      <Floor l={l} t={t} />

      {/* leaders under everything vehicle-related */}
      {placed.map((p) => (
        <path
          key={`lead-${p.slot.code}`}
          d={leaderPath(p)}
          fill="none"
          stroke="rgba(255,255,255,.35)"
          strokeWidth={1}
          strokeDasharray={fitment[p.slot.code] ? undefined : '2 2'}
        />
      ))}

      {/* health under-glow on the floor */}
      {placed.map((p) => {
        const tire = fitment[p.slot.code]
        if (!tire) return null
        const h = tireHealth(tire)
        const w = p.horizontal ? TH : TW
        const hh = p.horizontal ? TW : TH
        return (
          <rect
            key={`glow-${p.slot.code}`}
            className={h === 'critical' ? 'glow-critical' : undefined}
            x={p.cx - w / 2 - 3}
            y={p.cy - hh / 2 - 3}
            width={w + 6}
            height={hh + 6}
            rx={10}
            fill={HEALTH_COLOR[h]}
            opacity={0.85}
            filter="url(#bay-glow)"
          />
        )
      })}

      <Chassis config={config} l={l} />

      {placed.map((p) => {
        const tire = fitment[p.slot.code]
        return (
          <BaySlot
            key={p.slot.code}
            p={p}
            tire={tire}
            selected={selected === p.slot.code}
            isOver={drag?.over === p.slot.code && dragFrom !== p.slot.code}
            isCandidate={(drag !== null && dragFrom !== p.slot.code) || (armed && !tire)}
            isSource={dragFrom === p.slot.code}
            emptyLabel={t('tireMap.empty')}
            onSelect={() => {
              if (consumedByDrag()) return
              onSelect(p.slot.code)
            }}
            onPointerDown={(e) => {
              if (!tire) return
              onStartDrag(e, { source: 'position', code: p.slot.code }, tire.serialNo, HEALTH_COLOR[tireHealth(tire)])
            }}
          />
        )
      })}
    </svg>
  )
}

function leaderPath(p: Placed): string {
  const { tag } = p
  if (p.horizontal) return `M${tag.anchorX} ${tag.anchorY} V${tag.y}`
  const left = tag.x < p.cx
  const tx = left ? tag.x + TAG_W : tag.x
  const ty = tag.y + TAG_H / 2
  const mid = left ? tx + 6 : tx - 6
  return `M${tx} ${ty} H${mid} L${tag.anchorX} ${tag.anchorY}`
}

// ── floor, paint & stencil ────────────────────────────────────────────────
function Floor({ l, t }: { l: Layout; t: (k: string) => string }) {
  const joints = Array.from({ length: Math.floor(l.height / 190) }, (_, i) => 190 * (i + 1))
  return (
    <g aria-hidden>
      <rect width={W} height={l.height} fill="url(#bay-floor)" />
      <rect width={W} height={l.height} fill="url(#bay-speckle)" />
      {joints.map((y) => (
        <line key={y} x1={0} x2={W} y1={y} y2={y} stroke="rgba(0,0,0,.28)" strokeWidth={1.2} />
      ))}
      <line x1={W / 2} x2={W / 2} y1={0} y2={l.height} stroke="rgba(0,0,0,.16)" strokeWidth={1} />
      {/* bay lines */}
      <rect x={6} y={0} width={5} height={l.height} fill={PAINT} opacity={0.8} />
      <rect x={W - 11} y={0} width={5} height={l.height} fill={PAINT} opacity={0.8} />
      {/* painted direction chevrons */}
      <g fill={PAINT} opacity={0.75}>
        <path d={`M${CX - 16} 26 L${CX} 12 L${CX + 16} 26 L${CX + 16} 32 L${CX} 18 L${CX - 16} 32 Z`} />
      </g>
      <text x={CX + 26} y={27} fill={PAINT} opacity={0.8} fontSize={11} fontWeight={600} letterSpacing="0.12em">
        {t('tireMap.front')}
      </text>
      <text x={24} y={30} fill="rgba(255,255,255,.55)" fontSize={12} fontWeight={600}>{t('tireMap.left')}</text>
      <text x={W - 24} y={30} fill="rgba(255,255,255,.55)" fontSize={12} fontWeight={600} textAnchor="end">{t('tireMap.right')}</text>
      <text x={CX} y={l.stencilY} fill={PAINT} opacity={0.32} fontSize={34} fontWeight={700} textAnchor="middle" letterSpacing="0.18em">
        BAY 03
      </text>
    </g>
  )
}

// ── the vehicle ───────────────────────────────────────────────────────────
function Chassis({ config, l }: { config: VehicleConfig; l: Layout }) {
  const rails = (
    <g filter="url(#bay-soft)">
      <rect x={CX - RAIL_X - 6} y={l.frameTop} width={12} height={l.frameEnd - l.frameTop} rx={2} fill="url(#bay-steel)" />
      <rect x={CX + RAIL_X - 6} y={l.frameTop} width={12} height={l.frameEnd - l.frameTop} rx={2} fill="url(#bay-steel)" />
      {Array.from({ length: Math.floor((l.frameEnd - l.frameTop - 30) / 64) }, (_, i) => (
        <rect key={i} x={CX - RAIL_X} y={l.frameTop + 34 + i * 64} width={RAIL_X * 2} height={6} fill="#5b636b" />
      ))}
    </g>
  )

  const axles = (
    <g>
      {config.axles.map((axle, i) => {
        const y = l.axleY[i]
        const half = axle.dual ? DUAL_OUT_X : SINGLE_X
        return (
          <g key={i} filter="url(#bay-soft)">
            <rect x={CX - half + 8} y={y - 5} width={(half - 8) * 2} height={10} rx={4} fill="url(#bay-beam)" />
            {axle.kind === 'drive' && (
              <>
                <ellipse cx={CX} cy={y} rx={19} ry={16} fill="#3a4046" />
                <ellipse cx={CX} cy={y - 2} rx={11} ry={9} fill="#535a61" />
                <rect x={CX - 4} y={y - 40} width={8} height={30} rx={3} fill="#4a5158" />
              </>
            )}
            {axle.kind === 'lift' && (
              <>
                <rect x={CX - 52} y={y - 12} width={26} height={24} rx={11} fill="#2f3438" stroke="#596068" />
                <rect x={CX + 26} y={y - 12} width={26} height={24} rx={11} fill="#2f3438" stroke="#596068" />
              </>
            )}
          </g>
        )
      })}
    </g>
  )

  if (config.body === 'trailer') {
    const top = l.frameTop
    return (
      <g aria-hidden>
        {/* gooseneck & outer beams of a container chassis */}
        <g filter="url(#bay-shadow)">
          <path
            d={`M${CX - 46} ${top} H${CX + 46} V${top + 70} L${CX + 78} ${top + 96} V${l.frameEnd} H${CX - 78} V${top + 96} L${CX - 46} ${top + 70} Z`}
            fill="none"
            stroke="url(#bay-steel)"
            strokeWidth={9}
            strokeLinejoin="round"
          />
        </g>
        {rails}
        {/* landing gear */}
        <rect x={CX - 66} y={top + 150} width={16} height={16} rx={2} fill="#3a4046" stroke="#6b737b" />
        <rect x={CX + 50} y={top + 150} width={16} height={16} rx={2} fill="#3a4046" stroke="#6b737b" />
        <rect x={CX - 50} y={top + 156} width={100} height={4} fill="#4a5158" />
        {/* kingpin */}
        <circle cx={CX} cy={top + 30} r={10} fill="#2f3438" stroke="#7b848d" strokeWidth={2} />
        <circle cx={CX} cy={top + 30} r={3.5} fill="#a3acb4" />
        {/* twist-locks */}
        {[[CX - 46, top + 4], [CX + 46, top + 4], [CX - 78, l.frameEnd - 4], [CX + 78, l.frameEnd - 4]].map(([x, y], i) => (
          <rect key={i} x={x - 6} y={y - 6} width={12} height={12} rx={2} fill={PAINT} stroke="#8a6d00" />
        ))}
        {axles}
      </g>
    )
  }

  const cabTop = 40
  const cabBottom = l.axleY[0] + 58
  const cabW = 84
  const ys = l.axleY.slice(1)
  const fifthY = ys.length ? (ys[0] + ys[ys.length - 1]) / 2 : l.frameEnd - 60

  return (
    <g aria-hidden>
      {rails}
      {axles}

      {config.body === 'rigid' && (
        <g filter="url(#bay-shadow)">
          <rect x={CX - 72} y={cabBottom + 12} width={144} height={l.frameEnd - cabBottom - 14} rx={4} fill="#d4d9de" />
          {Array.from({ length: Math.floor((l.frameEnd - cabBottom - 24) / 12) }, (_, i) => (
            <line key={i} x1={CX - 68} x2={CX + 68} y1={cabBottom + 22 + i * 12} y2={cabBottom + 22 + i * 12} stroke="#bcc3c9" strokeWidth={1.5} />
          ))}
          <rect x={CX - 72} y={cabBottom + 12} width={144} height={l.frameEnd - cabBottom - 14} rx={4} fill="none" stroke="#aab2b9" />
          <rect x={CX - 72} y={cabBottom + 12} width={4} height={l.frameEnd - cabBottom - 14} fill="#2563eb" />
          <rect x={CX + 68} y={cabBottom + 12} width={4} height={l.frameEnd - cabBottom - 14} fill="#2563eb" />
        </g>
      )}

      {config.body === 'tractor' && (
        <g filter="url(#bay-soft)">
          <circle cx={CX} cy={fifthY} r={36} fill="url(#bay-fifth)" stroke="#1f2326" strokeWidth={2} />
          <path d={`M${CX - 9} ${fifthY + 36} L${CX - 6} ${fifthY - 2} Q${CX} ${fifthY - 10} ${CX + 6} ${fifthY - 2} L${CX + 9} ${fifthY + 36} Z`} fill="#1b1e21" />
          <ellipse cx={CX - 12} cy={fifthY - 14} rx={14} ry={7} fill="rgba(255,255,255,.12)" />
        </g>
      )}

      {/* mirrors */}
      <g stroke="#3a4046" strokeWidth={3} strokeLinecap="round">
        <line x1={CX - cabW + 4} y1={cabTop + 30} x2={CX - cabW - 16} y2={cabTop + 22} />
        <line x1={CX + cabW - 4} y1={cabTop + 30} x2={CX + cabW + 16} y2={cabTop + 22} />
      </g>
      <rect x={CX - cabW - 24} y={cabTop + 12} width={10} height={18} rx={3} fill="#2f3438" />
      <rect x={CX + cabW + 14} y={cabTop + 12} width={10} height={18} rx={3} fill="#2f3438" />

      {/* cab body */}
      <g filter="url(#bay-shadow)">
        <path
          d={`M${CX - cabW} ${cabTop + 26} Q${CX - cabW} ${cabTop} ${CX - cabW + 26} ${cabTop} H${CX + cabW - 26} Q${CX + cabW} ${cabTop} ${CX + cabW} ${cabTop + 26} V${cabBottom - 8} Q${CX + cabW} ${cabBottom} ${CX + cabW - 8} ${cabBottom} H${CX - cabW + 8} Q${CX - cabW} ${cabBottom} ${CX - cabW} ${cabBottom - 8} Z`}
          fill="url(#bay-paint)"
        />
      </g>
      {/* windscreen */}
      <path d={`M${CX - cabW + 10} ${cabTop + 16} Q${CX} ${cabTop + 2} ${CX + cabW - 10} ${cabTop + 16} L${CX + cabW - 16} ${cabTop + 30} Q${CX} ${cabTop + 20} ${CX - cabW + 16} ${cabTop + 30} Z`} fill="url(#bay-glass)" />
      {/* roof deflector */}
      <path d={`M${CX - 58} ${cabTop + 40} H${CX + 58} L${CX + 50} ${cabBottom - 16} H${CX - 50} Z`} fill="#eef1f4" stroke="#c7ced4" />
      <path d={`M${CX - 40} ${cabTop + 52} H${CX + 40}`} stroke="#d5dbe0" strokeWidth={6} strokeLinecap="round" />
      {/* marker lights */}
      {[-36, -18, 0, 18, 36].map((dx) => (
        <rect key={dx} x={CX + dx - 4} y={cabTop + 34} width={8} height={3} rx={1.5} fill="#f59e0b" />
      ))}
      {/* livery */}
      <rect x={CX - cabW} y={cabTop + 34} width={5} height={cabBottom - cabTop - 46} fill="#2563eb" />
      <rect x={CX + cabW - 5} y={cabTop + 34} width={5} height={cabBottom - cabTop - 46} fill="#2563eb" />
    </g>
  )
}

// ── a single tire position ────────────────────────────────────────────────
interface SlotProps {
  p: Placed
  tire?: Tire
  selected: boolean
  isOver: boolean
  isCandidate: boolean
  isSource: boolean
  emptyLabel: string
  onSelect: () => void
  onPointerDown: (e: React.PointerEvent) => void
}

function BaySlot({ p, tire, selected, isOver, isCandidate, isSource, emptyLabel, onSelect, onPointerDown }: SlotProps) {
  const w = p.horizontal ? TH : TW
  const h = p.horizontal ? TW : TH
  const x = p.cx - w / 2
  const y = p.cy - h / 2
  const health = tire ? tireHealth(tire) : null
  const pAlert = tire ? pressureAlert(tire) : false
  const label = tire ? `${p.slot.code}: ${tire.serialNo}, ${tire.treadMM.toFixed(1)} mm` : `${p.slot.code}: ${emptyLabel}`

  return (
    <g
      className={`slot${tire ? ' has-tire' : ''}`}
      data-drop-target={p.slot.code}
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-pressed={selected}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      onPointerDown={onPointerDown}
      style={{ touchAction: 'none', opacity: isSource ? 0.3 : 1 }}
    >
      <rect x={x - 8} y={y - 8} width={w + 16} height={h + 16} fill="transparent" />

      {tire ? (
        <g className="rubber" filter="url(#bay-soft)">
          <rect x={x} y={y} width={w} height={h} rx={7} fill={p.horizontal ? 'url(#bay-tread-h)' : 'url(#bay-tread)'} />
          <rect x={x} y={y} width={w} height={h} rx={7} fill={p.horizontal ? 'url(#bay-round-h)' : 'url(#bay-round)'} />
          <rect x={x + 0.5} y={y + 0.5} width={w - 1} height={h - 1} rx={6.5} fill="none" stroke="#0c0e10" />
        </g>
      ) : (
        <g>
          <rect x={x} y={y} width={w} height={h} rx={7} fill="rgba(255,255,255,.04)" stroke="rgba(255,255,255,.55)" strokeWidth={1.4} strokeDasharray="5 4" />
          <path d={`M${p.cx - 5} ${p.cy} H${p.cx + 5} M${p.cx} ${p.cy - 5} V${p.cy + 5}`} stroke="rgba(255,255,255,.6)" strokeWidth={1.6} strokeLinecap="round" />
        </g>
      )}

      {isCandidate && !isOver && (
        <rect className="candidate" x={x - 5} y={y - 5} width={w + 10} height={h + 10} rx={10} fill="none" stroke={PAINT} strokeWidth={2} strokeDasharray="6 4" />
      )}
      {isOver && <rect x={x - 6} y={y - 6} width={w + 12} height={h + 12} rx={11} fill="rgba(227,181,5,.28)" stroke={PAINT} strokeWidth={2.5} />}

      <Brackets x={x - 7} y={y - 7} w={w + 14} h={h + 14} className="focus" color="#ffffff" />
      {selected && <Brackets x={x - 7} y={y - 7} w={w + 14} h={h + 14} color="#facc15" />}

      <Tag p={p} tire={tire} health={health} pAlert={pAlert} selected={selected} />
    </g>
  )
}

function Brackets({ x, y, w, h, color, className }: { x: number; y: number; w: number; h: number; color: string; className?: string }) {
  const k = 8
  const d = [
    `M${x} ${y + k} V${y} H${x + k}`,
    `M${x + w - k} ${y} H${x + w} V${y + k}`,
    `M${x + w} ${y + h - k} V${y + h} H${x + w - k}`,
    `M${x + k} ${y + h} H${x} V${y + h - k}`,
  ].join(' ')
  return <path className={className} d={d} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
}

function Tag({ p, tire, health, pAlert, selected }: { p: Placed; tire?: Tire; health: ReturnType<typeof tireHealth> | null; pAlert: boolean; selected: boolean }) {
  const { x, y } = p.tag
  const notch = health ? HEALTH_COLOR[health] : '#94a3b8'
  return (
    <g>
      <rect x={x} y={y} width={TAG_W} height={TAG_H} rx={5} fill={tire ? '#f8fafc' : 'rgba(248,250,252,.14)'} stroke={selected ? '#facc15' : 'rgba(0,0,0,.35)'} strokeWidth={selected ? 2 : 1} />
      <rect x={x} y={y} width={5} height={TAG_H} rx={2} fill={notch} />
      <text x={x + 10} y={y + TAG_H / 2 + 0.5} dominantBaseline="central" fontSize={11.5} fontWeight={700} fill={tire ? '#0f172a' : 'rgba(255,255,255,.85)'}>
        {p.slot.code}
      </text>
      <text x={x + TAG_W - 6} y={y + TAG_H / 2 + 0.5} dominantBaseline="central" textAnchor="end" fontSize={10.5} fill={tire ? '#334155' : 'rgba(255,255,255,.6)'}>
        {tire ? tire.treadMM.toFixed(1) : '—'}
      </text>
      {tire?.type === 'recap' && <circle cx={x + 4} cy={y - 1} r={4.5} fill="#7c3aed" stroke="#fff" strokeWidth={1.2} />}
      {pAlert && <circle cx={x + TAG_W - 2} cy={y - 1} r={4.5} fill="#f59e0b" stroke="#fff" strokeWidth={1.2} />}
    </g>
  )
}
