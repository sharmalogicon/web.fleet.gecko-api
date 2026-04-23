import type { UnbilledItem } from '@/types/unbilled-invoice'

let _store: UnbilledItem[] | null = null

function getStore(): UnbilledItem[] {
  if (!_store) _store = [...SEED]
  return _store
}

export function getMockUnbilledItems(): UnbilledItem[] {
  return getStore()
}

const SEED: UnbilledItem[] = [
  {
    unbilledID: 1,
    grNo: 'GR-REC-2024-001',
    orderDate: '2024-01-08',
    poNo: 'PO-2024-001',
    vendorInvoiceRef: 'BLC-REF-001',
    billingCustomer: 'Bangkok Logistics Co.',
    vendorName: 'Bangkok Auto Parts Co.',
    vatAmount: 2765,
    totalAmount: 39500,
    nettAmount: 42265,
    vendorDoNo: 'DO-BLC-0108',
  },
  {
    unbilledID: 2,
    grNo: 'GR-REC-2024-002',
    orderDate: '2024-01-25',
    poNo: 'PO-2024-002',
    vendorInvoiceRef: 'TTL-REF-001',
    billingCustomer: 'Thai Transport Ltd.',
    vendorName: 'Thai Parts Supply Ltd.',
    vatAmount: 1890,
    totalAmount: 27000,
    nettAmount: 28890,
    vendorDoNo: 'DO-TTL-0125',
  },
  {
    unbilledID: 3,
    grNo: 'GR-REC-2024-003',
    orderDate: '2024-02-12',
    poNo: 'PO-2024-003',
    vendorInvoiceRef: '',
    billingCustomer: 'Eastern Fleet Co.',
    vendorName: 'Siam Diesel Services Co.',
    vatAmount: 1540,
    totalAmount: 22000,
    nettAmount: 23540,
    vendorDoNo: 'DO-SDS-0212',
  },
  {
    unbilledID: 4,
    grNo: 'GR-REC-2024-004',
    orderDate: '2024-02-28',
    poNo: 'PO-2024-004',
    vendorInvoiceRef: 'BLC-REF-004',
    billingCustomer: 'Bangkok Logistics Co.',
    vendorName: 'Bangkok Auto Parts Co.',
    vatAmount: 3150,
    totalAmount: 45000,
    nettAmount: 48150,
    vendorDoNo: '',
  },
  {
    unbilledID: 5,
    grNo: 'GR-REC-2024-005',
    orderDate: '2024-03-10',
    poNo: 'PO-2024-005',
    vendorInvoiceRef: '',
    billingCustomer: 'Northern Cargo Ltd.',
    vendorName: 'Eastern Fleet Supply Co.',
    vatAmount: 980,
    totalAmount: 14000,
    nettAmount: 14980,
    vendorDoNo: 'DO-EFS-0310',
  },
  {
    unbilledID: 6,
    grNo: 'GR-REC-2024-006',
    orderDate: '2024-03-22',
    poNo: 'PO-2024-006',
    vendorInvoiceRef: 'TTL-REF-006',
    billingCustomer: 'Thai Transport Ltd.',
    vendorName: 'Thai Parts Supply Ltd.',
    vatAmount: 2100,
    totalAmount: 30000,
    nettAmount: 32100,
    vendorDoNo: 'DO-TTL-0322',
  },
  {
    unbilledID: 7,
    grNo: 'GR-REC-2024-007',
    orderDate: '2024-04-05',
    poNo: 'PO-2024-007',
    vendorInvoiceRef: '',
    billingCustomer: 'Siam Fleet Services',
    vendorName: 'Northern Truck Parts Co.',
    vatAmount: 1260,
    totalAmount: 18000,
    nettAmount: 19260,
    vendorDoNo: 'DO-NTP-0405',
  },
  {
    unbilledID: 8,
    grNo: 'GR-REC-2024-008',
    orderDate: '2024-04-18',
    poNo: 'PO-2024-008',
    vendorInvoiceRef: 'SDS-REF-008',
    billingCustomer: 'Eastern Fleet Co.',
    vendorName: 'Siam Diesel Services Co.',
    vatAmount: 700,
    totalAmount: 10000,
    nettAmount: 10700,
    vendorDoNo: '',
  },
]

export const MOCK_UNBILLED_ITEMS = SEED
