export interface UnbilledItem {
  unbilledID: number
  grNo: string
  orderDate: string
  poNo: string
  vendorInvoiceRef?: string
  billingCustomer?: string
  vendorName: string
  vatAmount?: number
  totalAmount: number
  nettAmount: number
  vendorDoNo?: string
}

export interface UnbilledSearchCriteria {
  vendorName?: string
  poNo?: string
  grNo?: string
  dateFrom?: string
  dateTo?: string
}
