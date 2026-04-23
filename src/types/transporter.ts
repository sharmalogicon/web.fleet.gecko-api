import { z } from 'zod'

export const transporterSchema = z.object({
  transporterName: z.string().min(1, 'Name is required'),
  registrationNo: z.string().min(1, 'Registration no. is required'),
  emailID: z.union([z.string().email(), z.literal('')]).optional(),
  mobileNo: z.string().optional(),
  billingAddress: z.string().optional(),
  isActive: z.boolean().default(true),
})

export type TransporterFormValues = z.infer<typeof transporterSchema>
export type Transporter = TransporterFormValues & { transporterID: number; branchID: number }

export const NEW_TRANSPORTER_DEFAULTS: TransporterFormValues = {
  transporterName: '',
  registrationNo: '',
  isActive: true,
}
