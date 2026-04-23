import { z } from 'zod'

export const METER_TYPE_OPTIONS = ['KM', 'HOUR', 'BOTH'] as const
export type MeterType = (typeof METER_TYPE_OPTIONS)[number]

export const meterLogSchema = z.object({
  equipmentCode: z.string().min(1, 'Equipment is required'),
  meterUpdateDate: z.string().min(1, 'Date is required'),
  meterType: z.enum(['KM', 'HOUR', 'BOTH']),
  meterRead: z.coerce.number().min(0, 'Meter reading is required'),
  hourMeter: z.coerce.number().optional(),
  driverName: z.string().optional(),
  totalDistance: z.coerce.number().optional(),
  remarks: z.string().optional(),
})

export type MeterLogFormValues = z.infer<typeof meterLogSchema>

export interface MeterLog extends MeterLogFormValues {
  meterLogID: number
  registrationNo?: string
}

export interface MeterLogSearchCriteria {
  equipmentCode?: string
  meterType?: string
  dateFrom?: string
  dateTo?: string
}

export const NEW_METER_LOG_DEFAULTS: MeterLogFormValues = {
  equipmentCode: '',
  meterUpdateDate: new Date().toISOString().split('T')[0],
  meterType: 'KM',
  meterRead: 0,
}
