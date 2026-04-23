import { z } from 'zod'

export type DriverStatus = 'ACTIVE' | 'INACTIVE' | 'ON LEAVE' | 'TERMINATED'

export const DRIVER_STATUS_MAP: Record<number, DriverStatus> = {
  1: 'ACTIVE',
  2: 'INACTIVE',
  3: 'ON LEAVE',
  4: 'TERMINATED',
}

export const REVERSE_STATUS_MAP: Record<DriverStatus, number> = {
  ACTIVE: 1,
  INACTIVE: 2,
  'ON LEAVE': 3,
  TERMINATED: 4,
}

export const driverSchema = z.object({
  driverCode: z.string().min(1, 'Driver code is required'),
  driverName: z.string().min(1, 'Driver name is required'),
  dob: z.string().optional(),
  position: z.string().optional(),
  idNo: z.string().optional(),
  ssNo: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ON LEAVE', 'TERMINATED']),
  dateHire: z.string().optional(),
  dateRelease: z.string().optional(),
  standardRate: z.coerce.number().optional(),
  overtimeRate: z.coerce.number().optional(),
  fuelCard: z.string().optional(),
  licenseNo: z.string().optional(),
  licenseExpiryDate: z.string().optional(),
  remarks: z.string().optional(),
  address1: z.string().optional(),
  address2: z.string().optional(),
  state: z.string().optional(),
  countryCode: z.string().optional(),
  postCode: z.string().optional(),
  phoneNumber: z.string().optional(),
  faxNumber: z.string().optional(),
  emailID: z.union([z.string().email(), z.literal('')]).optional(),
  contactPerson: z.string().optional(),
  mobilePhoneNumber: z.string().optional(),
}).refine(
  (data) => {
    if (data.dateHire && data.dateRelease) {
      return new Date(data.dateRelease) > new Date(data.dateHire)
    }
    return true
  },
  { message: 'Release date must be after hire date', path: ['dateRelease'] },
)

export type DriverFormValues = z.infer<typeof driverSchema>

export type Driver = DriverFormValues & {
  driverID: number
  branchID: number
}

export interface DriverApiResponse {
  driverID: number
  driverCode: string
  driverName: string
  status: number
  location: string | null
  contactID: number | null
  createdBy: string | null
  createdOn: string | null
  modifiedBy: string | null
  modifiedOn: string | null
  imageName: string | null
}

export interface DriverSearchCriteria {
  driverName?: string
  status?: string
  branch?: string
}

export const NEW_DRIVER_DEFAULTS: DriverFormValues = {
  driverCode: '',
  driverName: '',
  status: 'ACTIVE',
}
