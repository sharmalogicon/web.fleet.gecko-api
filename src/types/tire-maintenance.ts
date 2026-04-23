import { z } from 'zod'

export type MaintenanceType = 'INSPECTION' | 'REPAIR' | 'RETREAD'

export interface TireMaintenanceLine {
  lineID: number
  transactionType: MaintenanceType
  serialNo: string
  meterRead?: number
  recapCount?: number
  tyreThread?: number
  tyreThreadBefore?: number
  tyreThreadAfter?: number
  remarks?: string
}

export const tireMaintenanceSchema = z.object({
  documentNo: z.string().min(1, 'Document No. is required'),
  documentDate: z.string().min(1, 'Document Date is required'),
  equipmentCode: z.string().optional(),
  vendorName: z.string().min(1, 'Vendor Name is required'),
  inspector: z.string().optional(),
  meterRead: z.coerce.number().optional(),
  totalHours: z.coerce.number().optional(),
  driverName: z.string().optional(),
  inspectionDate: z.string().optional(),
  requiredDate: z.string().optional(),
  totalAmount: z.coerce.number().default(0),
  vat: z.coerce.number().optional(),
  vatAmount: z.coerce.number().optional(),
  nettAmount: z.coerce.number().optional(),
  billingCustomerName: z.string().optional(),
  remarks: z.string().optional(),
})

export type TireMaintenanceFormValues = z.infer<typeof tireMaintenanceSchema>

export interface TireMaintenance extends TireMaintenanceFormValues {
  maintenanceID: number
  lines: TireMaintenanceLine[]
}

export interface TireMaintenanceSearchCriteria {
  documentNo?: string
  equipmentCode?: string
  vendorName?: string
  dateFrom?: string
  dateTo?: string
}

export const NEW_TIRE_MAINTENANCE_DEFAULTS: TireMaintenanceFormValues = {
  documentNo: '',
  documentDate: '',
  equipmentCode: '',
  vendorName: '',
  inspector: '',
  meterRead: undefined,
  totalHours: undefined,
  driverName: '',
  inspectionDate: '',
  requiredDate: '',
  totalAmount: 0,
  vat: undefined,
  vatAmount: undefined,
  nettAmount: undefined,
  billingCustomerName: '',
  remarks: '',
}
