import { z } from 'zod'

export type TyreStatus = 'NEW' | 'USED' | 'RECAP' | 'SCRAP'
export type TyreCondition = 'GOOD' | 'FAIR' | 'POOR'
export type TyrePosition =
  | 'FRONT_LEFT'
  | 'FRONT_RIGHT'
  | 'REAR_LEFT_OUTER'
  | 'REAR_LEFT_INNER'
  | 'REAR_RIGHT_OUTER'
  | 'REAR_RIGHT_INNER'

export const tireProfileSchema = z.object({
  serialNo: z.string().min(1, 'Serial No. is required'),
  brand: z.string().min(1, 'Brand is required'),
  model: z.string().optional(),
  tyreSize: z.string().min(1, 'Tyre Size is required'),
  tyreStatus: z.enum(['NEW', 'USED', 'RECAP', 'SCRAP']),
  condition: z.enum(['GOOD', 'FAIR', 'POOR']),
  tyrePressure: z.coerce.number().optional(),
  tyreThread: z.coerce.number().optional(),
  isActive: z.boolean(),

  // Mileage
  anticipatedMileage: z.coerce.number().optional(),
  actualMileage: z.coerce.number().optional(),
  anticipatedHour: z.coerce.number().optional(),
  actualHour: z.coerce.number().optional(),

  // Purchase info
  purchasedDate: z.string().optional(),
  purchasedPrice: z.coerce.number().optional(),
  vendorName: z.string().optional(),
  vendorInvoiceNo: z.string().optional(),
  warrantyMileage: z.coerce.number().optional(),
  warrantyDate: z.string().optional(),
  poNo: z.string().optional(),

  // Equipment info
  equipmentCode: z.string().optional(),
  registrationNo: z.string().optional(),
  tyrePosition: z.string().optional(),
  dateInstalled: z.string().optional(),

  remarks: z.string().optional(),
})

export type TireProfileFormValues = z.infer<typeof tireProfileSchema>

export interface TireProfile extends TireProfileFormValues {
  tireProfileID: number
  // Recap stats (readonly)
  timeRecaped?: number
  recapCost?: number
  totalInspectionCost?: number
  totalRepairCost?: number
}

export interface TireProfileSearchCriteria {
  serialNo?: string
  brand?: string
  tyreStatus?: string
  isActive?: string
}

export const NEW_TIRE_PROFILE_DEFAULTS: TireProfileFormValues = {
  serialNo: '',
  brand: '',
  model: '',
  tyreSize: '',
  tyreStatus: 'NEW',
  condition: 'GOOD',
  tyrePressure: undefined,
  tyreThread: undefined,
  isActive: true,
  anticipatedMileage: undefined,
  actualMileage: undefined,
  anticipatedHour: undefined,
  actualHour: undefined,
  purchasedDate: '',
  purchasedPrice: undefined,
  vendorName: '',
  vendorInvoiceNo: '',
  warrantyMileage: undefined,
  warrantyDate: '',
  poNo: '',
  equipmentCode: '',
  registrationNo: '',
  tyrePosition: '',
  dateInstalled: '',
  remarks: '',
}
