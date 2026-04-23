import { z } from 'zod'

export interface PMServiceLine {
  pmServiceLineID: number
  serviceType: string
  serviceTypeDescription: string
  meterInterval?: number
  remarks?: string
}

export interface PMEquipment {
  pmEquipmentID: number
  equipmentCode: string
  registrationNo?: string
  category?: string
  brand?: string
  customerName?: string
}

export const pmSchedulerSchema = z.object({
  scheduleNo: z.string().optional(),
  scheduleDate: z.string().optional(),
  serviceTypeDescription: z.string().optional(),
  serviceType: z.string().optional(),
  remarks: z.string().optional(),
  meterKm: z.coerce.number().optional(),
  isActive: z.boolean().default(true),
})

export type PMSchedulerFormValues = z.infer<typeof pmSchedulerSchema>

export type PMSchedule = PMSchedulerFormValues & {
  pmID: number
  branchID: number
  services?: PMServiceLine[]
  equipment?: PMEquipment[]
}

export interface PMSchedulerSearchCriteria {
  search?: string
  serviceType?: string
}

export const NEW_PM_DEFAULTS: PMSchedulerFormValues = {
  isActive: true,
}
