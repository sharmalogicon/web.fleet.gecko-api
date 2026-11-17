import type { Tire, Vehicle, VehicleConfig } from '@/types/tire-axle-map'

const TRUCK = '295/80R22.5'
const TRAILER = '11R22.5'

export const VEHICLE_CONFIGS: VehicleConfig[] = [
  {
    id: '4x2',
    labelKey: 'rigid4x2',
    body: 'rigid',
    spares: 1,
    axles: [
      { kind: 'steer', dual: false, tireSize: TRUCK },
      { kind: 'drive', dual: true, tireSize: TRUCK },
    ],
  },
  {
    id: '6x4',
    labelKey: 'tractor6x4',
    body: 'tractor',
    spares: 1,
    axles: [
      { kind: 'steer', dual: false, tireSize: TRUCK },
      { kind: 'drive', dual: true, tireSize: TRUCK },
      { kind: 'drive', dual: true, tireSize: TRUCK },
    ],
  },
  {
    id: '8x4',
    labelKey: 'rigid8x4',
    body: 'rigid',
    spares: 1,
    axles: [
      { kind: 'steer', dual: false, tireSize: TRUCK },
      { kind: 'steer', dual: false, tireSize: TRUCK },
      { kind: 'drive', dual: true, tireSize: TRUCK },
      { kind: 'drive', dual: true, tireSize: TRUCK },
    ],
  },
  {
    id: 'tri-trailer',
    labelKey: 'trailer3',
    body: 'trailer',
    spares: 2,
    axles: [
      { kind: 'trailer', dual: true, tireSize: TRAILER },
      { kind: 'trailer', dual: true, tireSize: TRAILER },
      { kind: 'lift', dual: true, tireSize: TRAILER },
    ],
  },
]

// ── deterministic tire factory ────────────────────────────────────────────
const BRANDS: Array<[string, string]> = [
  ['Michelin', 'X Multi D'],
  ['Bridgestone', 'R249'],
  ['Goodyear', 'KMAX S'],
  ['Continental', 'HSR2'],
  ['Yokohama', '104ZR'],
  ['Deestone', 'SV403'],
]

let seq = 4100
function tire(size: string, tread: number, opts: Partial<Tire> = {}): Tire {
  const [brand, model] = BRANDS[seq % BRANDS.length]
  seq += 1
  const original = opts.type === 'recap' ? 16 : 20
  const km = Math.round((original - tread) * 9_500)
  return {
    serialNo: `TY-${seq}`,
    brand,
    model,
    size,
    type: 'new',
    recapCount: 0,
    treadMM: tread,
    originalTreadMM: original,
    pressurePsi: 115,
    targetPsi: 115,
    km,
    cost: opts.type === 'recap' ? 7_800 : 14_500,
    installedOn: '2026-05-12',
    ...opts,
  }
}

export function buildMockVehicles(): Vehicle[] {
  seq = 4100
  return [
    {
      code: 'EQ-0012',
      registrationNo: '70-1234',
      configId: '6x4',
      odometerKm: 184_320,
      driverName: 'Somchai P.',
      fitment: {
        '1L': tire(TRUCK, 12.4),
        '1R': tire(TRUCK, 11.8, { pressurePsi: 98 }),
        '2LO': tire(TRUCK, 9.1),
        '2LI': tire(TRUCK, 8.7),
        '2RI': tire(TRUCK, 6.2),
        '2RO': tire(TRUCK, 3.4),
        '3LO': tire(TRUCK, 10.2, { type: 'recap', recapCount: 1 }),
        '3LI': tire(TRUCK, 10.5, { type: 'recap', recapCount: 1 }),
        '3RO': tire(TRUCK, 9.9),
        SP1: tire(TRUCK, 18.0, { km: 0 }),
      },
    },
    {
      code: 'EQ-0031',
      registrationNo: '71-5521',
      configId: '4x2',
      odometerKm: 96_040,
      driverName: 'Anan K.',
      fitment: {
        '1L': tire(TRUCK, 14.2),
        '1R': tire(TRUCK, 14.0),
        '2LO': tire(TRUCK, 5.8),
        '2LI': tire(TRUCK, 6.1),
        '2RI': tire(TRUCK, 6.4, { pressurePsi: 128 }),
        '2RO': tire(TRUCK, 5.5),
      },
    },
    {
      code: 'EQ-0047',
      registrationNo: '72-9080',
      configId: '8x4',
      odometerKm: 241_775,
      driverName: 'Prasert W.',
      fitment: {
        '1L': tire(TRUCK, 7.5),
        '1R': tire(TRUCK, 7.9),
        '2L': tire(TRUCK, 9.2),
        '2R': tire(TRUCK, 9.0),
        '3LO': tire(TRUCK, 4.6),
        '3LI': tire(TRUCK, 4.9),
        '3RI': tire(TRUCK, 5.1),
        '3RO': tire(TRUCK, 4.2),
        '4LO': tire(TRUCK, 11.0),
        '4LI': tire(TRUCK, 11.3),
        '4RI': tire(TRUCK, 10.8),
        '4RO': tire(TRUCK, 2.9),
        SP1: tire(TRUCK, 15.5, { type: 'recap', recapCount: 2 }),
      },
    },
    {
      code: 'CH-0105',
      registrationNo: 'CH-40-105',
      configId: 'tri-trailer',
      odometerKm: 312_600,
      driverName: '—',
      fitment: {
        '1LO': tire(TRAILER, 8.2, { pressurePsi: 100, targetPsi: 105 }),
        '1LI': tire(TRAILER, 8.0, { pressurePsi: 104, targetPsi: 105 }),
        '1RI': tire(TRAILER, 7.6, { pressurePsi: 105, targetPsi: 105 }),
        '1RO': tire(TRAILER, 7.4, { pressurePsi: 88, targetPsi: 105 }),
        '2LO': tire(TRAILER, 12.1, { type: 'recap', recapCount: 1, targetPsi: 105, pressurePsi: 105 }),
        '2RO': tire(TRAILER, 12.4, { type: 'recap', recapCount: 1, targetPsi: 105, pressurePsi: 105 }),
        '3LO': tire(TRAILER, 13.0, { targetPsi: 105, pressurePsi: 106 }),
        '3LI': tire(TRAILER, 13.2, { targetPsi: 105, pressurePsi: 104 }),
        '3RI': tire(TRAILER, 12.9, { targetPsi: 105, pressurePsi: 105 }),
        '3RO': tire(TRAILER, 13.1, { targetPsi: 105, pressurePsi: 105 }),
      },
    },
  ]
}

export function buildMockInventory(): Tire[] {
  seq = 5200
  const fresh = (size: string, extra: Partial<Tire> = {}) =>
    tire(size, extra.type === 'recap' ? 16 : 20, { km: 0, installedOn: undefined, ...extra })
  return [
    fresh(TRUCK),
    fresh(TRUCK),
    fresh(TRUCK),
    fresh(TRUCK),
    fresh(TRUCK, { type: 'recap', recapCount: 1 }),
    fresh(TRUCK, { type: 'recap', recapCount: 1 }),
    fresh(TRUCK, { type: 'recap', recapCount: 2 }),
    { ...fresh(TRUCK), treadMM: 11.5, km: 81_000, installedOn: undefined },
    fresh(TRAILER, { targetPsi: 105, pressurePsi: 105 }),
    fresh(TRAILER, { targetPsi: 105, pressurePsi: 105 }),
    fresh(TRAILER, { type: 'recap', recapCount: 1, targetPsi: 105, pressurePsi: 105 }),
    fresh(TRAILER, { type: 'recap', recapCount: 1, targetPsi: 105, pressurePsi: 105 }),
  ]
}
