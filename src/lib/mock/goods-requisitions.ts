import type { GoodsRequisition } from '@/types/goods-requisition'

let _store: GoodsRequisition[] | null = null

function getStore(): GoodsRequisition[] {
  if (!_store) _store = [...SEED]
  return _store
}

export function getMockGoodsRequisitions(): GoodsRequisition[] {
  return getStore()
}

export function upsertMockGoodsRequisition(r: GoodsRequisition): void {
  const store = getStore()
  const idx = store.findIndex((x) => x.requisitionID === r.requisitionID)
  if (idx >= 0) store[idx] = r
  else _store = [...store, r]
}

export function removeMockGoodsRequisition(id: number): void {
  _store = getStore().filter((r) => r.requisitionID !== id)
}

const SEED: GoodsRequisition[] = [
  {
    requisitionID: 1,
    documentNo: 'RQ-2024-001',
    documentDate: '2024-01-15',
    requireDate: '2024-01-22',
    workOrderNo: 'WO-001',
    jobRefNo: 'JR-001',
    equipmentCode: 'EQ-001',
    remarks: 'Routine maintenance items',
    isApproved: true,
    isCancel: false,
    approvedBy: 'manager',
    approvedOn: '2024-01-16',
    lines: [
      {
        lineID: 1,
        stockCode: 'FILTER-001',
        stockDescription: 'Oil Filter – Heavy Duty',
        quantity: 4,
        uom: 'PCS',
        remarks: '',
      },
      {
        lineID: 2,
        stockCode: 'LUBRICANT-002',
        stockDescription: 'Engine Oil 15W-40 (20L)',
        quantity: 2,
        uom: 'CAN',
        remarks: 'Grade A only',
      },
      {
        lineID: 3,
        stockCode: 'BELT-003',
        stockDescription: 'V-Belt Drive 850mm',
        quantity: 6,
        uom: 'PCS',
        remarks: '',
      },
    ],
  },
  {
    requisitionID: 2,
    documentNo: 'RQ-2024-002',
    documentDate: '2024-01-28',
    requireDate: '2024-02-05',
    workOrderNo: 'WO-002',
    jobRefNo: 'JR-002',
    equipmentCode: 'EQ-002',
    remarks: 'Brake system overhaul parts',
    isApproved: true,
    isCancel: false,
    approvedBy: 'supervisor',
    approvedOn: '2024-01-29',
    lines: [
      {
        lineID: 4,
        stockCode: 'BRAKE-001',
        stockDescription: 'Brake Pad Set – Front',
        quantity: 2,
        uom: 'SET',
        remarks: '',
      },
      {
        lineID: 5,
        stockCode: 'FLUID-004',
        stockDescription: 'Brake Fluid DOT 4 (1L)',
        quantity: 4,
        uom: 'BTL',
        remarks: '',
      },
    ],
  },
  {
    requisitionID: 3,
    documentNo: 'RQ-2024-003',
    documentDate: '2024-02-10',
    requireDate: '2024-02-18',
    workOrderNo: '',
    jobRefNo: 'JR-003',
    equipmentCode: '',
    remarks: 'Stock replenishment',
    isApproved: false,
    isCancel: false,
    lines: [],
  },
  {
    requisitionID: 4,
    documentNo: 'RQ-2024-004',
    documentDate: '2024-02-20',
    requireDate: '2024-03-01',
    workOrderNo: 'WO-003',
    jobRefNo: '',
    equipmentCode: 'EQ-004',
    remarks: '',
    isApproved: false,
    isCancel: false,
    lines: [],
  },
  {
    requisitionID: 5,
    documentNo: 'RQ-2024-005',
    documentDate: '2024-03-05',
    requireDate: '2024-03-12',
    workOrderNo: '',
    jobRefNo: 'JR-005',
    equipmentCode: '',
    remarks: 'Electrical components',
    isApproved: false,
    isCancel: false,
    lines: [],
  },
  {
    requisitionID: 6,
    documentNo: 'RQ-2024-006',
    documentDate: '2024-03-18',
    requireDate: '2024-03-25',
    workOrderNo: 'WO-004',
    jobRefNo: 'JR-006',
    equipmentCode: 'EQ-006',
    remarks: 'Cooling system parts',
    isApproved: false,
    isCancel: false,
    lines: [],
  },
  {
    requisitionID: 7,
    documentNo: 'RQ-2024-007',
    documentDate: '2024-04-02',
    requireDate: '2024-04-09',
    workOrderNo: '',
    jobRefNo: 'JR-007',
    equipmentCode: '',
    remarks: 'Cancelled – item no longer needed',
    isApproved: false,
    isCancel: true,
    lines: [],
  },
  {
    requisitionID: 8,
    documentNo: 'RQ-2024-008',
    documentDate: '2024-04-15',
    requireDate: '2024-04-22',
    workOrderNo: '',
    jobRefNo: '',
    equipmentCode: '',
    remarks: '',
    isApproved: false,
    isCancel: false,
    lines: [],
  },
]

export const MOCK_GOODS_REQUISITIONS = SEED
