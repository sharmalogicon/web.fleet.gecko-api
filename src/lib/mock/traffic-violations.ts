import type { TrafficViolation } from '@/types/traffic-violation'

let _store: TrafficViolation[] | null = null

function getStore(): TrafficViolation[] {
  if (!_store) _store = [...SEED]
  return _store
}

export function getMockTrafficViolations(): TrafficViolation[] {
  return getStore()
}

export function upsertMockTrafficViolation(r: TrafficViolation): void {
  const store = getStore()
  const idx = store.findIndex((x) => x.violationID === r.violationID)
  if (idx >= 0) store[idx] = r
  else _store = [...store, r]
}

export function removeMockTrafficViolation(id: number): void {
  _store = getStore().filter((r) => r.violationID !== id)
}

const SEED: TrafficViolation[] = [
  {
    violationID: 1,
    ticketNo: 'TV-2024-001',
    violationDate: '2024-01-08',
    equipmentCode: 'EQ-001',
    driverName: 'Prasert K.',
    driverID: 'DRV-001',
    violationType: 'SPEEDING',
    violationTypeDescription: 'Exceeded speed limit by 30 km/h on expressway',
    violationAmount: 2000,
    remarks: '',
  },
  {
    violationID: 2,
    ticketNo: 'TV-2024-002',
    violationDate: '2024-01-25',
    equipmentCode: 'EQ-002',
    driverName: 'Natthawut S.',
    driverID: 'DRV-002',
    violationType: 'PARKING',
    violationTypeDescription: 'Parked in a no-parking zone near loading dock',
    violationAmount: 500,
    remarks: 'Ticket issued at 14:32',
  },
  {
    violationID: 3,
    ticketNo: 'TV-2024-003',
    violationDate: '2024-02-10',
    equipmentCode: 'EQ-003',
    driverName: 'Chaiyaporn L.',
    driverID: 'DRV-003',
    violationType: 'RED_LIGHT',
    violationTypeDescription: 'Ran red light at Sukhumvit-Asok intersection',
    violationAmount: 1000,
    remarks: 'Camera-recorded violation',
  },
  {
    violationID: 4,
    ticketNo: 'TV-2024-004',
    violationDate: '2024-02-22',
    equipmentCode: 'EQ-004',
    driverName: 'Montri B.',
    driverID: 'DRV-004',
    violationType: 'SPEEDING',
    violationTypeDescription: 'Exceeded speed limit by 20 km/h in school zone',
    violationAmount: 3000,
    remarks: 'Double fine applies in school zone',
  },
  {
    violationID: 5,
    ticketNo: 'TV-2024-005',
    violationDate: '2024-03-14',
    equipmentCode: 'EQ-005',
    driverName: 'Somporn R.',
    driverID: 'DRV-005',
    violationType: 'NO_SEATBELT',
    violationTypeDescription: 'Driver and co-driver not wearing seatbelts',
    violationAmount: 500,
    remarks: '',
  },
  {
    violationID: 6,
    ticketNo: 'TV-2024-006',
    violationDate: '2024-04-03',
    equipmentCode: 'EQ-001',
    driverName: 'Prasert K.',
    driverID: 'DRV-001',
    violationType: 'SPEEDING',
    violationTypeDescription: 'Exceeded speed limit by 45 km/h on highway',
    violationAmount: 5000,
    remarks: 'Referred to department head',
  },
  {
    violationID: 7,
    ticketNo: 'TV-2024-007',
    violationDate: '2024-05-19',
    equipmentCode: 'EQ-002',
    driverName: 'Natthawut S.',
    driverID: 'DRV-002',
    violationType: 'RED_LIGHT',
    violationTypeDescription: 'Ran red light at Rama IV-Silom intersection',
    violationAmount: 1000,
    remarks: '',
  },
  {
    violationID: 8,
    ticketNo: 'TV-2024-008',
    violationDate: '2024-06-07',
    equipmentCode: 'EQ-003',
    driverName: 'Chaiyaporn L.',
    driverID: 'DRV-003',
    violationType: 'PARKING',
    violationTypeDescription: 'Blocking fire lane at warehouse entrance',
    violationAmount: 800,
    remarks: '',
  },
  {
    violationID: 9,
    ticketNo: 'TV-2024-009',
    violationDate: '2024-07-15',
    equipmentCode: 'EQ-004',
    driverName: 'Montri B.',
    driverID: 'DRV-004',
    violationType: 'SPEEDING',
    violationTypeDescription: 'Exceeded speed limit by 15 km/h in urban area',
    violationAmount: 1500,
    remarks: '',
  },
  {
    violationID: 10,
    ticketNo: 'TV-2024-010',
    violationDate: '2024-08-20',
    equipmentCode: 'EQ-005',
    driverName: 'Somporn R.',
    driverID: 'DRV-005',
    violationType: 'OTHER',
    violationTypeDescription: 'Overloaded vehicle exceeding axle weight limit',
    violationAmount: 4000,
    remarks: 'Vehicle impounded briefly for inspection',
  },
]
