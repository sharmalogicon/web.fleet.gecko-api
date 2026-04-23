import { z } from 'zod'

export interface GoodsRequisitionLine {
  lineID: number
  stockCode: string
  stockDescription?: string
  quantity: number
  uom: string
  remarks?: string
}

export const goodsRequisitionSchema = z.object({
  documentNo: z.string().min(1, 'Document No. is required'),
  documentDate: z.string().min(1, 'Document Date is required'),
  requireDate: z.string().min(1, 'Required By date is required'),
  workOrderNo: z.string().optional(),
  jobRefNo: z.string().optional(),
  equipmentCode: z.string().optional(),
  remarks: z.string().optional(),
  approvedBy: z.string().optional(),
  approvedOn: z.string().optional(),
})

export type GoodsRequisitionFormValues = z.infer<typeof goodsRequisitionSchema>

export interface GoodsRequisition extends GoodsRequisitionFormValues {
  requisitionID: number
  isApproved: boolean
  isCancel: boolean
  lines: GoodsRequisitionLine[]
}

export interface GoodsRequisitionSearchCriteria {
  documentNo?: string
  status?: string
}

export const NEW_GOODS_REQUISITION_DEFAULTS: GoodsRequisitionFormValues = {
  documentNo: '',
  documentDate: new Date().toISOString().split('T')[0],
  requireDate: '',
  workOrderNo: '',
  jobRefNo: '',
  equipmentCode: '',
  remarks: '',
  approvedBy: '',
  approvedOn: '',
}
