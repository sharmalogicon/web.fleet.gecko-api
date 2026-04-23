import { z } from 'zod'

export interface VendorCreditNoteLine {
  lineID: number
  transactionNo?: string
  equipmentCode?: string
  glCode?: string
  code?: string
  description?: string
}

export const vendorCreditNoteSchema = z.object({
  creditNoteNo: z.string().min(1, 'Credit Note No. is required'),
  creditNoteDate: z.string().min(1, 'Credit Note Date is required'),
  vendorCode: z.string().optional(),
  vendorName: z.string().optional(),
  address: z.string().optional(),
  creditTerm: z.string().optional(),
  discountType: z.enum(['PERCENT', 'AMOUNT']).optional(),
  discount: z.coerce.number().optional(),
  discountAmount: z.coerce.number().optional(),
  taxType: z.string().optional(),
  vat: z.coerce.number().optional(),
  vatAmount: z.coerce.number().optional(),
  totalAmount: z.coerce.number(),
  nettAmount: z.coerce.number().optional(),
  remarks: z.string().optional(),
})

export type VendorCreditNoteFormValues = z.infer<typeof vendorCreditNoteSchema>

export interface VendorCreditNote extends VendorCreditNoteFormValues {
  vendorCreditNoteID: number
  status: 'ACTIVE' | 'CANCELLED'
  lines: VendorCreditNoteLine[]
}

export interface VendorCreditNoteSearchCriteria {
  creditNoteNo?: string
  vendorName?: string
  status?: string
  dateFrom?: string
  dateTo?: string
}

export const NEW_VENDOR_CREDIT_NOTE_DEFAULTS: VendorCreditNoteFormValues = {
  creditNoteNo: '',
  creditNoteDate: new Date().toISOString().split('T')[0],
  vendorCode: '',
  vendorName: '',
  address: '',
  creditTerm: '',
  discountType: undefined,
  discount: 0,
  discountAmount: 0,
  taxType: 'VAT',
  vat: 7,
  vatAmount: 0,
  totalAmount: 0,
  nettAmount: 0,
  remarks: '',
}
