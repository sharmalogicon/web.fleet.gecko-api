import type { ServiceType } from '@/types/service-type'

let _store: ServiceType[] | null = null
function getStore(): ServiceType[] { if (!_store) _store = [...SEED]; return _store }
export function getMockServiceTypes(): ServiceType[] { return getStore() }
export function upsertMockServiceType(s: ServiceType): void {
  const store = getStore(); const idx = store.findIndex((r) => r.serviceTypeID === s.serviceTypeID)
  if (idx >= 0) store[idx] = s; else _store = [...store, s]
}
export function removeMockServiceType(id: number): void { _store = getStore().filter((r) => r.serviceTypeID !== id) }

const SEED: ServiceType[] = [
  { serviceTypeID: 1, branchID: 1, code: 'SVC-001', description: 'Oil & Filter Change', serviceCategory: 'ENGINE', estimationDuration: 2, advanceNotifyDay: 7, advanceNotifyKM: 500, isActive: true },
  { serviceTypeID: 2, branchID: 1, code: 'SVC-002', description: 'Major Engine Overhaul', serviceCategory: 'ENGINE', estimationDuration: 48, isActive: true },
  { serviceTypeID: 3, branchID: 1, code: 'SVC-003', description: 'Brake System Inspection', serviceCategory: 'BRAKE', estimationDuration: 3, advanceNotifyDay: 14, advanceNotifyKM: 1000, isActive: true },
  { serviceTypeID: 4, branchID: 1, code: 'SVC-004', description: 'Brake Pad Replacement', serviceCategory: 'BRAKE', estimationDuration: 4, isActive: true },
  { serviceTypeID: 5, branchID: 1, code: 'SVC-005', description: 'Tyre Rotation & Balance', serviceCategory: 'TYRE', estimationDuration: 2, advanceNotifyDay: 30, advanceNotifyKM: 5000, isActive: true },
  { serviceTypeID: 6, branchID: 1, code: 'SVC-006', description: 'Tyre Replacement', serviceCategory: 'TYRE', estimationDuration: 3, isActive: true },
  { serviceTypeID: 7, branchID: 1, code: 'SVC-007', description: 'Electrical System Check', serviceCategory: 'ELECTRICAL', estimationDuration: 4, isActive: true },
  { serviceTypeID: 8, branchID: 1, code: 'SVC-008', description: '10,000 KM Preventive Maintenance', serviceCategory: 'PM', estimationDuration: 6, advanceNotifyDay: 14, advanceNotifyKM: 500, isActive: true },
  { serviceTypeID: 9, branchID: 1, code: 'SVC-009', description: '50,000 KM Major Service', serviceCategory: 'PM', estimationDuration: 16, advanceNotifyDay: 30, advanceNotifyKM: 2000, isActive: true },
  { serviceTypeID: 10, branchID: 1, code: 'SVC-010', description: 'Annual Safety Inspection', serviceCategory: 'INSPECTION', estimationDuration: 8, advanceNotifyDay: 60, isActive: true },
  { serviceTypeID: 11, branchID: 1, code: 'SVC-011', description: 'Transmission Service', serviceCategory: 'TRANSMISSION', estimationDuration: 8, isActive: false },
  { serviceTypeID: 12, branchID: 1, code: 'SVC-012', description: 'Body Repair & Paint', serviceCategory: 'BODY', estimationDuration: 72, isActive: false },
]

export const MOCK_SERVICE_TYPES = SEED
