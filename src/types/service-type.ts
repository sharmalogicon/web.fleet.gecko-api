import { z } from 'zod'
import { optNum } from '@/lib/utils/zod'

export const serviceTypeSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  description: z.string().min(1, 'Description is required'),
  serviceCategory: z.string().min(1, 'Category is required'),
  estimationDuration: optNum.refine((v) => v === undefined || v >= 0, '0 or more'),
  advanceNotifyDay: optNum.refine((v) => v === undefined || v >= 0, '0 or more'),
  advanceNotifyKM: optNum.refine((v) => v === undefined || v >= 0, '0 or more'),
  isActive: z.boolean().default(true),
})

export type ServiceTypeFormValues = z.infer<typeof serviceTypeSchema>
export type ServiceType = ServiceTypeFormValues & { serviceTypeID: number; branchID: number }

export interface ServiceTypeSearchCriteria { search?: string; category?: string }

export const SERVICE_CATEGORIES = ['ENGINE', 'TRANSMISSION', 'BRAKE', 'TYRE', 'ELECTRICAL', 'BODY', 'PM', 'INSPECTION'] as const

export const NEW_SERVICE_TYPE_DEFAULTS: ServiceTypeFormValues = {
  code: '',
  description: '',
  serviceCategory: '',
  isActive: true,
}
