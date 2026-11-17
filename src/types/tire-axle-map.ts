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
  body: BodyStyle
  axles: AxleDef[]
  spares: number
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

export function tireHealth(t: Tire): TireHealth {
  if (t.treadMM < TREAD_CRITICAL_MM) return 'critical'
  if (t.treadMM < TREAD_WARNING_MM) return 'warning'
  return 'good'
}

export function pressureAlert(t: Tire): boolean {
  return Math.abs(t.pressurePsi - t.targetPsi) / t.targetPsi > PRESSURE_TOLERANCE
}

export function costPerKm(t: Tire): number | null {
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
