'use client'

/**
 * 3D axle map (react-three-fiber). Same props as the 2D <AxleDiagram>.
 *
 * Interaction:
 *  - drag empty space to orbit, scroll / pinch to zoom
 *  - click a tire or its tag to select
 *  - drag a tire (or its tag) onto another position to rotate / swap,
 *    onto the stock panel to remove; drag stock tires into the scene to fit
 * Drops inside the canvas are resolved by ray-casting (registerDropResolver).
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { ContactShadows, Html, OrbitControls, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { RotateCcw, ScanLine } from 'lucide-react'
import type { PositionSlot, Tire, VehicleConfig } from '@/types/tire-axle-map'
import { positionsFor, pressureAlert, tireHealth } from '@/types/tire-axle-map'
import type { AxleDiagramProps } from './AxleDiagram'
import { registerDropResolver } from './useTireDrag'
import { HEALTH_COLOR } from './colors'
import { useT } from '@/i18n/I18nContext'

// ── dimensions (metres, roughly true to a heavy truck) ────────────────────
const R = 0.5 // tire radius
const TW = 0.26 // tire width
const SINGLE_X = 1.04
const DUAL_OUT_X = 1.19
const DUAL_IN_X = 0.9
const RAIL_X = 0.32
const FRAME_Y = 0.92

interface Layout3D {
  axleZ: number[]
  frontZ: number
  endZ: number
  spareZ: number
}

function layoutFor(config: VehicleConfig): Layout3D {
  const raw: number[] = []
  let z = 0
  config.axles.forEach((a, i) => {
    if (i > 0) z += config.axles[i - 1].kind === 'steer' && a.kind !== 'steer' ? 2.2 : 1.3
    raw.push(z)
  })
  const front = config.body === 'trailer' ? -2.6 : -0.9
  const end = raw[raw.length - 1] + 0.9
  const mid = (front + end + (config.spares ? 1.4 : 0)) / 2
  return {
    axleZ: raw.map((v) => v - mid),
    frontZ: front - mid,
    endZ: end - mid,
    spareZ: end + 1.0 - mid,
  }
}

interface Placed {
  slot: PositionSlot
  pos: [number, number, number]
  spare: boolean
}

function place(slot: PositionSlot, config: VehicleConfig, l: Layout3D): Placed {
  if (slot.axleIndex < 0) {
    const n = Number(slot.code.slice(2))
    const gap = 1.25
    const x = -((config.spares - 1) * gap) / 2 + (n - 1) * gap
    return { slot, pos: [x, TW / 2, l.spareZ], spare: true }
  }
  const off = slot.axle?.dual ? (slot.inner ? DUAL_IN_X : DUAL_OUT_X) : SINGLE_X
  return { slot, pos: [slot.side === 'L' ? -off : off, R, l.axleZ[slot.axleIndex]], spare: false }
}

/** Tag position relative to its tire: dual pairs fan apart so tags never overlap. */
function tagOffset(p: Placed): [number, number, number] {
  if (p.spare) return [0, 0.45, 0]
  const out = p.slot.side === 'L' ? -1 : 1
  if (!p.slot.axle?.dual) return [out * 0.1, R + 0.42, 0]
  return [(p.slot.inner ? -out : out) * 0.42, R + 0.36, 0]
}

type View = 'perspective' | 'top'

function cameraFor(view: View, l: Layout3D): { pos: [number, number, number]; target: [number, number, number] } {
  const len = l.spareZ - l.frontZ
  if (view === 'top') return { pos: [0, 6 + len * 1.15, 0.01], target: [0, 0, 0] }
  // behind-left and above: L stays on the left of the screen, front points away
  return { pos: [-4.8, 5.2 + len * 0.4, 4.2 + len * 0.8], target: [0, 0.3, -0.2] }
}

export function AxleDiagram3D(props: AxleDiagramProps) {
  const { t } = useT()
  const [view, setView] = useState<{ v: View; n: number }>({ v: 'perspective', n: 0 })

  return (
    <div className="relative">
      <div className="h-[600px] w-full overflow-hidden rounded-lg bg-gradient-to-b from-slate-100 to-slate-200">
        <Canvas dpr={[1, 2]} camera={{ fov: 38, position: [6, 7, 9] }} gl={{ antialias: true }}>
          <Scene {...props} view={view} />
        </Canvas>
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3">
        <p className="rounded-md bg-white/80 px-2 py-1 text-[11px] text-gray-600 backdrop-blur">{t('tireMap.orbitHint')}</p>
        <div className="pointer-events-auto flex gap-1.5">
          <button
            type="button"
            onClick={() => setView((s) => ({ v: 'top', n: s.n + 1 }))}
            className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white/90 px-2 py-1 text-xs font-medium text-gray-700 shadow-sm hover:bg-white"
          >
            <ScanLine className="h-3.5 w-3.5" aria-hidden />
            {t('tireMap.topView')}
          </button>
          <button
            type="button"
            onClick={() => setView((s) => ({ v: 'perspective', n: s.n + 1 }))}
            className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white/90 px-2 py-1 text-xs font-medium text-gray-700 shadow-sm hover:bg-white"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            {t('tireMap.resetView')}
          </button>
        </div>
      </div>
    </div>
  )
}

function Scene({ config, fitment, selected, drag, armed, onSelect, onStartDrag, consumedByDrag, view }: AxleDiagramProps & { view: { v: View; n: number } }) {
  const { t } = useT()
  const l = useMemo(() => layoutFor(config), [config])
  const placed = useMemo(() => positionsFor(config).map((s) => place(s, config, l)), [config, l])
  const targets = useRef<THREE.Group>(null)
  const controls = useRef<OrbitControlsImpl>(null)
  const { camera, gl } = useThree()
  const dragFrom = drag?.payload.source === 'position' ? drag.payload.code : null

  // camera presets: on vehicle change and on button press
  useEffect(() => {
    const c = cameraFor(view.v, l)
    camera.position.set(...c.pos)
    controls.current?.target.set(...c.target)
    controls.current?.update()
  }, [view, l, camera])

  // ray-cast resolver so drags can land on 3D tires
  useEffect(() => {
    const raycaster = new THREE.Raycaster()
    return registerDropResolver((x, y, el) => {
      if (el !== gl.domElement || !targets.current) return null
      const rect = gl.domElement.getBoundingClientRect()
      const ndc = new THREE.Vector2(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1)
      raycaster.setFromCamera(ndc, camera)
      for (const hit of raycaster.intersectObjects(targets.current.children, true)) {
        let o: THREE.Object3D | null = hit.object
        while (o && !o.userData.dropCode) o = o.parent
        if (o) return o.userData.dropCode as string
      }
      return null
    })
  }, [camera, gl])

  // orbit is suspended while a tire is being dragged
  useEffect(() => {
    const up = () => {
      if (controls.current) controls.current.enabled = true
    }
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [])

  return (
    <>
      <hemisphereLight args={['#ffffff', '#cbd5e1', 1.1]} />
      <directionalLight position={[5, 9, 4]} intensity={1.6} />
      <directionalLight position={[-6, 4, -5]} intensity={0.5} />

      <mesh rotation-x={-Math.PI / 2} position-y={-0.001}>
        <circleGeometry args={[14, 64]} />
        <meshStandardMaterial color="#e8edf2" />
      </mesh>
      <gridHelper args={[24, 48, '#cfd7e0', '#dde3ea']} position-y={0.001} />
      <ContactShadows position={[0, 0.002, 0]} opacity={0.5} scale={16} blur={2.2} far={2.4} resolution={1024} />

      <FrontArrow z={l.frontZ - 0.6} label={t('tireMap.front')} />
      <Vehicle config={config} l={l} />

      <group ref={targets}>
        {placed.map((p) => {
          const tire = fitment[p.slot.code]
          return (
            <TireSlot3D
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
              onStart={(ev) => {
                if (!tire) return
                if (controls.current) controls.current.enabled = false
                onStartDrag(ev, { source: 'position', code: p.slot.code }, tire.serialNo, HEALTH_COLOR[tireHealth(tire)])
              }}
            />
          )
        })}
      </group>

      <OrbitControls
        ref={controls}
        makeDefault
        enablePan={false}
        minDistance={5}
        maxDistance={22}
        maxPolarAngle={Math.PI / 2.15}
        enableDamping
        dampingFactor={0.12}
      />
    </>
  )
}

// ── vehicle body (static, decorative) ─────────────────────────────────────
const steel = <meshStandardMaterial color="#64748b" metalness={0.5} roughness={0.45} />

function Vehicle({ config, l }: { config: VehicleConfig; l: Layout3D }) {
  const frameStart = config.body === 'trailer' ? l.frontZ + 0.2 : l.frontZ + 0.15
  const frameLen = l.endZ - frameStart
  const frameMid = frameStart + frameLen / 2
  const cross = Math.max(2, Math.floor(frameLen / 0.9))

  return (
    <group>
      {/* frame rails + crossmembers */}
      {[-RAIL_X, RAIL_X].map((x) => (
        <mesh key={x} position={[x, FRAME_Y, frameMid]}>
          <boxGeometry args={[0.1, 0.24, frameLen]} />
          {steel}
        </mesh>
      ))}
      {Array.from({ length: cross }, (_, i) => (
        <mesh key={i} position={[0, FRAME_Y, frameStart + 0.3 + (i * (frameLen - 0.6)) / (cross - 1)]}>
          <boxGeometry args={[RAIL_X * 2, 0.12, 0.08]} />
          <meshStandardMaterial color="#7b8794" metalness={0.4} roughness={0.5} />
        </mesh>
      ))}

      {/* axles */}
      {config.axles.map((axle, i) => {
        const z = l.axleZ[i]
        const half = axle.dual ? DUAL_OUT_X : SINGLE_X
        return (
          <group key={i}>
            <mesh position={[0, R, z]} rotation-z={Math.PI / 2}>
              <cylinderGeometry args={[0.07, 0.07, half * 2 - 0.1, 16]} />
              <meshStandardMaterial color="#475569" metalness={0.6} roughness={0.35} />
            </mesh>
            {axle.kind === 'drive' && (
              <>
                <mesh position={[0, R, z]}>
                  <sphereGeometry args={[0.24, 24, 16]} />
                  <meshStandardMaterial color="#334155" metalness={0.5} roughness={0.4} />
                </mesh>
                <mesh position={[0, R + 0.18, z - 0.45]} rotation-x={Math.PI / 2.4}>
                  <cylinderGeometry args={[0.05, 0.05, 0.9, 12]} />
                  <meshStandardMaterial color="#475569" metalness={0.6} roughness={0.35} />
                </mesh>
              </>
            )}
            {axle.kind === 'lift' &&
              [-0.5, 0.5].map((x) => (
                <mesh key={x} position={[x, R + 0.28, z]}>
                  <cylinderGeometry args={[0.16, 0.16, 0.3, 20]} />
                  <meshStandardMaterial color="#1f2937" roughness={0.8} />
                </mesh>
              ))}
          </group>
        )
      })}

      {config.body === 'trailer' ? <TrailerParts l={l} frameStart={frameStart} /> : <Cab config={config} l={l} />}
    </group>
  )
}

function Cab({ config, l }: { config: VehicleConfig; l: Layout3D }) {
  const z0 = l.axleZ[0]
  const cabDepth = 1.5
  const cabFront = l.frontZ
  const cabZ = cabFront + cabDepth / 2
  const cabBack = cabFront + cabDepth
  const ys = l.axleZ.slice(1)
  const fifthZ = ys.length ? (ys[0] + ys[ys.length - 1]) / 2 : z0 + 2
  return (
    <group>
      {/* cab */}
      <RoundedBox args={[1.9, 1.65, cabDepth]} radius={0.14} smoothness={4} position={[0, 1.08 + 0.83, cabZ]}>
        <meshStandardMaterial color="#f8fafc" roughness={0.35} metalness={0.1} />
      </RoundedBox>
      {/* windscreen */}
      <mesh position={[0, 2.18, cabFront - 0.005]}>
        <boxGeometry args={[1.62, 0.66, 0.02]} />
        <meshStandardMaterial color="#1e3a5f" roughness={0.1} metalness={0.6} />
      </mesh>
      {/* grille + bumper */}
      <mesh position={[0, 1.45, cabFront - 0.01]}>
        <boxGeometry args={[1.1, 0.42, 0.03]} />
        <meshStandardMaterial color="#334155" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.98, cabFront - 0.05]}>
        <boxGeometry args={[2.0, 0.24, 0.16]} />
        <meshStandardMaterial color="#475569" roughness={0.5} metalness={0.3} />
      </mesh>
      {/* headlights */}
      {[-0.78, 0.78].map((x) => (
        <mesh key={x} position={[x, 1.25, cabFront - 0.02]}>
          <boxGeometry args={[0.26, 0.12, 0.03]} />
          <meshStandardMaterial color="#fef9c3" emissive="#fde68a" emissiveIntensity={0.6} />
        </mesh>
      ))}
      {/* blue livery stripe */}
      {[-0.955, 0.955].map((x) => (
        <mesh key={x} position={[x, 1.55, cabZ + 0.05]}>
          <boxGeometry args={[0.02, 0.14, cabDepth - 0.35]} />
          <meshStandardMaterial color="#2563eb" />
        </mesh>
      ))}
      {/* roof deflector + marker lights */}
      <mesh position={[0, 2.86, cabZ + 0.1]} rotation-x={-0.18}>
        <boxGeometry args={[1.7, 0.28, 1.1]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.4} />
      </mesh>
      {[-0.5, -0.25, 0, 0.25, 0.5].map((x) => (
        <mesh key={x} position={[x, 2.77, cabFront + 0.02]}>
          <boxGeometry args={[0.12, 0.05, 0.04]} />
          <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.7} />
        </mesh>
      ))}
      {/* mirrors */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 1.12, 2.0, cabFront + 0.22]} rotation-z={s * 0.2}>
            <boxGeometry args={[0.3, 0.03, 0.03]} />
            <meshStandardMaterial color="#334155" />
          </mesh>
          <mesh position={[s * 1.27, 2.0, cabFront + 0.22]}>
            <boxGeometry args={[0.06, 0.38, 0.16]} />
            <meshStandardMaterial color="#1f2937" />
          </mesh>
        </group>
      ))}

      {config.body === 'tractor' && (
        <mesh position={[0, FRAME_Y + 0.17, fifthZ]}>
          <cylinderGeometry args={[0.42, 0.42, 0.08, 40]} />
          <meshStandardMaterial color="#475569" metalness={0.6} roughness={0.3} />
        </mesh>
      )}

      {config.body === 'rigid' && (
        <group>
          <RoundedBox
            args={[1.5, 1.9, l.endZ - cabBack - 0.15]}
            radius={0.05}
            smoothness={3}
            position={[0, FRAME_Y + 0.13 + 0.95, (cabBack + 0.15 + l.endZ) / 2]}
          >
            <meshStandardMaterial color="#e2e8f0" roughness={0.6} />
          </RoundedBox>
          {[-0.755, 0.755].map((x) => (
            <mesh key={x} position={[x, FRAME_Y + 0.3, (cabBack + 0.15 + l.endZ) / 2]}>
              <boxGeometry args={[0.02, 0.1, l.endZ - cabBack - 0.25]} />
              <meshStandardMaterial color="#2563eb" />
            </mesh>
          ))}
        </group>
      )}
    </group>
  )
}

function TrailerParts({ l, frameStart }: { l: Layout3D; frameStart: number }) {
  const twist = [
    [-1.12, frameStart + 0.1],
    [1.12, frameStart + 0.1],
    [-1.12, l.endZ - 0.1],
    [1.12, l.endZ - 0.1],
  ]
  const outerLen = l.endZ - frameStart
  return (
    <group>
      {/* outer side beams & end beams of a container chassis */}
      {[-1.12, 1.12].map((x) => (
        <mesh key={x} position={[x, FRAME_Y + 0.05, frameStart + outerLen / 2]}>
          <boxGeometry args={[0.1, 0.14, outerLen]} />
          {steel}
        </mesh>
      ))}
      {[frameStart + 0.1, l.endZ - 0.1].map((z) => (
        <mesh key={z} position={[0, FRAME_Y + 0.05, z]}>
          <boxGeometry args={[2.34, 0.14, 0.12]} />
          {steel}
        </mesh>
      ))}
      {twist.map(([x, z], i) => (
        <mesh key={i} position={[x, FRAME_Y + 0.16, z]}>
          <boxGeometry args={[0.16, 0.1, 0.16]} />
          <meshStandardMaterial color="#eab308" roughness={0.5} />
        </mesh>
      ))}
      {/* landing gear */}
      {[-0.75, 0.75].map((x) => (
        <group key={x}>
          <mesh position={[x, FRAME_Y / 2, frameStart + 1.4]}>
            <boxGeometry args={[0.12, FRAME_Y, 0.12]} />
            <meshStandardMaterial color="#334155" metalness={0.4} />
          </mesh>
          <mesh position={[x, 0.03, frameStart + 1.4]}>
            <boxGeometry args={[0.3, 0.06, 0.3]} />
            <meshStandardMaterial color="#1f2937" />
          </mesh>
        </group>
      ))}
      {/* kingpin */}
      <mesh position={[0, FRAME_Y - 0.2, frameStart + 0.6]}>
        <cylinderGeometry args={[0.06, 0.06, 0.25, 16]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  )
}

function FrontArrow({ z, label }: { z: number; label: string }) {
  const shape = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(0, 0.45)
    s.lineTo(0.4, 0)
    s.lineTo(0.18, 0)
    s.lineTo(0.18, -0.4)
    s.lineTo(-0.18, -0.4)
    s.lineTo(-0.18, 0)
    s.lineTo(-0.4, 0)
    s.closePath()
    return s
  }, [])
  return (
    <group position={[0, 0.004, z]} rotation-x={-Math.PI / 2}>
      <mesh>
        <shapeGeometry args={[shape]} />
        <meshBasicMaterial color="#94a3b8" />
      </mesh>
      <Html position={[0.62, 0.05, 0]} center style={{ pointerEvents: 'none' }}>
        <span className="select-none text-[10px] font-semibold tracking-wide text-slate-400">{label}</span>
      </Html>
    </group>
  )
}

// ── a tire position ───────────────────────────────────────────────────────
interface SlotProps {
  p: Placed
  tire?: Tire
  selected: boolean
  isOver: boolean
  isCandidate: boolean
  isSource: boolean
  emptyLabel: string
  onSelect: () => void
  onStart: (e: { button: number; clientX: number; clientY: number }) => void
}

function TireSlot3D({ p, tire, selected, isOver, isCandidate, isSource, emptyLabel, onSelect, onStart }: SlotProps) {
  const [hover, setHover] = useState(false)
  const ring = useRef<THREE.MeshBasicMaterial>(null)
  const health = tire ? tireHealth(tire) : null
  const color = health ? HEALTH_COLOR[health] : '#94a3b8'
  const pAlert = tire ? pressureAlert(tire) : false
  // upright tires spin about X; spares lie flat (cylinder default axis = Y)
  const rot: [number, number, number] = p.spare ? [0, 0, 0] : [0, 0, Math.PI / 2]
  const ringColor = isOver ? '#16a34a' : selected ? '#2563eb' : '#3b82f6'
  const showRing = isOver || selected || isCandidate

  useFrame(({ clock }) => {
    if (ring.current && isCandidate && !isOver && !selected) {
      ring.current.opacity = 0.35 + 0.35 * Math.sin(clock.elapsedTime * 5)
    }
  })

  useEffect(() => {
    document.body.style.cursor = hover ? (tire ? 'grab' : 'pointer') : ''
    return () => {
      document.body.style.cursor = ''
    }
  }, [hover, tire])

  const handlers = {
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation()
      onSelect()
    },
    onPointerDown: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      onStart(e.nativeEvent)
    },
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      setHover(true)
    },
    onPointerOut: () => setHover(false),
  }

  const lift = hover && tire && !isSource ? 0.04 : 0

  return (
    <group position={p.pos} userData={{ dropCode: p.slot.code }}>
      {/* invisible, generous hit proxy */}
      <mesh {...handlers} rotation={rot}>
        <cylinderGeometry args={[R + 0.08, R + 0.08, TW + 0.12, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {tire ? (
        <group rotation={rot} position-y={lift}>
          {/* tread band in the health colour (material-0); dark rubber sidewalls (material-1/2) */}
          <mesh>
            <cylinderGeometry args={[R, R, TW, 48]} />
            <meshStandardMaterial
              attach="material-0"
              color={color}
              roughness={0.75}
              transparent={isSource}
              opacity={isSource ? 0.3 : 1}
              emissive={color}
              emissiveIntensity={hover || selected ? 0.3 : 0.06}
            />
            {[1, 2].map((i) => (
              <meshStandardMaterial
                key={i}
                attach={`material-${i}`}
                color="#262b31"
                roughness={0.85}
                transparent={isSource}
                opacity={isSource ? 0.3 : 1}
                emissive={color}
                emissiveIntensity={hover || selected ? 0.12 : 0}
              />
            ))}
          </mesh>
          {/* health-coloured sidewall stripe, readable from the side */}
          {[1, -1].map((s) => (
            <mesh key={s} position-y={s * (TW / 2 + 0.003)} rotation-x={Math.PI / 2}>
              <ringGeometry args={[0.4, 0.44, 48]} />
              <meshStandardMaterial color={color} side={THREE.DoubleSide} transparent={isSource} opacity={isSource ? 0.3 : 1} />
            </mesh>
          ))}
          {/* tread grooves */}
          {[-0.08, 0, 0.08].map((y) => (
            <mesh key={y} position-y={y} rotation-x={Math.PI / 2}>
              <torusGeometry args={[R + 0.001, 0.007, 6, 64]} />
              <meshStandardMaterial color="#0f172a" roughness={0.9} transparent opacity={isSource ? 0.15 : 0.35} />
            </mesh>
          ))}
          {/* rim + hub on both faces */}
          {[1, -1].map((s) => (
            <group key={s}>
              <mesh position-y={s * (TW / 2 + 0.002)}>
                <cylinderGeometry args={[0.3, 0.3, 0.01, 32]} />
                <meshStandardMaterial color="#cbd5e1" metalness={0.75} roughness={0.25} />
              </mesh>
              <mesh position-y={s * (TW / 2 + 0.02)}>
                <cylinderGeometry args={[0.1, 0.12, 0.04, 20]} />
                <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} />
              </mesh>
            </group>
          ))}
        </group>
      ) : (
        <mesh rotation={rot}>
          <cylinderGeometry args={[R, R, TW, 32]} />
          <meshStandardMaterial color="#94a3b8" transparent opacity={0.18} depthWrite={false} />
        </mesh>
      )}

      {/* ground ring: selection / drop feedback */}
      {showRing && (
        <mesh position={[0, -p.pos[1] + 0.01, 0]} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[p.spare ? R + 0.08 : 0.42, p.spare ? R + 0.2 : 0.56, 48]} />
          <meshBasicMaterial ref={ring} color={ringColor} transparent opacity={isOver || selected ? 0.9 : 0.5} depthWrite={false} />
        </mesh>
      )}

      {/* tag (DOM): click / drag target, keyboard accessible */}
      <Html position={tagOffset(p)} center zIndexRange={[20, 0]}>
        <div
          data-drop-target={p.slot.code}
          role="button"
          tabIndex={0}
          aria-pressed={selected}
          aria-label={tire ? `${p.slot.code}: ${tire.serialNo}, ${tire.treadMM.toFixed(1)} mm` : `${p.slot.code}: ${emptyLabel}`}
          onClick={onSelect}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onSelect()
            }
          }}
          onPointerDown={(e) => onStart(e)}
          className={`flex cursor-pointer select-none items-center gap-1 whitespace-nowrap rounded-md border bg-white/95 py-0.5 pl-0.5 pr-1.5 text-[10px] font-semibold shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 ${
            isOver ? 'border-green-500 ring-2 ring-green-500/40' : selected ? 'border-blue-600 ring-2 ring-blue-500/30' : 'border-gray-200'
          }`}
          style={{ touchAction: 'none', opacity: isSource ? 0.4 : 1 }}
        >
          <span className="h-3.5 w-1 rounded-sm" style={{ background: color }} />
          <span className="text-slate-800">{p.slot.code}</span>
          <span className="font-normal tabular-nums text-slate-500">{tire ? tire.treadMM.toFixed(1) : '—'}</span>
          {tire?.type === 'recap' && <span className="h-1.5 w-1.5 rounded-full bg-violet-600" title="Recap" />}
          {pAlert && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title="Pressure" />}
        </div>
      </Html>
    </group>
  )
}
