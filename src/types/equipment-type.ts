import { z } from 'zod'

export const equipmentTypeSchema = z.object({
  equipmentSize: z.string().min(1, 'Size is required'),
  equipmentType: z.string().min(1, 'Type is required'),
  description: z.string().min(1, 'Description is required'),
  height: z.string().optional(),
  isoCode: z.string().optional(),
  teu: z.string().optional(),
  mappingCode: z.string().optional(),
  isContainer: z.boolean().default(false),
  isReefer: z.boolean().default(false),
  tareWeight: z.coerce.number().optional(),
  grossWeight: z.coerce.number().optional(),
  maxGrossWeight: z.coerce.number().optional(),
})

export type EquipmentTypeFormValues = z.infer<typeof equipmentTypeSchema>

export type EquipmentTypeRecord = EquipmentTypeFormValues & {
  equipmentTypeSizeID: number
  equipmentTypeSize: string
}

export interface EquipmentTypeSearchCriteria {
  search?: string
}

export const NEW_EQUIPMENT_TYPE_DEFAULTS: EquipmentTypeFormValues = {
  equipmentSize: '',
  equipmentType: '',
  description: '',
  isContainer: false,
  isReefer: false,
}
