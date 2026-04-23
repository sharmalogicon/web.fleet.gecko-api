import { z } from 'zod'

export const meterHrLogSchema = z.object({
  equipmentCode: z.string().min(1, 'Equipment is required'),
  meterUpdateDate: z.string().min(1, 'Date is required'),
  meterType: z.string().min(1, 'Meter type is required'),
  meterRead: z.coerce.number().min(0, 'Meter reading is required'),
  sequenceNo: z.string().optional(),
  driverName: z.string().optional(),
  distanceTravel: z.coerce.number().optional(),
  totalWorkingHr: z.coerce.number().optional(),
  totalDistance: z.coerce.number().optional(),
  totalHours: z.coerce.number().optional(),
  remarks: z.string().optional(),
})

export type MeterHrLogFormValues = z.infer<typeof meterHrLogSchema>

export interface MeterHrLog extends MeterHrLogFormValues {
  meterHrLogID: number
  registrationNo?: string
}

export interface MeterHrLogSearchCriteria {
  equipmentCode?: string
  dateFrom?: string
  dateTo?: string
}

export const NEW_METER_HR_LOG_DEFAULTS: MeterHrLogFormValues = {
  equipmentCode: '',
  meterUpdateDate: new Date().toISOString().split('T')[0],
  meterType: 'KM',
  meterRead: 0,
}
