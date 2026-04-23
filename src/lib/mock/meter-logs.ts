import type { MeterLog } from '@/types/meter-log'

let _store: MeterLog[] | null = null

function getStore(): MeterLog[] {
  if (!_store) _store = [...SEED]
  return _store
}

export function getMockMeterLogs(): MeterLog[] {
  return getStore()
}

export function upsertMockMeterLog(r: MeterLog): void {
  const store = getStore()
  const idx = store.findIndex((f) => f.meterLogID === r.meterLogID)
  if (idx >= 0) store[idx] = r
  else _store = [...store, r]
}

export function removeMockMeterLog(id: number): void {
  _store = getStore().filter((r) => r.meterLogID !== id)
}

const SEED: MeterLog[] = [
  {
    meterLogID: 1,
    equipmentCode: 'EQ-001',
    registrationNo: 'กข-1234',
    meterUpdateDate: '2024-01-05',
    meterType: 'KM',
    meterRead: 125000,
    driverName: 'สมชาย ใจดี',
    totalDistance: 450,
    remarks: 'Monthly meter update',
  },
  {
    meterLogID: 2,
    equipmentCode: 'EQ-002',
    registrationNo: 'คง-5678',
    meterUpdateDate: '2024-01-12',
    meterType: 'HOUR',
    meterRead: 89000,
    hourMeter: 3200,
    driverName: 'วิชัย มั่นใจ',
    totalDistance: 320,
  },
  {
    meterLogID: 3,
    equipmentCode: 'EQ-003',
    registrationNo: 'จก-9012',
    meterUpdateDate: '2024-01-20',
    meterType: 'BOTH',
    meterRead: 210000,
    hourMeter: 8500,
    driverName: 'ประสิทธิ์ แก้วใส',
    totalDistance: 600,
    remarks: 'Combined KM and hour update',
  },
  {
    meterLogID: 4,
    equipmentCode: 'EQ-004',
    registrationNo: 'ดต-3456',
    meterUpdateDate: '2024-02-03',
    meterType: 'KM',
    meterRead: 55000,
    driverName: 'ธนากร สุขสบาย',
    totalDistance: 380,
  },
  {
    meterLogID: 5,
    equipmentCode: 'EQ-005',
    registrationNo: 'ตถ-7890',
    meterUpdateDate: '2024-02-15',
    meterType: 'BOTH',
    meterRead: 445000,
    hourMeter: 12000,
    driverName: 'นคร พรมดี',
    totalDistance: 520,
    remarks: 'High usage equipment',
  },
  {
    meterLogID: 6,
    equipmentCode: 'EQ-006',
    registrationNo: 'ทน-2345',
    meterUpdateDate: '2024-03-01',
    meterType: 'HOUR',
    meterRead: 33000,
    hourMeter: 1500,
    driverName: 'บุญมา รุ่งเรือง',
    totalDistance: 280,
  },
  {
    meterLogID: 7,
    equipmentCode: 'EQ-007',
    registrationNo: 'ผพ-6789',
    meterUpdateDate: '2024-03-10',
    meterType: 'KM',
    meterRead: 178000,
    driverName: 'ปิยะ ศรีทอง',
    totalDistance: 700,
    remarks: 'End of quarter reading',
  },
  {
    meterLogID: 8,
    equipmentCode: 'EQ-008',
    registrationNo: 'ฝพ-0123',
    meterUpdateDate: '2024-03-25',
    meterType: 'BOTH',
    meterRead: 67000,
    hourMeter: 2800,
    driverName: 'มานะ เพชรงาม',
    totalDistance: 340,
  },
]

export const MOCK_METER_LOGS = SEED
