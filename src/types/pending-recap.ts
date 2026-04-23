export type PendingRecapStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED'

export interface PendingRecap {
  recapID: number
  taxNo: string
  date: string
  vendorName: string
  serialNo: string
  brand: string
  model?: string
  tyreSize: string
  condition: string
  tyrePressure?: number
  recapCost?: number
  remarks?: string
  status: PendingRecapStatus
}

export interface PendingRecapSearchCriteria {
  serialNo?: string
  brand?: string
  status?: string
}
