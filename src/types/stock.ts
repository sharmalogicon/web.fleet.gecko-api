import { z } from 'zod'
import { optNum } from '@/lib/utils/zod'

export const stockSchema = z.object({
  code: z.string().min(1, 'Stock code is required'),
  description: z.string().min(1, 'Description is required'),
  isActive: z.boolean().default(true),
  stockCategory: z.string().optional(),
  stockType: z.string().optional(),
  brand: z.string().optional(),
  uom: z.string().optional(),
  location: z.string().optional(),
  leadTime: optNum,
  reOrderLevel: optNum,
  minQty: optNum,
  maxQty: optNum,
  reOrderQty: optNum,
  warrantyValue: optNum,
  warrantyPeriod: z.string().optional(),
  isOriginalPart: z.boolean().default(false),
  sellingPrice: optNum,
  markupClaim: optNum,
  remarks: z.string().optional(),
  // Read-only inventory fields (populated from API)
  totalQtyOnHand: optNum,
  totalQtyReserved: optNum,
  totalQtyAvailable: optNum,
  avgCostPerUnit: optNum,
  lowestCostPerUnit: optNum,
  highestCostPerUnit: optNum,
  pendingQty: optNum,
})

export type StockFormValues = z.infer<typeof stockSchema>

export type StockProfile = StockFormValues & {
  stockID: number
  branchID: number
}

export interface StockSearchCriteria {
  search?: string
  category?: string
  status?: string
}

export const NEW_STOCK_DEFAULTS: StockFormValues = {
  code: '',
  description: '',
  isActive: true,
  isOriginalPart: false,
}
