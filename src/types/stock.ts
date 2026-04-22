import { z } from 'zod'

export const stockSchema = z.object({
  code: z.string().min(1, 'Stock code is required'),
  description: z.string().min(1, 'Description is required'),
  isActive: z.boolean().default(true),
  stockCategory: z.string().optional(),
  stockType: z.string().optional(),
  brand: z.string().optional(),
  uom: z.string().optional(),
  location: z.string().optional(),
  leadTime: z.coerce.number().optional(),
  reOrderLevel: z.coerce.number().optional(),
  minQty: z.coerce.number().optional(),
  maxQty: z.coerce.number().optional(),
  reOrderQty: z.coerce.number().optional(),
  warrantyValue: z.coerce.number().optional(),
  warrantyPeriod: z.string().optional(),
  isOriginalPart: z.boolean().default(false),
  sellingPrice: z.coerce.number().optional(),
  markupClaim: z.coerce.number().optional(),
  remarks: z.string().optional(),
  // Read-only inventory fields (populated from API)
  totalQtyOnHand: z.coerce.number().optional(),
  avgCostPerUnit: z.coerce.number().optional(),
  lowestCostPerUnit: z.coerce.number().optional(),
  highestCostPerUnit: z.coerce.number().optional(),
  pendingQty: z.coerce.number().optional(),
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
