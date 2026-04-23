import { z } from 'zod'

export type AccidentType = 'COLLISION' | 'ROLLOVER' | 'FIRE' | 'THEFT' | 'OTHER'
export type Responsibility = 'DRIVER' | 'THIRD_PARTY' | 'SHARED' | 'UNKNOWN'

export interface AccidentImage {
  imageID: number
  filename: string
  url: string
  uploadedAt: string
}

export const accidentReportSchema = z.object({
  documentNo: z.string().min(1, 'Document No. is required'),
  accidentDate: z.string().min(1, 'Accident Date is required'),
  equipmentCode: z.string().min(1, 'Equipment Code is required'),
  driverName: z.string().optional(),
  driverID: z.string().optional(),
  accidentType: z.enum(['COLLISION', 'ROLLOVER', 'FIRE', 'THEFT', 'OTHER']),
  accidentLocation: z.string().optional(),
  policeStation: z.string().optional(),
  policeReportNo: z.string().optional(),
  insPolicyNo: z.string().optional(),
  refClaimNo: z.string().optional(),
  responsibility: z.enum(['DRIVER', 'THIRD_PARTY', 'SHARED', 'UNKNOWN']),
  insClaimable: z.boolean(),
  aboutAccident: z.string().optional(),
  damageDetails: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
})

export type AccidentReportFormValues = z.infer<typeof accidentReportSchema>

export interface AccidentReport extends AccidentReportFormValues {
  accidentID: number
  images: AccidentImage[]
}

export interface AccidentReportSearchCriteria {
  equipmentCode?: string
  driverName?: string
  accidentType?: string
  dateFrom?: string
  dateTo?: string
}

export const NEW_ACCIDENT_DEFAULTS: AccidentReportFormValues = {
  documentNo: '',
  accidentDate: '',
  equipmentCode: '',
  driverName: '',
  driverID: '',
  accidentType: 'COLLISION',
  accidentLocation: '',
  policeStation: '',
  policeReportNo: '',
  insPolicyNo: '',
  refClaimNo: '',
  responsibility: 'UNKNOWN',
  insClaimable: false,
  aboutAccident: '',
  damageDetails: '',
  address: '',
  city: '',
  country: '',
}
