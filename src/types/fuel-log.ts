import { z } from 'zod'

export const FUEL_SOURCE_OPTIONS = ['OWN_TANK', 'VENDOR'] as const
export type FuelSource = (typeof FUEL_SOURCE_OPTIONS)[number]

export const FUEL_LOG_STATUS_MAP: Record<string, string> = {
  APPROVED: 'bg-green-100 text-green-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
}

export const fuelLogSchema = z.object({
  equipmentCode: z.string().min(1, 'Equipment is required'),
  meterUpdateDate: z.string().min(1, 'Date is required'),
  voucherNo: z.string().optional(),
  tankMeter: z.coerce.number().min(0),
  meterRead: z.coerce.number().optional(),
  hourMeter: z.coerce.number().optional(),
  driverName: z.string().optional(),
  driverCard: z.string().optional(),
  fuelSource: z.enum(['OWN_TANK', 'VENDOR']),
  vendorName: z.string().optional(),
  costPerLiter: z.coerce.number().optional(),
  totalAmount: z.coerce.number().optional(),
  totalDistance: z.coerce.number().optional(),
  avgCostPerKM: z.coerce.number().optional(),
  totalHour: z.coerce.number().optional(),
  avgCostPerHour: z.coerce.number().optional(),
  remarks: z.string().optional(),
})

export type FuelLogFormValues = z.infer<typeof fuelLogSchema>

export interface FuelLog extends FuelLogFormValues {
  fuelLogID: number
  registrationNo?: string
  isApproved: boolean
  approvedBy?: string
  approvedOn?: string
}

export interface FuelLogSearchCriteria {
  equipmentCode?: string
  driverName?: string
  dateFrom?: string
  dateTo?: string
  status?: string
}

export const NEW_FUEL_LOG_DEFAULTS: FuelLogFormValues = {
  equipmentCode: '',
  meterUpdateDate: new Date().toISOString().split('T')[0],
  voucherNo: '',
  tankMeter: 0,
  fuelSource: 'OWN_TANK',
}
