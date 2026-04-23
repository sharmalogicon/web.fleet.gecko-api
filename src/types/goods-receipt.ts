import { z } from 'zod'

export interface GoodsReceiptLine {
  lineID: number
  stockCode: string
  stockDescription?: string
  uom: string
  poQty?: number
  receivedQty: number
  unitPrice: number
  totalAmount: number
  remarks?: string
}

export const goodsReceiptSchema = z.object({
  documentNo: z.string().min(1, 'Document No. is required'),
  documentDate: z.string().min(1, 'Document Date is required'),
  vendorName: z.string().min(1, 'Vendor Name is required'),
  poNo: z.string().optional(),
  receiptBy: z.string().optional(),
  remarks: z.string().optional(),
  totalAmount: z.coerce.number(),
})

export type GoodsReceiptFormValues = z.infer<typeof goodsReceiptSchema>

export interface GoodsReceipt extends GoodsReceiptFormValues {
  goodsReceiptID: number
  isCancel: boolean
  lines: GoodsReceiptLine[]
}

export interface GoodsReceiptSearchCriteria {
  documentNo?: string
  vendorName?: string
  status?: string
  dateFrom?: string
  dateTo?: string
}

export const NEW_GOODS_RECEIPT_DEFAULTS: GoodsReceiptFormValues = {
  documentNo: '',
  documentDate: new Date().toISOString().split('T')[0],
  vendorName: '',
  poNo: '',
  receiptBy: '',
  remarks: '',
  totalAmount: 0,
}
