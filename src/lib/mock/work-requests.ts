import type { WorkRequest } from '@/types/work-request'

let _store: WorkRequest[] | null = null

function getStore(): WorkRequest[] {
  if (!_store) _store = [...SEED]
  return _store
}

export function getMockWorkRequests(): WorkRequest[] {
  return getStore()
}

export function upsertMockWorkRequest(r: WorkRequest): void {
  const store = getStore()
  const idx = store.findIndex((w) => w.wrID === r.wrID)
  if (idx >= 0) store[idx] = r
  else _store = [...store, r]
}

export function removeMockWorkRequest(id: number): void {
  _store = getStore().filter((r) => r.wrID !== id)
}

const SEED: WorkRequest[] = [
  {
    wrID: 1,
    branchID: 1,
    documentNo: 'WR-2024-001',
    orderDate: '2024-01-15',
    priorityType: 'HIGH',
    status: 'COMPLETED',
    billingCustomerName: 'PTT Logistics',
    vendorName: 'AAA Service',
    vendorCode: 'VND-001',
    equipmentCode: 'EQ-001',
    description: 'Engine oil change and filter replacement',
    isCancel: false,
  },
  {
    wrID: 2,
    branchID: 1,
    documentNo: 'WR-2024-002',
    orderDate: '2024-02-03',
    priorityType: 'NORMAL',
    status: 'IN PROGRESS',
    billingCustomerName: 'Siam Freight',
    vendorName: 'BBB Garage',
    vendorCode: 'VND-002',
    equipmentCode: 'EQ-002',
    description: 'Brake pad inspection and replacement',
    isCancel: false,
  },
  {
    wrID: 3,
    branchID: 1,
    documentNo: 'WR-2024-003',
    orderDate: '2024-02-10',
    priorityType: 'URGENT',
    status: 'SUBMITTED',
    equipmentCode: 'EQ-007',
    description: 'Engine overhaul - major repair',
    isCancel: false,
  },
  {
    wrID: 4,
    branchID: 1,
    documentNo: 'WR-2024-004',
    orderDate: '2024-03-05',
    priorityType: 'NORMAL',
    status: 'DRAFT',
    equipmentCode: 'EQ-003',
    description: 'Forklift 1000h service',
    isCancel: false,
  },
  {
    wrID: 5,
    branchID: 1,
    documentNo: 'WR-2024-005',
    orderDate: '2024-03-12',
    priorityType: 'HIGH',
    status: 'COMPLETED',
    billingCustomerName: 'Fast Track',
    vendorName: 'CCC Motors',
    equipmentCode: 'EQ-004',
    description: 'Tyre rotation and balancing',
    isCancel: false,
  },
  {
    wrID: 6,
    branchID: 1,
    documentNo: 'WR-2024-006',
    orderDate: '2024-04-01',
    priorityType: 'NORMAL',
    status: 'CANCELLED',
    equipmentCode: 'EQ-009',
    description: 'Annual inspection',
    isCancel: true,
    remarks: 'Cancelled - equipment disposed',
  },
  {
    wrID: 7,
    branchID: 1,
    documentNo: 'WR-2024-007',
    orderDate: '2024-04-15',
    priorityType: 'HIGH',
    status: 'SUBMITTED',
    equipmentCode: 'EQ-006',
    description: 'Electrical system fault diagnosis',
    isCancel: false,
  },
  {
    wrID: 8,
    branchID: 1,
    documentNo: 'WR-2024-008',
    orderDate: '2024-04-20',
    priorityType: 'NORMAL',
    status: 'DRAFT',
    equipmentCode: 'EQ-005',
    description: 'Trailer brake adjustment',
    isCancel: false,
  },
]

export const MOCK_WORK_REQUESTS = SEED
