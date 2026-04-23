import { z } from 'zod'

export interface WOCreditNoteLine {
  lineID: number
  woNo: string
  transactionNo?: string
  registrationNo?: string
  serviceType?: string
  glCode?: string
  code?: string
  description?: string
}

export const woCreditNoteSchema = z.object({
  creditNoteNo: z.string().min(1, 'Credit Note No. is required'),
  creditNoteDate: z.string().min(1, 'Credit Note Date is required'),
  customerCode: z.string().optional(),
  customerName: z.string().optional(),
  address: z.string().optional(),
  creditTerm: z.string().optional(),
  discountType: z.enum(['PERCENT', 'AMOUNT']).optional(),
  discount: z.coerce.number().optional(),
  taxType: z.string().optional(),
  vat: z.coerce.number().optional(),
  totalAmount: z.coerce.number(),
  vatAmount: z.coerce.number().optional(),
  nettAmount: z.coerce.number().optional(),
  remarks: z.string().optional(),
})

export type WOCreditNoteFormValues = z.infer<typeof woCreditNoteSchema>

export interface WOCreditNote extends WOCreditNoteFormValues {
  woCreditNoteID: number
  status: 'ACTIVE' | 'CANCELLED'
  lines: WOCreditNoteLine[]
}

export interface WOCreditNoteSearchCriteria {
  creditNoteNo?: string
  customerName?: string
  status?: string
  dateFrom?: string
  dateTo?: string
}

export const NEW_WO_CREDIT_NOTE_DEFAULTS: WOCreditNoteFormValues = {
  creditNoteNo: '',
  creditNoteDate: new Date().toISOString().split('T')[0],
  customerCode: '',
  customerName: '',
  address: '',
  creditTerm: '',
  discountType: undefined,
  discount: 0,
  taxType: 'VAT',
  vat: 7,
  totalAmount: 0,
  vatAmount: 0,
  nettAmount: 0,
  remarks: '',
}
