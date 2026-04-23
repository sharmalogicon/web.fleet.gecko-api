import { z } from 'zod'

export type WRStatus = 'DRAFT' | 'SUBMITTED' | 'IN PROGRESS' | 'COMPLETED' | 'CANCELLED'

export const WR_STATUS_MAP: Record<number, WRStatus> = {
  1: 'DRAFT',
  2: 'SUBMITTED',
  3: 'IN PROGRESS',
  4: 'COMPLETED',
  5: 'CANCELLED',
}

export const workRequestSchema = z.object({
  documentNo: z.string().optional(),
  orderDate: z.string().optional(),
  priorityType: z.string().optional(),
  status: z
    .enum(['DRAFT', 'SUBMITTED', 'IN PROGRESS', 'COMPLETED', 'CANCELLED'])
    .default('DRAFT'),
  billingCustomerName: z.string().optional(),
  vendorName: z.string().optional(),
  vendorCode: z.string().optional(),
  equipmentCode: z.string().optional(),
  equipmentID: z.coerce.number().optional(),
  description: z.string().optional(),
  remarks: z.string().optional(),
  isCancel: z.boolean().default(false),
})

export type WorkRequestFormValues = z.infer<typeof workRequestSchema>
export type WorkRequest = WorkRequestFormValues & { wrID: number; branchID: number }

export interface WorkRequestSearchCriteria {
  documentNo?: string
  status?: string
  dateFrom?: string
  dateTo?: string
}

export const NEW_WR_DEFAULTS: WorkRequestFormValues = {
  status: 'DRAFT',
  isCancel: false,
  orderDate: new Date().toISOString().split('T')[0],
}
