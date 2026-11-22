// Tire axle-map (interactive fitment board) — domain types.
//
// Position codes follow the common fleet convention used by most tire
// management systems:  <axle number><side><inner|outer>
//   single-tire axle → 1L, 1R
//   dual-tire axle   → 2LO, 2LI, 2RI, 2RO   (L/R seen from the driver's seat)
//   spares           → SP1, SP2

export type AxleKind = 'steer' | 'drive' | 'trailer' | 'lift'

export interface AxleDef {
  kind: AxleKind
  dual: boolean
  tireSize: string
}

export type BodyStyle = 'rigid' | 'tractor' | 'trailer'

export interface VehicleConfig {
  id: string
  /** i18n key under tireMap.configs */
  labelKey: string
  /** Layout name from the API (shown instead of the i18n label when set). */
  label?: string
  body: BodyStyle
  axles: AxleDef[]
  spares: number
  /** Wheel placement from GET /assets/{id}/axle-map (prompt 13): used instead of recomputing when present. */
  geometry2D?: MapGeometry2D
  geometry3D?: MapGeometry3D
}

export interface MapGeometry2D {
  viewBoxWidth: number
  viewBoxHeight: number
  centreX: number
  railOffsetX: number
  frameTopY: number
  frameBottomY: number
  axleY: number[]
  wheels: Record<string, { x: number; y: number; width: number; height: number; rotationDeg: number }>
}

export interface MapGeometry3D {
  wheelRadius: number
  wheelWidth: number
  frameHeight: number
  railOffsetX: number
  lengthZ: number
  axleZ: number[]
  wheels: Record<string, { x: number; y: number; z: number; radius: number; width: number; flat: boolean }>
}

export interface TreadThresholds {
  treadWarningMm: number
  treadCriticalMm: number
  pressureTolerancePct: number
}

export type TireType = 'new' | 'recap'

export interface Tire {
  serialNo: string
  brand: string
  model: string
  size: string
  type: TireType
  recapCount: number
  treadMM: number
  originalTreadMM: number
  pressurePsi: number
  targetPsi: number
  /** km run on this casing (all lives) */
  km: number
  cost: number
  installedOn?: string
  /** API tyre id (UUID); absent on mock tyres. */
  id?: string
  /** Computed by the API from the tenant thresholds (wins over the local rule). */
  health?: TireHealth
  pressureAlert?: boolean
  costPerKm?: number | null
  thresholds?: TreadThresholds
}

export interface Vehicle {
  code: string
  registrationNo: string
  configId: string
  odometerKm: number
  driverName: string
  /** position code → tire */
  fitment: Record<string, Tire>
}

export type RemovalReason =
  | 'wornOut'
  | 'puncture'
  | 'sidewall'
  | 'irregularWear'
  | 'separation'
  | 'rotation'
  | 'recap'
  | 'other'

export type RemovalDestination = 'stock' | 'recap' | 'repair' | 'scrap'

export type TransactionType = 'install' | 'replace' | 'remove' | 'rotate' | 'inspect'

export interface TireTransaction {
  id: string
  type: TransactionType
  position: string
  toPosition?: string
  serialIn?: string
  serialOut?: string
  reason?: RemovalReason
  destination?: RemovalDestination
  treadMM?: number
  pressurePsi?: number
  odometerKm: number
  date: string
}

export interface RemovedTire {
  tire: Tire
  fromPosition: string
  reason: RemovalReason
  destination: RemovalDestination
}

/** Tread thresholds (mm). Most fleets pull trucks tires at 3–4 mm;
 *  legal minimums range 1.6 mm (EU/TH) to 3.2 mm steer (US 4/32"). */
export const TREAD_CRITICAL_MM = 4
export const TREAD_WARNING_MM = 7
/** Pressure deviation from target that triggers an alert. */
export const PRESSURE_TOLERANCE = 0.1

export type TireHealth = 'good' | 'warning' | 'critical'

/** The API's `health` when given, else the rule with the tyre's thresholds (or the defaults above). */
export function tireHealth(t: Tire): TireHealth {
  if (t.health) return t.health
  const critical = t.thresholds?.treadCriticalMm ?? TREAD_CRITICAL_MM
  const warning = t.thresholds?.treadWarningMm ?? TREAD_WARNING_MM
  if (t.treadMM < critical) return 'critical'
  if (t.treadMM < warning) return 'warning'
  return 'good'
}

export function pressureAlert(t: Tire): boolean {
  if (t.pressureAlert !== undefined) return t.pressureAlert
  if (!t.targetPsi) return false
  const tol = t.thresholds ? t.thresholds.pressureTolerancePct / 100 : PRESSURE_TOLERANCE
  return Math.abs(t.pressurePsi - t.targetPsi) / t.targetPsi > tol
}

export function costPerKm(t: Tire): number | null {
  if (t.costPerKm !== undefined) return t.costPerKm
  return t.km > 0 ? t.cost / t.km : null
}

export interface PositionSlot {
  code: string
  axleIndex: number // -1 for spare
  side: 'L' | 'R' | 'S'
  inner: boolean
  axle?: AxleDef
}

/** Expand a vehicle configuration into its ordered tire positions. */
export function positionsFor(config: VehicleConfig): PositionSlot[] {
  const out: PositionSlot[] = []
  config.axles.forEach((axle, i) => {
    const n = i + 1
    if (axle.dual) {
      out.push({ code: `${n}LO`, axleIndex: i, side: 'L', inner: false, axle })
      out.push({ code: `${n}LI`, axleIndex: i, side: 'L', inner: true, axle })
      out.push({ code: `${n}RI`, axleIndex: i, side: 'R', inner: true, axle })
      out.push({ code: `${n}RO`, axleIndex: i, side: 'R', inner: false, axle })
    } else {
      out.push({ code: `${n}L`, axleIndex: i, side: 'L', inner: false, axle })
      out.push({ code: `${n}R`, axleIndex: i, side: 'R', inner: false, axle })
    }
  })
  for (let s = 1; s <= config.spares; s++) {
    out.push({ code: `SP${s}`, axleIndex: -1, side: 'S', inner: false })
  }
  return out
}
