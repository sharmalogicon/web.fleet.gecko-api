import { z } from 'zod'

export interface ReturnLine {
  lineID: number
  poNo: string
  serialNo?: string
  stockCode: string
  stockDescription?: string
  quantity: number
  unitPrice: number
  totalAmount: number
}

export const returnToVendorSchema = z.object({
  documentNo: z.string().min(1, 'Document No. is required'),
  returnDate: z.string().min(1, 'Return Date is required'),
  vendorName: z.string().min(1, 'Vendor Name is required'),
  vendorCode: z.string().optional(),
  returnBy: z.string().optional(),
  remarks: z.string().optional(),
  totalAmount: z.number().min(0),
})

export type ReturnToVendorFormValues = z.infer<typeof returnToVendorSchema>

export interface ReturnToVendor extends ReturnToVendorFormValues {
  returnID: number
  lines: ReturnLine[]
}

export interface ReturnToVendorSearchCriteria {
  documentNo?: string
  vendorName?: string
  dateFrom?: string
  dateTo?: string
}

export const NEW_RETURN_DEFAULTS: ReturnToVendorFormValues = {
  documentNo: '',
  returnDate: new Date().toISOString().split('T')[0],
  vendorName: '',
  vendorCode: '',
  returnBy: '',
  remarks: '',
  totalAmount: 0,
}
