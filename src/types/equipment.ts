import { z } from 'zod'
import { optNum } from '@/lib/utils/zod'

export type EquipmentStatus = 'ACTIVE' | 'INACTIVE' | 'UNDER REPAIR' | 'DISPOSED'

export const EQUIPMENT_STATUS_MAP: Record<number, EquipmentStatus> = {
  1: 'ACTIVE',
  2: 'INACTIVE',
  3: 'UNDER REPAIR',
  4: 'DISPOSED',
}

export const equipmentSchema = z.object({
  code: z.string().min(1, 'Equipment code is required'),
  equipmentType: z.string().optional(),
  category: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'UNDER REPAIR', 'DISPOSED']),
  brand: z.string().optional(),
  model: z.string().optional(),
  ownership: z.string().optional(),
  registrationNo: z.string().optional(),
  engineNo: z.string().optional(),
  chassisNo: z.string().optional(),
  licenseNo: z.string().optional(),
  meterType: z.string().optional(),
  currentMeter: optNum,
  yearOfManufacture: optNum,
  purchaseDate: z.string().optional(),
  purchasePrice: optNum,
  customerName: z.string().optional(),
  driverName: z.string().optional(),
  driverID: optNum,
  remarks: z.string().optional(),
  axleLayoutId: z.string().optional(),
  // Spec tab
  grossWeight: optNum,
  netWeight: optNum,
  length: optNum,
  width: optNum,
  height: optNum,
  engineCapacity: optNum,
  horsePower: optNum,
  fuelType: z.string().optional(),
  fuelCapacity: optNum,
  payload: optNum,
})

export type EquipmentFormValues = z.infer<typeof equipmentSchema>

export type Equipment = EquipmentFormValues & {
  equipmentID: number
  branchID: number
}

export interface EquipmentSearchCriteria {
  code?: string
  category?: string
  status?: string
}

export const NEW_EQUIPMENT_DEFAULTS: EquipmentFormValues = {
  code: '',
  status: 'ACTIVE',
}
