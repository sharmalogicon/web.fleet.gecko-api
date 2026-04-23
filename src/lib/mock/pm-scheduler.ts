import type { PMSchedule } from '@/types/pm-scheduler'

let _store: PMSchedule[] | null = null

function getStore(): PMSchedule[] {
  if (!_store) _store = [...SEED]
  return _store
}

export function getMockPMSchedules(): PMSchedule[] {
  return getStore()
}

export function upsertMockPMSchedule(r: PMSchedule): void {
  const store = getStore()
  const idx = store.findIndex((s) => s.pmID === r.pmID)
  if (idx >= 0) store[idx] = r
  else _store = [...store, r]
}

export function removeMockPMSchedule(id: number): void {
  _store = getStore().filter((r) => r.pmID !== id)
}

const SEED: PMSchedule[] = [
  {
    pmID: 1,
    branchID: 1,
    scheduleNo: 'PM-2024-001',
    scheduleDate: '2024-01-15',
    serviceTypeDescription: '10,000 KM Preventive Maintenance',
    serviceType: 'SVC-008',
    meterKm: 10000,
    isActive: true,
    remarks: 'Monthly PM for all trucks',
    services: [
      {
        pmServiceLineID: 1,
        serviceType: 'SVC-001',
        serviceTypeDescription: 'Oil & Filter Change',
        meterInterval: 10000,
      },
      {
        pmServiceLineID: 2,
        serviceType: 'SVC-003',
        serviceTypeDescription: 'Brake System Inspection',
        meterInterval: 10000,
      },
    ],
    equipment: [
      {
        pmEquipmentID: 1,
        equipmentCode: 'EQ-001',
        registrationNo: '80-1234',
        category: 'TRUCK',
        brand: 'HINO',
        customerName: 'PTT Logistics',
      },
      {
        pmEquipmentID: 2,
        equipmentCode: 'EQ-002',
        registrationNo: '80-5678',
        category: 'TRUCK',
        brand: 'ISUZU',
      },
      {
        pmEquipmentID: 3,
        equipmentCode: 'EQ-006',
        registrationNo: '80-7890',
        category: 'TRUCK',
        brand: 'HINO',
      },
    ],
  },
  {
    pmID: 2,
    branchID: 1,
    scheduleNo: 'PM-2024-002',
    scheduleDate: '2024-02-01',
    serviceTypeDescription: '50,000 KM Major Service',
    serviceType: 'SVC-009',
    meterKm: 50000,
    isActive: true,
    services: [
      {
        pmServiceLineID: 3,
        serviceType: 'SVC-001',
        serviceTypeDescription: 'Oil & Filter Change',
        meterInterval: 50000,
      },
      {
        pmServiceLineID: 4,
        serviceType: 'SVC-007',
        serviceTypeDescription: 'Electrical System Check',
        meterInterval: 50000,
      },
    ],
    equipment: [
      {
        pmEquipmentID: 4,
        equipmentCode: 'EQ-004',
        registrationNo: '80-9012',
        category: 'TRUCK',
        brand: 'MITSUBISHI',
      },
    ],
  },
  {
    pmID: 3,
    branchID: 1,
    scheduleNo: 'PM-2024-003',
    scheduleDate: '2024-03-01',
    serviceTypeDescription: 'Forklift 500hr Service',
    serviceType: 'SVC-008',
    meterKm: 500,
    isActive: true,
    services: [
      {
        pmServiceLineID: 5,
        serviceType: 'SVC-001',
        serviceTypeDescription: 'Oil & Filter Change',
        meterInterval: 500,
      },
    ],
    equipment: [
      {
        pmEquipmentID: 5,
        equipmentCode: 'EQ-003',
        registrationNo: 'FL-001',
        category: 'FORKLIFT',
        brand: 'TOYOTA',
      },
    ],
  },
  {
    pmID: 4,
    branchID: 1,
    scheduleNo: 'PM-2024-004',
    scheduleDate: '2024-03-15',
    serviceTypeDescription: 'Tyre Rotation Schedule',
    serviceType: 'SVC-005',
    isActive: true,
    services: [
      {
        pmServiceLineID: 6,
        serviceType: 'SVC-005',
        serviceTypeDescription: 'Tyre Rotation & Balance',
        meterInterval: 5000,
      },
    ],
    equipment: [
      {
        pmEquipmentID: 6,
        equipmentCode: 'EQ-001',
        registrationNo: '80-1234',
        category: 'TRUCK',
        brand: 'HINO',
      },
      {
        pmEquipmentID: 7,
        equipmentCode: 'EQ-002',
        registrationNo: '80-5678',
        category: 'TRUCK',
        brand: 'ISUZU',
      },
    ],
  },
  {
    pmID: 5,
    branchID: 1,
    scheduleNo: 'PM-2024-005',
    scheduleDate: '2024-04-01',
    serviceTypeDescription: 'Annual Safety Inspection',
    serviceType: 'SVC-010',
    isActive: true,
    services: [
      {
        pmServiceLineID: 7,
        serviceType: 'SVC-010',
        serviceTypeDescription: 'Annual Safety Inspection',
      },
    ],
    equipment: [
      {
        pmEquipmentID: 8,
        equipmentCode: 'EQ-001',
        registrationNo: '80-1234',
        category: 'TRUCK',
        brand: 'HINO',
      },
      {
        pmEquipmentID: 9,
        equipmentCode: 'EQ-002',
        registrationNo: '80-5678',
        category: 'TRUCK',
        brand: 'ISUZU',
      },
      {
        pmEquipmentID: 10,
        equipmentCode: 'EQ-004',
        registrationNo: '80-9012',
        category: 'TRUCK',
        brand: 'MITSUBISHI',
      },
      {
        pmEquipmentID: 11,
        equipmentCode: 'EQ-006',
        registrationNo: '80-7890',
        category: 'TRUCK',
        brand: 'HINO',
      },
    ],
  },
  {
    pmID: 6,
    branchID: 1,
    scheduleNo: 'PM-2024-006',
    scheduleDate: '2024-01-01',
    serviceTypeDescription: 'Quarterly Brake Inspection',
    serviceType: 'SVC-003',
    isActive: false,
    remarks: 'Suspended - replaced by SVC-010 program',
    services: [
      {
        pmServiceLineID: 8,
        serviceType: 'SVC-003',
        serviceTypeDescription: 'Brake System Inspection',
        meterInterval: 15000,
      },
    ],
    equipment: [],
  },
]

export const MOCK_PM_SCHEDULES = SEED
