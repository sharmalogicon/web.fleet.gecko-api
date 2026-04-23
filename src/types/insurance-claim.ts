import { z } from 'zod'

export interface InsuranceClaimLine {
  lineID: number
  activityDescription?: string
  stockCode?: string
  stockDescription?: string
  quantity?: number
  unitPrice?: number
  totalAmount?: number
}

export const insuranceClaimSchema = z.object({
  documentNo: z.string().min(1, 'Document No. is required'),
  documentDate: z.string().min(1, 'Document Date is required'),
  accidentRefNo: z.string().min(1, 'Accident Ref No. is required'),
  claimRefNo: z.string().optional(),
  equipmentCode: z.string().optional(),
  equipmentCategory: z.string().optional(),
  driverName: z.string().optional(),
  driverID: z.string().optional(),
  vendorName: z.string().optional(),
  contactPerson: z.string().optional(),
  claimBy: z.string().optional(),
  totalAmount: z.number().default(0),
  discountAmount: z.number().optional(),
  vat: z.number().optional(),
  vatAmount: z.number().optional(),
  nettAmount: z.number().optional(),
  revisedFrom: z.string().optional(),
  remarks: z.string().optional(),
  isCancel: z.boolean().default(false),
})

export type InsuranceClaimFormValues = z.infer<typeof insuranceClaimSchema>

export interface InsuranceClaim extends InsuranceClaimFormValues {
  claimID: number
  lines: InsuranceClaimLine[]
}

export interface InsuranceClaimSearchCriteria {
  documentNo?: string
  accidentRefNo?: string
  vendorName?: string
  claimRefNo?: string
  isCancel?: boolean | 'all'
}

export const NEW_INSURANCE_CLAIM_DEFAULTS: InsuranceClaimFormValues = {
  documentNo: '',
  documentDate: '',
  accidentRefNo: '',
  claimRefNo: '',
  equipmentCode: '',
  equipmentCategory: '',
  driverName: '',
  driverID: '',
  vendorName: '',
  contactPerson: '',
  claimBy: '',
  totalAmount: 0,
  discountAmount: 0,
  vat: 7,
  vatAmount: 0,
  nettAmount: 0,
  revisedFrom: '',
  remarks: '',
  isCancel: false,
}
