import type { SparePartsMonitor } from '@/types/spare-parts-monitor'

let _store: SparePartsMonitor[] | null = null

function getStore(): SparePartsMonitor[] {
  if (!_store) _store = [...SEED]
  return _store
}

export function getMockSparePartsMonitor(): SparePartsMonitor[] {
  return getStore()
}

const SEED: SparePartsMonitor[] = [
  {
    monitorID: 1,
    workOrderNo: 'WO-001',
    equipmentCode: 'TRK-001',
    orderDate: '2024-01-10',
    orderTime: '08:30',
    grandTotal: 15750,
    status: 'ACTIVE',
    remarks: 'Scheduled maintenance – engine overhaul',
  },
  {
    monitorID: 2,
    workOrderNo: 'WO-002',
    equipmentCode: 'TRK-003',
    orderDate: '2024-01-18',
    orderTime: '10:15',
    grandTotal: 8200,
    status: 'ACTIVE',
    remarks: 'Brake system replacement',
  },
  {
    monitorID: 3,
    workOrderNo: 'WO-003',
    equipmentCode: 'EQP-007',
    orderDate: '2024-02-05',
    orderTime: '09:00',
    grandTotal: 22400,
    status: 'ACTIVE',
    remarks: 'Full suspension overhaul',
  },
  {
    monitorID: 4,
    workOrderNo: 'WO-004',
    equipmentCode: 'TRK-002',
    orderDate: '2024-02-14',
    orderTime: '14:00',
    grandTotal: 4500,
    status: 'INACTIVE',
    remarks: 'Minor electrical repair – completed',
  },
  {
    monitorID: 5,
    workOrderNo: 'WO-005',
    equipmentCode: 'EQP-010',
    orderDate: '2024-02-28',
    orderTime: '11:30',
    grandTotal: 31000,
    status: 'ACTIVE',
    remarks: 'Transmission rebuild',
  },
  {
    monitorID: 6,
    workOrderNo: 'WO-006',
    equipmentCode: 'TRK-005',
    orderDate: '2024-03-07',
    orderTime: '08:00',
    grandTotal: 6750,
    status: 'ACTIVE',
    remarks: 'Cooling system flush and parts replacement',
  },
  {
    monitorID: 7,
    workOrderNo: 'WO-007',
    equipmentCode: 'TRK-001',
    orderDate: '2024-03-20',
    orderTime: '13:45',
    grandTotal: 9800,
    status: 'ACTIVE',
    remarks: 'Tyres and wheel alignment',
  },
  {
    monitorID: 8,
    workOrderNo: 'WO-008',
    equipmentCode: 'EQP-003',
    orderDate: '2024-03-25',
    orderTime: undefined,
    grandTotal: 18600,
    status: 'ACTIVE',
    remarks: 'Hydraulic pump replacement',
  },
  {
    monitorID: 9,
    workOrderNo: 'WO-007',
    equipmentCode: 'TRK-009',
    orderDate: '2024-04-02',
    orderTime: '09:20',
    grandTotal: 3200,
    status: 'INACTIVE',
    remarks: 'Warranty return – parts replaced under warranty',
  },
  {
    monitorID: 10,
    workOrderNo: 'WO-008',
    equipmentCode: 'EQP-015',
    orderDate: '2024-04-15',
    orderTime: '15:00',
    grandTotal: 27900,
    status: 'ACTIVE',
    remarks: 'Annual PM – full parts kit',
  },
]

export const MOCK_SPARE_PARTS_MONITOR = SEED
