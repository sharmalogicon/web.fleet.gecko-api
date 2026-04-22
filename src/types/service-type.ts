import { z } from 'zod'

export const serviceTypeSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  description: z.string().min(1, 'Description is required'),
  serviceCategory: z.string().min(1, 'Category is required'),
  estimationDuration: z.coerce.number().min(0).optional(),
  advanceNotifyDay: z.coerce.number().min(0).optional(),
  advanceNotifyKM: z.coerce.number().min(0).optional(),
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
