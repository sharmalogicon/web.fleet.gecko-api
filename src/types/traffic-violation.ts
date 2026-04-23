import { z } from 'zod'

export type ViolationType = 'SPEEDING' | 'PARKING' | 'RED_LIGHT' | 'NO_SEATBELT' | 'OTHER'

export const VIOLATION_TYPE_MAP: Record<ViolationType, string> = {
  SPEEDING: 'Speeding',
  PARKING: 'Illegal Parking',
  RED_LIGHT: 'Red Light',
  NO_SEATBELT: 'No Seatbelt',
  OTHER: 'Other',
}

export const trafficViolationSchema = z.object({
  ticketNo: z.string().min(1, 'Ticket No. is required'),
  violationDate: z.string().min(1, 'Violation Date is required'),
  equipmentCode: z.string().optional(),
  driverName: z.string().optional(),
  driverID: z.string().optional(),
  violationType: z.enum(['SPEEDING', 'PARKING', 'RED_LIGHT', 'NO_SEATBELT', 'OTHER']),
  violationTypeDescription: z.string().optional(),
  violationAmount: z.number().min(0, 'Amount must be 0 or more'),
  remarks: z.string().optional(),
})

export type TrafficViolationFormValues = z.infer<typeof trafficViolationSchema>

export interface TrafficViolation extends TrafficViolationFormValues {
  violationID: number
}

export interface TrafficViolationSearchCriteria {
  ticketNo?: string
  equipmentCode?: string
  violationType?: string
  dateFrom?: string
  dateTo?: string
}

export const NEW_VIOLATION_DEFAULTS: TrafficViolationFormValues = {
  ticketNo: '',
  violationDate: '',
  equipmentCode: '',
  driverName: '',
  driverID: '',
  violationType: 'SPEEDING',
  violationTypeDescription: '',
  violationAmount: 0,
  remarks: '',
}
