import { z } from 'zod'

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
  currentMeter: z.coerce.number().optional(),
  yearOfManufacture: z.coerce.number().optional(),
  purchaseDate: z.string().optional(),
  purchasePrice: z.coerce.number().optional(),
  customerName: z.string().optional(),
  driverName: z.string().optional(),
  driverID: z.coerce.number().optional(),
  remarks: z.string().optional(),
  // Spec tab
  grossWeight: z.coerce.number().optional(),
  netWeight: z.coerce.number().optional(),
  length: z.coerce.number().optional(),
  width: z.coerce.number().optional(),
  height: z.coerce.number().optional(),
  engineCapacity: z.coerce.number().optional(),
  horsePower: z.coerce.number().optional(),
  fuelType: z.string().optional(),
  fuelCapacity: z.coerce.number().optional(),
  payload: z.coerce.number().optional(),
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
