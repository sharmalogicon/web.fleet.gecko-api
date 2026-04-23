import type { ReturnToVendor } from '@/types/return-to-vendor'

let _store: ReturnToVendor[] | null = null

function getStore(): ReturnToVendor[] {
  if (!_store) _store = [...SEED]
  return _store
}

export function getMockReturns(): ReturnToVendor[] {
  return getStore()
}

export function upsertMockReturn(r: ReturnToVendor): void {
  const store = getStore()
  const idx = store.findIndex((x) => x.returnID === r.returnID)
  if (idx >= 0) store[idx] = r
  else _store = [...store, r]
}

export function removeMockReturn(id: number): void {
  _store = getStore().filter((r) => r.returnID !== id)
}

const SEED: ReturnToVendor[] = [
  {
    returnID: 1,
    documentNo: 'RTV-2024-001',
    returnDate: '2024-01-15',
    vendorName: 'ABC Auto Parts Co., Ltd.',
    vendorCode: 'VND-001',
    returnBy: 'Somchai K.',
    remarks: 'Defective filters returned to supplier',
    totalAmount: 7000,
    lines: [
      {
        lineID: 1,
        poNo: 'PO-2024-001',
        serialNo: 'SN-F001',
        stockCode: 'FILTER-001',
        stockDescription: 'Oil Filter – Heavy Duty',
        quantity: 10,
        unitPrice: 350,
        totalAmount: 3500,
      },
      {
        lineID: 2,
        poNo: 'PO-2024-001',
        serialNo: undefined,
        stockCode: 'FILTER-002',
        stockDescription: 'Air Filter – Standard',
        quantity: 5,
        unitPrice: 700,
        totalAmount: 3500,
      },
    ],
  },
  {
    returnID: 2,
    documentNo: 'RTV-2024-002',
    returnDate: '2024-02-08',
    vendorName: 'Thailand Lubricants Supply',
    vendorCode: 'VND-002',
    returnBy: 'Nattapon R.',
    remarks: 'Wrong specification received',
    totalAmount: 9000,
    lines: [
      {
        lineID: 3,
        poNo: 'PO-2024-001',
        serialNo: undefined,
        stockCode: 'LUBRICANT-002',
        stockDescription: 'Engine Oil 15W-40 (20L)',
        quantity: 5,
        unitPrice: 1800,
        totalAmount: 9000,
      },
      {
        lineID: 4,
        poNo: 'PO-2024-002',
        serialNo: 'SN-L004',
        stockCode: 'LUBRICANT-004',
        stockDescription: 'Gear Oil 80W-90 (5L)',
        quantity: 0,
        unitPrice: 650,
        totalAmount: 0,
      },
    ],
  },
  {
    returnID: 3,
    documentNo: 'RTV-2024-003',
    returnDate: '2024-02-20',
    vendorName: 'Star Brake Systems',
    vendorCode: 'VND-003',
    returnBy: 'Prawit S.',
    remarks: 'Items damaged in transit – insurance claim pending',
    totalAmount: 12800,
    lines: [
      {
        lineID: 5,
        poNo: 'PO-2024-002',
        serialNo: 'SN-B001',
        stockCode: 'BRAKE-001',
        stockDescription: 'Brake Pad Set – Front',
        quantity: 4,
        unitPrice: 2400,
        totalAmount: 9600,
      },
      {
        lineID: 6,
        poNo: 'PO-2024-002',
        serialNo: undefined,
        stockCode: 'DISC-005',
        stockDescription: 'Brake Disc Rotor 280mm',
        quantity: 2,
        unitPrice: 1600,
        totalAmount: 3200,
      },
    ],
  },
  {
    returnID: 4,
    documentNo: 'RTV-2024-004',
    returnDate: '2024-03-05',
    vendorName: 'ABC Auto Parts Co., Ltd.',
    vendorCode: 'VND-001',
    returnBy: 'Somchai K.',
    remarks: '',
    totalAmount: 0,
    lines: [],
  },
  {
    returnID: 5,
    documentNo: 'RTV-2024-005',
    returnDate: '2024-03-22',
    vendorName: 'Precision Tools Import',
    vendorCode: 'VND-005',
    returnBy: 'Anuchit P.',
    remarks: 'Over-supplied quantity',
    totalAmount: 0,
    lines: [],
  },
  {
    returnID: 6,
    documentNo: 'RTV-2024-006',
    returnDate: '2024-04-10',
    vendorName: 'Thailand Lubricants Supply',
    vendorCode: 'VND-002',
    returnBy: 'Nattapon R.',
    remarks: 'Expired stock — returned per supplier agreement',
    totalAmount: 0,
    lines: [],
  },
]

export const MOCK_RETURNS = SEED
