import { z } from 'zod'

export interface StandardRateLine {
  lineID: number
  chargeCode: string
  chargeDescription?: string
  orderType?: string
  movementCode?: string
  chargeType?: string
  billingUnit?: string
  size?: string
  paymentTo?: string
  sellRate: number
}

export const standardRateSchema = z.object({
  rateCode: z.string().min(1, 'Rate Code is required'),
  rateDate: z.string().min(1, 'Rate Date is required'),
  effectiveDate: z.string().min(1, 'Effective Date is required'),
  description: z.string().optional(),
  remarks: z.string().optional(),
  approvedBy: z.string().optional(),
  approvedOn: z.string().optional(),
})

export type StandardRateFormValues = z.infer<typeof standardRateSchema>

export interface StandardRate extends StandardRateFormValues {
  standardRateID: number
  isApproved: boolean
  lines: StandardRateLine[]
}

export interface StandardRateSearchCriteria {
  rateCode?: string
  description?: string
  isApproved?: boolean | 'all'
}

export const NEW_STANDARD_RATE_DEFAULTS: StandardRateFormValues = {
  rateCode: '',
  rateDate: '',
  effectiveDate: '',
  description: '',
  remarks: '',
  approvedBy: '',
  approvedOn: '',
}
