import { z } from 'zod'

export interface POLine {
  lineID: number
  stockCode: string
  stockDescription?: string
  uom: string
  unitPrice: number
  quantity: number
  discountType?: 'PERCENT' | 'AMOUNT'
  discountAmount?: number
  totalAmount: number
  receivedQty?: number
  pendingQty?: number
  poPrice?: number
  remarks?: string
}

export const purchaseOrderSchema = z.object({
  documentNo: z.string().min(1, 'Document No. is required'),
  documentDate: z.string().min(1, 'Document Date is required'),
  requireDate: z.string().min(1, 'Required By date is required'),
  vendorName: z.string().min(1, 'Vendor Name is required'),
  vendorCode: z.string().optional(),
  vendorQuotationNo: z.string().optional(),
  orderBy: z.string().optional(),
  creditTerm: z.string().optional(),
  goodsRequestNo: z.string().optional(),
  discountAmount: z.coerce.number().optional(),
  totalVAT: z.coerce.number().optional(),
  nettAmount: z.coerce.number().optional(),
  totalAmount: z.coerce.number(),
  vat: z.coerce.number().optional(),
  remarks: z.string().optional(),
  approvedBy: z.string().optional(),
  approvedOn: z.string().optional(),
})

export type PurchaseOrderFormValues = z.infer<typeof purchaseOrderSchema>

export interface PurchaseOrder extends PurchaseOrderFormValues {
  purchaseOrderID: number
  isApproved: boolean
  isCancel: boolean
  lines: POLine[]
}

export interface PurchaseOrderSearchCriteria {
  documentNo?: string
  vendorName?: string
  status?: string
  dateFrom?: string
  dateTo?: string
}

export const NEW_PO_DEFAULTS: PurchaseOrderFormValues = {
  documentNo: '',
  documentDate: new Date().toISOString().split('T')[0],
  requireDate: '',
  vendorName: '',
  vendorCode: '',
  vendorQuotationNo: '',
  orderBy: '',
  creditTerm: '',
  goodsRequestNo: '',
  discountAmount: 0,
  totalVAT: 0,
  nettAmount: 0,
  totalAmount: 0,
  vat: 7,
  remarks: '',
  approvedBy: '',
  approvedOn: '',
}
