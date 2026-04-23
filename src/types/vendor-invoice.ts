import { z } from 'zod'

export interface VendorInvoiceLine {
  lineID: number
  stockCode?: string
  stockType?: string
  description?: string
  quantity: number
  unitPrice: number
  totalAmount: number
  vendorInvoiceRef?: string
  vat?: number
  netAmount?: number
  registrationNo?: string
}

export const vendorInvoiceSchema = z.object({
  documentNo: z.string().min(1, 'Document No. is required'),
  documentDate: z.string().min(1, 'Document Date is required'),
  customerCode: z.string().optional(),
  customerName: z.string().optional(),
  vendorInvoiceNo: z.string().optional(),
  address: z.string().optional(),
  creditTerm: z.string().optional(),
  discountType: z.enum(['PERCENT', 'AMOUNT']).optional(),
  discount: z.coerce.number().optional(),
  discountAmount: z.coerce.number().optional(),
  vat: z.coerce.number().optional(),
  vatAmount: z.coerce.number().optional(),
  totalAmount: z.coerce.number(),
  nettAmount: z.coerce.number().optional(),
  isWithholdingTax: z.boolean().optional(),
  remarks: z.string().optional(),
})

export type VendorInvoiceFormValues = z.infer<typeof vendorInvoiceSchema>

export interface VendorInvoice extends VendorInvoiceFormValues {
  vendorInvoiceID: number
  status: 'ACTIVE' | 'CANCELLED'
  lines: VendorInvoiceLine[]
}

export interface VendorInvoiceSearchCriteria {
  documentNo?: string
  customerName?: string
  vendorInvoiceNo?: string
  status?: string
  dateFrom?: string
  dateTo?: string
}

export const NEW_VENDOR_INVOICE_DEFAULTS: VendorInvoiceFormValues = {
  documentNo: '',
  documentDate: new Date().toISOString().split('T')[0],
  customerCode: '',
  customerName: '',
  vendorInvoiceNo: '',
  address: '',
  creditTerm: '',
  discountType: undefined,
  discount: 0,
  discountAmount: 0,
  vat: 7,
  vatAmount: 0,
  totalAmount: 0,
  nettAmount: 0,
  isWithholdingTax: false,
  remarks: '',
}
