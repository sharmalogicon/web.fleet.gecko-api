import { z } from 'zod'

export const GOODS_REQUEST_STATUS_OPTIONS = ['OPEN', 'FULFILLED', 'CANCELLED'] as const
export type GoodsRequestStatus = (typeof GOODS_REQUEST_STATUS_OPTIONS)[number]

export const GOODS_REQUEST_STATUS_MAP: Record<GoodsRequestStatus, string> = {
  OPEN: 'bg-blue-100 text-blue-700',
  FULFILLED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
}

export const goodsRequestSchema = z.object({
  reqNo: z.string().min(1, 'Request No. is required'),
  reqDate: z.string().min(1, 'Request Date is required'),
  requireDate: z.string().min(1, 'Required By date is required'),
  workOrderNo: z.string().optional(),
  jobRefNo: z.string().optional(),
  remarks: z.string().optional(),
  status: z.enum(['OPEN', 'FULFILLED', 'CANCELLED']),
})

export type GoodsRequestFormValues = z.infer<typeof goodsRequestSchema>

export interface GoodsRequest extends GoodsRequestFormValues {
  goodsRequestID: number
}

export interface GoodsRequestSearchCriteria {
  reqNo?: string
  workOrderNo?: string
  status?: string
  dateFrom?: string
  dateTo?: string
}

export const NEW_GOODS_REQUEST_DEFAULTS: GoodsRequestFormValues = {
  reqNo: '',
  reqDate: new Date().toISOString().split('T')[0],
  requireDate: '',
  workOrderNo: '',
  jobRefNo: '',
  remarks: '',
  status: 'OPEN',
}
