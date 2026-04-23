import { z } from 'zod'

export interface CustomerRateLine {
  lineID: number
  chargeCode: string
  chargeDescription?: string
  orderType?: string
  movementCode?: string
  chargeType?: string
  billingUnit?: string
  size?: string
  paymentType?: string
  billTo?: string
  sellRate: number
}

export const customerRateSchema = z.object({
  quotationNo: z.string().min(1, 'Quotation No. is required'),
  quotationDate: z.string().min(1, 'Quotation Date is required'),
  effectiveDate: z.string().min(1, 'Effective Date is required'),
  expiryDate: z.string().min(1, 'Expiry Date is required'),
  customerCode: z.string().optional(),
  customerName: z.string().optional(),
  agentCode: z.string().optional(),
  forwarderCode: z.string().optional(),
  salesPerson: z.string().optional(),
  contactNo: z.string().optional(),
  remarks: z.string().optional(),
  approvedBy: z.string().optional(),
  approvedOn: z.string().optional(),
  createdBy: z.string().optional(),
})

export type CustomerRateFormValues = z.infer<typeof customerRateSchema>

export interface CustomerRate extends CustomerRateFormValues {
  customerRateID: number
  isApproved: boolean
  lines: CustomerRateLine[]
}

export interface CustomerRateSearchCriteria {
  quotationNo?: string
  customerName?: string
  agentCode?: string
  dateFrom?: string
  dateTo?: string
  isApproved?: boolean | 'all'
}

export const NEW_CUSTOMER_RATE_DEFAULTS: CustomerRateFormValues = {
  quotationNo: '',
  quotationDate: '',
  effectiveDate: '',
  expiryDate: '',
  customerCode: '',
  customerName: '',
  agentCode: '',
  forwarderCode: '',
  salesPerson: '',
  contactNo: '',
  remarks: '',
  approvedBy: '',
  approvedOn: '',
  createdBy: '',
}
