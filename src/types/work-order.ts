import { z } from 'zod'

export type WOStatus = 'DRAFT' | 'OPEN' | 'IN PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'INVOICED'

export const WO_BADGE: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  OPEN: 'bg-blue-100 text-blue-700',
  'IN PROGRESS': 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-600',
  INVOICED: 'bg-purple-100 text-purple-700',
}

export const PRIORITY_BADGE: Record<string, string> = {
  NORMAL: 'bg-gray-100 text-gray-600',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
}

// WO service line
export interface WOServiceLine {
  serviceLineID: number
  serviceType: string
  serviceTypeDescription: string
  partsTotal: number
  laborTotal: number
  discountTotal: number
  remarks?: string
}

// WO parts line
export interface WOPartsLine {
  partsLineID: number
  stockCode: string
  description: string
  uom: string
  qty: number
  unitPrice: number
  discount: number
  totalAmount: number
}

// WO labor line
export interface WOLaborLine {
  laborLineID: number
  chargeCode: string
  description: string
  startTime: string
  endTime: string
  standardHours: number
  actualHours: number
  rate: number
  discount: number
  totalCharge: number
}

export const workOrderSchema = z.object({
  documentNo: z.string().optional(),
  woRequestNo: z.string().optional(),
  orderDate: z.string().optional(),
  startDate: z.string().optional(),
  status: z.enum(['DRAFT', 'OPEN', 'IN PROGRESS', 'COMPLETED', 'CANCELLED', 'INVOICED']).default('DRAFT'),
  priority: z.string().optional(),
  equipmentCode: z.string().optional(),
  equipmentID: z.coerce.number().optional(),
  driverName: z.string().optional(),
  driverID: z.coerce.number().optional(),
  billingCustomerName: z.string().optional(),
  billingCustomer: z.string().optional(),
  vendorName: z.string().optional(),
  vendorCode: z.string().optional(),
  vendorInvoiceNo: z.string().optional(),
  woInvoiceNo: z.string().optional(),
  claimNo: z.string().optional(),
  meterRead: z.coerce.number().optional(),
  serviceTypeCategory: z.string().optional(),
  vat: z.coerce.number().default(7),
  totalPartsPrice: z.coerce.number().optional(),
  totalLaborPrice: z.coerce.number().optional(),
  totalDiscount: z.coerce.number().optional(),
  totalVAT: z.coerce.number().optional(),
  grandTotal: z.coerce.number().optional(),
  isTireMaintenance: z.boolean().default(false),
  isApproved: z.boolean().default(false),
  approvedOn: z.string().optional(),
  remarks: z.string().optional(),
  isCancel: z.boolean().default(false),
})

export type WorkOrderFormValues = z.infer<typeof workOrderSchema>

export type WorkOrder = WorkOrderFormValues & {
  woID: number
  branchID: number
  services?: WOServiceLine[]
  parts?: WOPartsLine[]
  labor?: WOLaborLine[]
}

export interface WorkOrderSearchCriteria {
  documentNo?: string
  status?: string
  equipmentCode?: string
  serviceTypeCategory?: string
  dateFrom?: string
  dateTo?: string
}

export const NEW_WO_DEFAULTS: WorkOrderFormValues = {
  status: 'DRAFT',
  vat: 7,
  isTireMaintenance: false,
  isApproved: false,
  isCancel: false,
  orderDate: new Date().toISOString().split('T')[0],
}
