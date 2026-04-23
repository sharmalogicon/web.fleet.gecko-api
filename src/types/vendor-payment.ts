import { z } from 'zod'

export interface VendorPaymentLine {
  lineID: number
  workOrderNo?: string
  repairCode?: string
  containerNo?: string
  size?: string
  eirNo?: string
  responsibility?: string
  vat?: number
  vatAmount?: number
  totalAmount: number
}

export const vendorPaymentSchema = z.object({
  receiptNo: z.string().min(1, 'Receipt No. is required'),
  receiptDate: z.string().min(1, 'Receipt Date is required'),
  vendorCode: z.string().optional(),
  vendorName: z.string().optional(),
  address: z.string().optional(),
  baseAmount: z.coerce.number().optional(),
  totalAmount: z.coerce.number(),
  vat: z.coerce.number().optional(),
  vatAmount: z.coerce.number().optional(),
  remarks: z.string().optional(),
  isApproved: z.boolean(),
  approvedBy: z.string().optional(),
  approvedOn: z.string().optional(),
})

export type VendorPaymentFormValues = z.infer<typeof vendorPaymentSchema>

export interface VendorPayment extends VendorPaymentFormValues {
  vendorPaymentID: number
  lines: VendorPaymentLine[]
}

export interface VendorPaymentSearchCriteria {
  receiptNo?: string
  vendorName?: string
  isApproved?: boolean | 'ALL'
  dateFrom?: string
  dateTo?: string
}

export const NEW_VENDOR_PAYMENT_DEFAULTS: VendorPaymentFormValues = {
  receiptNo: '',
  receiptDate: new Date().toISOString().split('T')[0],
  vendorCode: '',
  vendorName: '',
  address: '',
  baseAmount: 0,
  totalAmount: 0,
  vat: 7,
  vatAmount: 0,
  remarks: '',
  isApproved: false,
  approvedBy: '',
  approvedOn: '',
}
