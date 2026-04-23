export type SparePartsMonitorStatus = 'ACTIVE' | 'INACTIVE'

export interface SparePartsMonitor {
  monitorID: number
  workOrderNo: string
  equipmentCode: string
  orderDate: string
  orderTime?: string
  grandTotal: number
  status: SparePartsMonitorStatus
  remarks?: string
}

export interface SparePartsMonitorSearchCriteria {
  workOrderNo?: string
  equipmentCode?: string
  status?: string
}
