import type { GoodsReceipt } from '@/types/goods-receipt'

let _store: GoodsReceipt[] | null = null

function getStore(): GoodsReceipt[] {
  if (!_store) _store = [...SEED]
  return _store
}

export function getMockGoodsReceipts(): GoodsReceipt[] {
  return getStore()
}

export function upsertMockGoodsReceipt(r: GoodsReceipt): void {
  const store = getStore()
  const idx = store.findIndex((x) => x.goodsReceiptID === r.goodsReceiptID)
  if (idx >= 0) store[idx] = r
  else _store = [...store, r]
}

export function removeMockGoodsReceipt(id: number): void {
  _store = getStore().filter((r) => r.goodsReceiptID !== id)
}

const SEED: GoodsReceipt[] = [
  {
    goodsReceiptID: 1,
    documentNo: 'GR-REC-2024-001',
    documentDate: '2024-01-20',
    vendorName: 'Bangkok Auto Parts Co.',
    poNo: 'PO-2024-001',
    receiptBy: 'Somchai Jaidee',
    remarks: 'All items received in good condition',
    totalAmount: 44765,
    isCancel: false,
    lines: [
      {
        lineID: 1,
        stockCode: 'FILTER-001',
        stockDescription: 'Oil Filter – Heavy Duty',
        uom: 'PCS',
        poQty: 10,
        receivedQty: 10,
        unitPrice: 350,
        totalAmount: 3500,
        remarks: '',
      },
      {
        lineID: 2,
        stockCode: 'LUBRICANT-002',
        stockDescription: 'Engine Oil 15W-40 (20L)',
        uom: 'CAN',
        poQty: 15,
        receivedQty: 15,
        unitPrice: 1800,
        totalAmount: 27000,
        remarks: 'Grade A confirmed',
      },
      {
        lineID: 3,
        stockCode: 'BELT-003',
        stockDescription: 'V-Belt Drive 850mm',
        uom: 'PCS',
        poQty: 16,
        receivedQty: 16,
        unitPrice: 850,
        totalAmount: 13600,
        remarks: '',
      },
    ],
  },
  {
    goodsReceiptID: 2,
    documentNo: 'GR-REC-2024-002',
    documentDate: '2024-02-05',
    vendorName: 'Thai Parts Supply Ltd.',
    poNo: 'PO-2024-002',
    receiptBy: 'Nattapong Suksan',
    remarks: 'Partial delivery – brake fluid pending',
    totalAmount: 22500,
    isCancel: false,
    lines: [
      {
        lineID: 4,
        stockCode: 'BRAKE-001',
        stockDescription: 'Brake Pad Set – Front',
        uom: 'SET',
        poQty: 8,
        receivedQty: 8,
        unitPrice: 2400,
        totalAmount: 19200,
        remarks: '',
      },
      {
        lineID: 5,
        stockCode: 'DISC-005',
        stockDescription: 'Brake Disc Rotor 280mm',
        uom: 'PCS',
        poQty: 2,
        receivedQty: 2,
        unitPrice: 1650,
        totalAmount: 3300,
        remarks: '',
      },
    ],
  },
  {
    goodsReceiptID: 3,
    documentNo: 'GR-REC-2024-003',
    documentDate: '2024-02-18',
    vendorName: 'Siam Diesel Services Co.',
    poNo: 'PO-2024-001',
    receiptBy: 'Wanchai Boontham',
    remarks: 'Back-order items received',
    totalAmount: 4500,
    isCancel: false,
    lines: [
      {
        lineID: 6,
        stockCode: 'FLUID-004',
        stockDescription: 'Brake Fluid DOT 4 (1L)',
        uom: 'BTL',
        poQty: 20,
        receivedQty: 20,
        unitPrice: 225,
        totalAmount: 4500,
        remarks: '',
      },
    ],
  },
  {
    goodsReceiptID: 4,
    documentNo: 'GR-REC-2024-004',
    documentDate: '2024-03-01',
    vendorName: 'Eastern Fleet Supply Co.',
    poNo: '',
    receiptBy: 'Somchai Jaidee',
    remarks: '',
    totalAmount: 0,
    isCancel: false,
    lines: [],
  },
  {
    goodsReceiptID: 5,
    documentNo: 'GR-REC-2024-005',
    documentDate: '2024-03-12',
    vendorName: 'Bangkok Auto Parts Co.',
    poNo: '',
    receiptBy: 'Nattapong Suksan',
    remarks: 'Electrical components delivery',
    totalAmount: 0,
    isCancel: false,
    lines: [],
  },
  {
    goodsReceiptID: 6,
    documentNo: 'GR-REC-2024-006',
    documentDate: '2024-03-25',
    vendorName: 'Northern Truck Parts Co.',
    poNo: '',
    receiptBy: '',
    remarks: '',
    totalAmount: 0,
    isCancel: false,
    lines: [],
  },
  {
    goodsReceiptID: 7,
    documentNo: 'GR-REC-2024-007',
    documentDate: '2024-04-08',
    vendorName: 'Thai Parts Supply Ltd.',
    poNo: 'PO-2024-003',
    receiptBy: 'Wanchai Boontham',
    remarks: 'Cancelled – incorrect items delivered',
    totalAmount: 0,
    isCancel: true,
    lines: [],
  },
  {
    goodsReceiptID: 8,
    documentNo: 'GR-REC-2024-008',
    documentDate: '2024-04-20',
    vendorName: 'Siam Diesel Services Co.',
    poNo: '',
    receiptBy: '',
    remarks: '',
    totalAmount: 0,
    isCancel: false,
    lines: [],
  },
]

export const MOCK_GOODS_RECEIPTS = SEED
