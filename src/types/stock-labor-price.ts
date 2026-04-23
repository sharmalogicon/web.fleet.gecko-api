import { z } from 'zod'

export const laborMarkupSchema = z.object({
  markupValueOwn: z.coerce.number().min(0).max(100),
  markupValueOther: z.coerce.number().min(0).max(100),
  markupClaimOwn: z.coerce.number().min(0).max(100),
  markupClaimOther: z.coerce.number().min(0).max(100),
})

export const laborPriceSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  description: z.string().min(1, 'Description is required'),
  ratePerHour: z.coerce.number().min(0),
  overtimeRate: z.coerce.number().optional(),
  category: z.string().optional(),
  isActive: z.boolean().default(true),
})

export type LaborMarkupFormValues = z.infer<typeof laborMarkupSchema>
export type LaborPriceFormValues = z.infer<typeof laborPriceSchema>

export type LaborPrice = LaborPriceFormValues & { laborPriceID: number; branchID: number }
