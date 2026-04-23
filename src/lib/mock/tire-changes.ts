import type { TireChange } from '@/types/tire-change'

let _store: TireChange[] | null = null

function getStore(): TireChange[] {
  if (!_store) _store = [...SEED]
  return _store
}

export function getMockTireChanges(): TireChange[] {
  return getStore()
}

export function upsertMockTireChange(r: TireChange): void {
  const store = getStore()
  const idx = store.findIndex((x) => x.tireChangeID === r.tireChangeID)
  if (idx >= 0) store[idx] = r
  else _store = [...store, r]
}

export function removeMockTireChange(id: number): void {
  _store = getStore().filter((r) => r.tireChangeID !== id)
}

const SEED: TireChange[] = [
  {
    tireChangeID: 1,
    documentNo: 'TC-2024-001',
    equipmentCode: 'EQ-001',
    equipmentType: 'Truck',
    changeDate: '2024-01-15',
    changeBy: 'Somchai T.',
    workOrderNo: 'WO-2024-010',
    driverName: 'Prasert K.',
    totalHrs: 2.5,
    category: 'ROUTINE',
    meterRead: 45200,
    remarks: 'Scheduled rotation and swap',
    lines: [
      {
        lineID: 1,
        oldSerialNo: 'TYR-008',
        newSerialNo: 'TYR-001',
        tyrePosition: 'FRONT_LEFT',
        condition: 'POOR',
        remarks: 'Beyond economical repair',
      },
      {
        lineID: 2,
        oldSerialNo: 'TYR-009',
        newSerialNo: 'TYR-002',
        tyrePosition: 'FRONT_RIGHT',
        condition: 'FAIR',
        remarks: 'Tread worn below minimum',
      },
      {
        lineID: 3,
        oldSerialNo: 'TYR-007',
        newSerialNo: 'TYR-003',
        tyrePosition: 'REAR_LEFT_OUTER',
        condition: 'FAIR',
        remarks: 'Rotation swap',
      },
    ],
  },
  {
    tireChangeID: 2,
    documentNo: 'TC-2024-002',
    equipmentCode: 'EQ-002',
    equipmentType: 'Trailer',
    changeDate: '2024-02-08',
    changeBy: 'Wanchai P.',
    workOrderNo: 'WO-2024-015',
    driverName: 'Natthawut S.',
    totalHrs: 3.0,
    category: 'CORRECTIVE',
    meterRead: 78340,
    remarks: 'Emergency blowout replacement',
    lines: [
      {
        lineID: 1,
        oldSerialNo: 'TYR-010',
        newSerialNo: 'TYR-004',
        tyrePosition: 'REAR_RIGHT_OUTER',
        condition: 'POOR',
        remarks: 'Blowout — sidewall damage',
      },
      {
        lineID: 2,
        oldSerialNo: 'TYR-006',
        newSerialNo: 'TYR-005',
        tyrePosition: 'REAR_RIGHT_INNER',
        condition: 'FAIR',
        remarks: 'Paired replacement',
      },
    ],
  },
  {
    tireChangeID: 3,
    documentNo: 'TC-2024-003',
    equipmentCode: 'EQ-003',
    equipmentType: 'Pickup',
    changeDate: '2024-03-12',
    changeBy: 'Aroon V.',
    workOrderNo: 'WO-2024-022',
    driverName: 'Chaiyaporn L.',
    totalHrs: 1.5,
    category: 'ROUTINE',
    meterRead: 32100,
    remarks: 'Seasonal tyre change',
    lines: [
      {
        lineID: 1,
        oldSerialNo: 'TYR-005',
        newSerialNo: 'TYR-009',
        tyrePosition: 'FRONT_LEFT',
        condition: 'GOOD',
        remarks: 'Seasonal swap — stored for reuse',
      },
      {
        lineID: 2,
        oldSerialNo: 'TYR-002',
        newSerialNo: 'TYR-006',
        tyrePosition: 'FRONT_RIGHT',
        condition: 'GOOD',
        remarks: 'Seasonal swap',
      },
      {
        lineID: 3,
        oldSerialNo: 'TYR-003',
        newSerialNo: 'TYR-007',
        tyrePosition: 'REAR_LEFT_OUTER',
        condition: 'FAIR',
      },
      {
        lineID: 4,
        oldSerialNo: 'TYR-004',
        newSerialNo: 'TYR-008',
        tyrePosition: 'REAR_RIGHT_OUTER',
        condition: 'FAIR',
      },
    ],
  },
  {
    tireChangeID: 4,
    documentNo: 'TC-2024-004',
    equipmentCode: 'EQ-004',
    equipmentType: 'Truck',
    changeDate: '2024-04-05',
    changeBy: 'Somchai T.',
    workOrderNo: 'WO-2024-031',
    driverName: 'Montri B.',
    totalHrs: 2.0,
    category: 'ROUTINE',
    meterRead: 61000,
    lines: [],
  },
  {
    tireChangeID: 5,
    documentNo: 'TC-2024-005',
    equipmentCode: 'EQ-001',
    equipmentType: 'Truck',
    changeDate: '2024-05-20',
    changeBy: 'Wanchai P.',
    workOrderNo: 'WO-2024-045',
    driverName: 'Prasert K.',
    totalHrs: 1.0,
    category: 'CORRECTIVE',
    meterRead: 52700,
    remarks: 'Puncture repair and swap',
    lines: [],
  },
  {
    tireChangeID: 6,
    documentNo: 'TC-2024-006',
    equipmentCode: 'EQ-005',
    equipmentType: 'Van',
    changeDate: '2024-06-14',
    changeBy: 'Aroon V.',
    driverName: 'Somporn R.',
    totalHrs: 1.5,
    category: 'ROUTINE',
    meterRead: 28900,
    lines: [],
  },
  {
    tireChangeID: 7,
    documentNo: 'TC-2024-007',
    equipmentCode: 'EQ-002',
    equipmentType: 'Trailer',
    changeDate: '2024-07-30',
    changeBy: 'Somchai T.',
    workOrderNo: 'WO-2024-062',
    driverName: 'Natthawut S.',
    totalHrs: 4.0,
    category: 'ROUTINE',
    meterRead: 89500,
    remarks: 'Full axle replacement',
    lines: [],
  },
  {
    tireChangeID: 8,
    documentNo: 'TC-2024-008',
    equipmentCode: 'EQ-003',
    equipmentType: 'Pickup',
    changeDate: '2024-08-22',
    changeBy: 'Wanchai P.',
    driverName: 'Chaiyaporn L.',
    totalHrs: 0.5,
    category: 'CORRECTIVE',
    meterRead: 37400,
    lines: [],
  },
]
