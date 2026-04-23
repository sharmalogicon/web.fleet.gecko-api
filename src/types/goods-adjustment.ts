import { z } from 'zod'

export type AdjustmentType = 'INCREASE' | 'DECREASE' | 'TRANSFER' | 'WRITE_OFF'

export const ADJUSTMENT_TYPE_MAP: Record<AdjustmentType, string> = {
  INCREASE: 'Increase',
  DECREASE: 'Decrease',
  TRANSFER: 'Transfer',
  WRITE_OFF: 'Write Off',
}

export interface AdjustmentLine {
  lineID: number
  stockCode: string
  stockDescription?: string
  uom: string
  stockLocationDescription?: string
  quantity: number
  price: number
  totalPrice: number
}

export const goodsAdjustmentSchema = z.object({
  documentNo: z.string().min(1, 'Document No. is required'),
  adjustmentDate: z.string().min(1, 'Adjustment Date is required'),
  adjustmentType: z.enum(['INCREASE', 'DECREASE', 'TRANSFER', 'WRITE_OFF']),
  adjustmentTypeDescription: z.string().optional(),
  remarks: z.string().optional(),
})

export type GoodsAdjustmentFormValues = z.infer<typeof goodsAdjustmentSchema>

export interface GoodsAdjustment extends GoodsAdjustmentFormValues {
  adjustmentID: number
  lines: AdjustmentLine[]
}

export interface GoodsAdjustmentSearchCriteria {
  documentNo?: string
  adjustmentType?: string
  dateFrom?: string
  dateTo?: string
}

export const NEW_GOODS_ADJUSTMENT_DEFAULTS: GoodsAdjustmentFormValues = {
  documentNo: '',
  adjustmentDate: new Date().toISOString().split('T')[0],
  adjustmentType: 'INCREASE',
  adjustmentTypeDescription: '',
  remarks: '',
}
