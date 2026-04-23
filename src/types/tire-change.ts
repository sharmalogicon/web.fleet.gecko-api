import { z } from 'zod'

export interface TireChangeLine {
  lineID: number
  oldSerialNo: string
  newSerialNo?: string
  tyrePosition: string
  condition: string
  remarks?: string
}

export const tireChangeSchema = z.object({
  documentNo: z.string().min(1, 'Document No. is required'),
  equipmentCode: z.string().min(1, 'Equipment Code is required'),
  equipmentType: z.string().optional(),
  changeDate: z.string().min(1, 'Change Date is required'),
  changeBy: z.string().optional(),
  workOrderNo: z.string().optional(),
  driverName: z.string().optional(),
  totalHrs: z.coerce.number().optional(),
  category: z.string().optional(),
  meterRead: z.coerce.number().optional(),
  remarks: z.string().optional(),
})

export type TireChangeFormValues = z.infer<typeof tireChangeSchema>

export interface TireChange extends TireChangeFormValues {
  tireChangeID: number
  lines: TireChangeLine[]
}

export interface TireChangeSearchCriteria {
  documentNo?: string
  equipmentCode?: string
  dateFrom?: string
  dateTo?: string
}

export const NEW_TIRE_CHANGE_DEFAULTS: TireChangeFormValues = {
  documentNo: '',
  equipmentCode: '',
  equipmentType: '',
  changeDate: '',
  changeBy: '',
  workOrderNo: '',
  driverName: '',
  totalHrs: undefined,
  category: '',
  meterRead: undefined,
  remarks: '',
}
