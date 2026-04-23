import type { EquipmentTypeRecord } from '@/types/equipment-type'

const SEED: EquipmentTypeRecord[] = [
  { equipmentTypeSizeID: 1, equipmentSize: '20', equipmentType: 'GP', equipmentTypeSize: 'GP-20', description: '20ft General Purpose', height: 'STD', isoCode: '22G0', teu: '1', isContainer: true, isReefer: false, tareWeight: 2200, grossWeight: 24000, maxGrossWeight: 30480 },
  { equipmentTypeSizeID: 2, equipmentSize: '40', equipmentType: 'GP', equipmentTypeSize: 'GP-40', description: '40ft General Purpose', height: 'STD', isoCode: '42G0', teu: '2', isContainer: true, isReefer: false, tareWeight: 3800, grossWeight: 26500, maxGrossWeight: 30480 },
  { equipmentTypeSizeID: 3, equipmentSize: '40', equipmentType: 'HC', equipmentTypeSize: 'HC-40', description: '40ft High Cube', height: 'HC', isoCode: '45G0', teu: '2', isContainer: true, isReefer: false, tareWeight: 3900, grossWeight: 26540, maxGrossWeight: 30480 },
  { equipmentTypeSizeID: 4, equipmentSize: '20', equipmentType: 'RF', equipmentTypeSize: 'RF-20', description: '20ft Reefer', height: 'STD', isoCode: '22R0', teu: '1', isContainer: true, isReefer: true, tareWeight: 2800, grossWeight: 27400, maxGrossWeight: 30480 },
  { equipmentTypeSizeID: 5, equipmentSize: '40', equipmentType: 'RF', equipmentTypeSize: 'RF-40', description: '40ft Reefer High Cube', height: 'HC', isoCode: '45R0', teu: '2', isContainer: true, isReefer: true, tareWeight: 4800, grossWeight: 29000, maxGrossWeight: 34000 },
  { equipmentTypeSizeID: 6, equipmentSize: '20', equipmentType: 'OT', equipmentTypeSize: 'OT-20', description: '20ft Open Top', height: 'STD', isoCode: '22U0', teu: '1', isContainer: true, isReefer: false, tareWeight: 2400, grossWeight: 22000, maxGrossWeight: 30480 },
  { equipmentTypeSizeID: 7, equipmentSize: '45', equipmentType: 'HC', equipmentTypeSize: 'HC-45', description: '45ft High Cube', height: 'HC', isoCode: 'L5G0', teu: '2.25', isContainer: true, isReefer: false, tareWeight: 4700, grossWeight: 27600, maxGrossWeight: 32500 },
  { equipmentTypeSizeID: 8, equipmentSize: '10W', equipmentType: 'TRUCK', equipmentTypeSize: 'TRUCK-10W', description: '10-Wheel Truck', isContainer: false, isReefer: false },
  { equipmentTypeSizeID: 9, equipmentSize: '6W', equipmentType: 'TRUCK', equipmentTypeSize: 'TRUCK-6W', description: '6-Wheel Truck', isContainer: false, isReefer: false },
  { equipmentTypeSizeID: 10, equipmentSize: 'STD', equipmentType: 'TRAILER', equipmentTypeSize: 'TRAILER-STD', description: 'Standard Flatbed Trailer', isContainer: false, isReefer: false, tareWeight: 8000, grossWeight: 40000 },
]

export const MOCK_EQUIPMENT_TYPES = SEED

let _store: EquipmentTypeRecord[] | null = null

function getStore(): EquipmentTypeRecord[] {
  if (!_store) _store = [...SEED]
  return _store
}

export function getMockEquipmentTypes(): EquipmentTypeRecord[] {
  return getStore()
}

export function upsertMockEquipmentType(r: EquipmentTypeRecord): void {
  const store = getStore()
  const idx = store.findIndex((e) => e.equipmentTypeSizeID === r.equipmentTypeSizeID)
  if (idx >= 0) store[idx] = r
  else _store = [...store, r]
}

export function removeMockEquipmentType(id: number): void {
  _store = getStore().filter((e) => e.equipmentTypeSizeID !== id)
}
