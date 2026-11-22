import { describe, expect, it } from 'vitest'
import { positionsFor, pressureAlert, tireHealth } from '@/types/tire-axle-map'
import { axleMapToVehicle, changeLines, reasonCode, registerTyreToTire, tyreLines, viewTyreStatus, type AxleMapDto } from './tyres'

const tyre = (serial: string, tread: number, health = 'good') => ({
  tyreId: `id-${serial}`, serialNo: serial, brandCode: 'MICH', modelName: 'X Multi', sizeCode: '295/80R22.5', tyreType: 'NEW', recapCount: 0,
  treadMm: tread, originalTreadMm: 16, pressurePsi: '110', targetPsi: 115, km: 42000, cost: 12000, costPerKm: 0.2857, installedAt: '2026-05-01T00:00:00Z',
  health, pressureAlert: false,
})
const pos = (code: string, axleNo: number, side: string, inner: boolean, t: ReturnType<typeof tyre> | null) => ({ code, axleNo, side, inner, axleKind: null, dual: false, tyreSizeCode: null, tyre: t })

const MAP = {
  assetProfileId: 'a1', assetCode: 'TRK-01', registrationNo: '70-1234', layoutCode: '4X2', layoutName: '4x2 rigid', bodyStyle: 'RIGID', spareCount: 1, odometerKm: '123456',
  axles: [{ axleNo: 2, axleKind: 'DRIVE', isDual: true, tyreSizeCode: '295/80R22.5' }, { axleNo: 1, axleKind: 'STEER', isDual: false, tyreSizeCode: '295/80R22.5' }],
  positions: [pos('1L', 1, 'L', false, tyre('S1', 12)), pos('1R', 1, 'R', false, null), pos('2LO', 2, 'L', false, tyre('S2', 3.5, 'critical')), pos('SP1', 0, 'S', false, null)],
  thresholds: { treadWarningMm: 8, treadCriticalMm: '5', pressureTolerancePct: 15 },
  geometry2D: {
    viewBoxWidth: 400, viewBoxHeight: 520, centreX: 200, railOffsetX: 30, frameTopY: 30, frameBottomY: 400, axleY: [78, '268'],
    wheels: [{ code: '1L', x: 96, y: 78, width: 24, height: 50, rotationDeg: 0 }, { code: 'SP1', x: 200, y: 460, width: 24, height: 50, rotationDeg: 90 }],
  },
  geometry3D: {
    units: 'm', wheelRadius: 0.5, wheelWidth: 0.26, frameHeight: 0.92, railOffsetX: 0.32, lengthZ: 6, axleZ: [0, 3.6],
    wheels: [{ code: '1L', x: -1.04, y: 0.5, z: 0, radius: 0.5, width: 0.26, orientation: 'ROLLING' }, { code: 'SP1', x: 0, y: 0.13, z: 4.5, radius: 0.5, width: 0.26, orientation: 'FLAT' }],
  },
} as unknown as AxleMapDto

describe('axle map adapter (prompt 13 A)', () => {
  it('builds the config: body, axles in axle order, spares, label', () => {
    const { config } = axleMapToVehicle(MAP)
    expect(config.body).toBe('rigid')
    expect(config.axles.map((a) => [a.kind, a.dual])).toEqual([['steer', false], ['drive', true]])
    expect(config.spares).toBe(1)
    expect(config.label).toBe('4x2 rigid')
    expect(positionsFor(config).map((s) => s.code)).toEqual(['1L', '1R', '2LO', '2LI', '2RI', '2RO', 'SP1'])
  })

  it('fitment only for occupied positions; health / alerts / cost per km from the API', () => {
    const { vehicle, thresholds } = axleMapToVehicle(MAP, 'Somchai')
    expect(Object.keys(vehicle.fitment)).toEqual(['1L', '2LO'])
    expect(vehicle).toMatchObject({ code: 'TRK-01', registrationNo: '70-1234', odometerKm: 123456, driverName: 'Somchai' })
    expect(tireHealth(vehicle.fitment['2LO'])).toBe('critical')
    expect(pressureAlert(vehicle.fitment['1L'])).toBe(false)
    expect(vehicle.fitment['1L']).toMatchObject({ id: 'id-S1', pressurePsi: 110, costPerKm: 0.2857, installedOn: '2026-05-01' })
    expect(thresholds).toEqual({ treadWarningMm: 8, treadCriticalMm: 5, pressureTolerancePct: 15 })
  })

  it('2D geometry: numbers, wheels by code', () => {
    const g = axleMapToVehicle(MAP).config.geometry2D!
    expect(g.axleY).toEqual([78, 268])
    expect(g.wheels['SP1']).toEqual({ x: 200, y: 460, width: 24, height: 50, rotationDeg: 90 })
  })

  it('3D geometry: wheels by code, FLAT spare', () => {
    const g = axleMapToVehicle(MAP).config.geometry3D!
    expect(g.axleZ).toEqual([0, 3.6])
    expect(g.wheels['1L']).toMatchObject({ x: -1.04, z: 0, flat: false })
    expect(g.wheels['SP1'].flat).toBe(true)
  })

  it('no geometry when the format left it out', () => {
    const { config } = axleMapToVehicle({ ...MAP, geometry2D: null, geometry3D: null })
    expect(config.geometry2D).toBeUndefined()
    expect(config.geometry3D).toBeUndefined()
  })

  it('register tyres use the map thresholds for health', () => {
    const t = registerTyreToTire({ tyreId: 'x', serialNo: 'X', brandCode: null, modelName: null, sizeCode: null, tyreType: 'NEW', recapCount: 0, currentTreadMm: 6, originalTreadMm: 16, lastPressurePsi: null, targetPsi: null, lifetimeKm: 0, totalCost: 0, costPerKm: null } as never, { treadWarningMm: 7, treadCriticalMm: 4, pressureTolerancePct: 10 })
    expect(tireHealth(t)).toBe('warning')
    expect(pressureAlert(t)).toBe(false)
  })
})

describe('tyre actions, register, documents (prompt 13 A to C)', () => {
  it('reason codes in upper snake case; one line per action', () => {
    expect(reasonCode('wornOut')).toBe('WORN_OUT')
    expect(reasonCode('irregularWear')).toBe('IRREGULAR_WEAR')
    expect(tyreLines.replace('2LO', 't9', 'puncture', 'repair', 3.5)).toMatchObject({ action: 'REPLACE', position: '2LO', tyreId: 't9', reasonCode: 'PUNCTURE', destination: 'REPAIR', treadBeforeMm: 3.5, cost: 0 })
    expect(tyreLines.rotate('1L', '1R')).toMatchObject({ action: 'ROTATE', position: '1L', toPosition: '1R' })
    expect(tyreLines.remove('1L', 'wornOut', 'recap', 4)).toMatchObject({ action: 'REMOVE', destination: 'RECAP', treadMm: 4 })
  })

  it('tyreStatus derivation', () => {
    expect(viewTyreStatus({ status: 'SCRAPPED', tyreType: 'RECAP', lifetimeKm: 9 })).toBe('SCRAP')
    expect(viewTyreStatus({ status: 'FITTED', tyreType: 'RECAP', lifetimeKm: 0 })).toBe('RECAP')
    expect(viewTyreStatus({ status: 'FITTED', tyreType: 'NEW', lifetimeKm: '120' })).toBe('USED')
    expect(viewTyreStatus({ status: 'IN_STOCK', tyreType: 'NEW', lifetimeKm: 0 })).toBe('NEW')
  })

  it('REPLACE line: old serial from the REMOVE row, new from the INSTALL row', () => {
    const ev = (eventType: string, serialNo: string, lineNo: number | null, extra = {}) => ({ eventType, serialNo, lineNo, fromPosition: null, toPosition: null, condition: null, reasonCode: null, destination: null, remarks: null, ...extra })
    const lines = changeLines([
      ev('REMOVE', 'OLD-1', 1, { fromPosition: '2LO', reasonCode: 'WORN_OUT', destination: 'RECAP' }),
      ev('INSTALL', 'NEW-1', 1, { toPosition: '2LO' }),
      ev('ROTATE', 'R-1', 2, { fromPosition: '1L', toPosition: '1R' }),
      ev('INSTALL', 'N-2', 3, { toPosition: '1R' }),
    ] as never)
    expect(lines[0]).toMatchObject({ action: 'REPLACE', position: '2LO', oldSerialNo: 'OLD-1', newSerialNo: 'NEW-1', reason: 'WORN_OUT', destination: 'RECAP' })
    expect(lines[1]).toMatchObject({ action: 'ROTATE', position: '1L', toPosition: '1R', oldSerialNo: 'R-1' })
    expect(lines[2]).toMatchObject({ action: 'INSTALL', position: '1R', oldSerialNo: '', newSerialNo: 'N-2' })
  })
})

describe('owner answers 13 (fields the backend is adding)', () => {
  it('driver on the map when the API sends it', () => {
    expect(axleMapToVehicle({ ...MAP, driverName: 'Somsak' } as never).vehicle.driverName).toBe('Somsak')
    expect(axleMapToVehicle({ ...MAP, driverCode: 'D-01' } as never).vehicle.driverName).toBe('D-01')
    expect(axleMapToVehicle(MAP).vehicle.driverName).toBe('')
  })
})

describe('store for a tyre removed to stock (live test A2)', () => {
  it('REMOVE and REPLACE carry the picked store', () => {
    expect(tyreLines.remove('1L', 'puncture', 'stock', 15, 'wh-1')).toMatchObject({ action: 'REMOVE', destination: 'STOCK', warehouseId: 'wh-1' })
    expect(tyreLines.replace('1L', 't2', 'wornOut', 'stock', 3, 16, 115, 'wh-2')).toMatchObject({ action: 'REPLACE', warehouseId: 'wh-2' })
    expect(tyreLines.replace('1L', 't2', 'wornOut', 'recap', 3).warehouseId).toBeNull()
  })
})
