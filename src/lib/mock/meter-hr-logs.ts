import type { MeterHrLog } from '@/types/meter-hr-log'

let _store: MeterHrLog[] | null = null

function getStore(): MeterHrLog[] {
  if (!_store) _store = [...SEED]
  return _store
}

export function getMockMeterHrLogs(): MeterHrLog[] {
  return getStore()
}

export function upsertMockMeterHrLog(r: MeterHrLog): void {
  const store = getStore()
  const idx = store.findIndex((f) => f.meterHrLogID === r.meterHrLogID)
  if (idx >= 0) store[idx] = r
  else _store = [...store, r]
}

export function removeMockMeterHrLog(id: number): void {
  _store = getStore().filter((r) => r.meterHrLogID !== id)
}

const SEED: MeterHrLog[] = [
  {
    meterHrLogID: 1,
    sequenceNo: 'MH-2024-001',
    equipmentCode: 'EQ-001',
    registrationNo: 'กข-1234',
    meterUpdateDate: '2024-01-08',
    meterType: 'KM',
    meterRead: 124550,
    driverName: 'สมชาย ใจดี',
    distanceTravel: 120,
    totalWorkingHr: 8,
    totalDistance: 124550,
    totalHours: 4180,
    remarks: 'Regular route',
  },
  {
    meterHrLogID: 2,
    sequenceNo: 'MH-2024-002',
    equipmentCode: 'EQ-002',
    registrationNo: 'คง-5678',
    meterUpdateDate: '2024-01-15',
    meterType: 'HOUR',
    meterRead: 88850,
    driverName: 'วิชัย มั่นใจ',
    distanceTravel: 85,
    totalWorkingHr: 6,
    totalDistance: 88850,
    totalHours: 3194,
  },
  {
    meterHrLogID: 3,
    sequenceNo: 'MH-2024-003',
    equipmentCode: 'EQ-003',
    registrationNo: 'จก-9012',
    meterUpdateDate: '2024-01-22',
    meterType: 'KM',
    meterRead: 209400,
    driverName: 'ประสิทธิ์ แก้วใส',
    distanceTravel: 280,
    totalWorkingHr: 10,
    totalDistance: 209400,
    totalHours: 8490,
    remarks: 'Long haul trip',
  },
  {
    meterHrLogID: 4,
    sequenceNo: 'MH-2024-004',
    equipmentCode: 'EQ-004',
    registrationNo: 'ดต-3456',
    meterUpdateDate: '2024-02-05',
    meterType: 'KM',
    meterRead: 54620,
    driverName: 'ธนากร สุขสบาย',
    distanceTravel: 195,
    totalWorkingHr: 7,
    totalDistance: 54620,
    totalHours: 1820,
  },
  {
    meterHrLogID: 5,
    sequenceNo: 'MH-2024-005',
    equipmentCode: 'EQ-005',
    registrationNo: 'ตถ-7890',
    meterUpdateDate: '2024-02-18',
    meterType: 'HOUR',
    meterRead: 444480,
    driverName: 'นคร พรมดี',
    distanceTravel: 300,
    totalWorkingHr: 12,
    totalDistance: 444480,
    totalHours: 11988,
    remarks: 'Maximum load trip',
  },
  {
    meterHrLogID: 6,
    sequenceNo: 'MH-2024-006',
    equipmentCode: 'EQ-006',
    registrationNo: 'ทน-2345',
    meterUpdateDate: '2024-03-03',
    meterType: 'KM',
    meterRead: 32750,
    driverName: 'บุญมา รุ่งเรือง',
    distanceTravel: 65,
    totalWorkingHr: 4,
    totalDistance: 32750,
    totalHours: 1496,
  },
  {
    meterHrLogID: 7,
    sequenceNo: 'MH-2024-007',
    equipmentCode: 'EQ-007',
    registrationNo: 'ผพ-6789',
    meterUpdateDate: '2024-03-12',
    meterType: 'KM',
    meterRead: 177300,
    driverName: 'ปิยะ ศรีทอง',
    distanceTravel: 240,
    totalWorkingHr: 9,
    totalDistance: 177300,
    totalHours: 6291,
    remarks: 'Cross-province delivery',
  },
  {
    meterHrLogID: 8,
    sequenceNo: 'MH-2024-008',
    equipmentCode: 'EQ-008',
    registrationNo: 'ฝพ-0123',
    meterUpdateDate: '2024-03-28',
    meterType: 'HOUR',
    meterRead: 66660,
    driverName: 'มานะ เพชรงาม',
    distanceTravel: 150,
    totalWorkingHr: 5,
    totalDistance: 66660,
    totalHours: 2795,
  },
]

export const MOCK_METER_HR_LOGS = SEED
