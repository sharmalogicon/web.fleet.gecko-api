import { z } from 'zod'

export interface WOInvoiceLine {
  lineID: number
  workOrderNo: string
  serviceType?: string
  chargeCode?: string
  transactionType?: string
  equipmentCode?: string
  quantity: number
  unitPrice: number
  totalAmount: number
  stockType?: string
}

export const woInvoiceSchema = z.object({
  receiptNo: z.string().min(1, 'Receipt No. is required'),
  cashReceiptDate: z.string().min(1, 'Cash Receipt Date is required'),
  customerCode: z.string().optional(),
  customerName: z.string().optional(),
  address: z.string().optional(),
  creditTerm: z.string().optional(),
  workOrderDiscount: z.coerce.number().optional(),
  vat: z.coerce.number().optional(),
  vatAmount: z.coerce.number().optional(),
  nettAmount: z.coerce.number().optional(),
  totalAmount: z.coerce.number(),
  remarks: z.string().optional(),
})

export type WOInvoiceFormValues = z.infer<typeof woInvoiceSchema>

export interface WOInvoice extends WOInvoiceFormValues {
  woInvoiceID: number
  status: 'ACTIVE' | 'CANCELLED'
  lines: WOInvoiceLine[]
}

export interface WOInvoiceSearchCriteria {
  receiptNo?: string
  customerName?: string
  status?: string
  dateFrom?: string
  dateTo?: string
}

export const NEW_WO_INVOICE_DEFAULTS: WOInvoiceFormValues = {
  receiptNo: '',
  cashReceiptDate: new Date().toISOString().split('T')[0],
  customerCode: '',
  customerName: '',
  address: '',
  creditTerm: '',
  workOrderDiscount: 0,
  vat: 7,
  vatAmount: 0,
  nettAmount: 0,
  totalAmount: 0,
  remarks: '',
}
