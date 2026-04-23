import type { GoodsAdjustment } from '@/types/goods-adjustment'

let _store: GoodsAdjustment[] | null = null

function getStore(): GoodsAdjustment[] {
  if (!_store) _store = [...SEED]
  return _store
}

export function getMockGoodsAdjustments(): GoodsAdjustment[] {
  return getStore()
}

export function upsertMockGoodsAdjustment(r: GoodsAdjustment): void {
  const store = getStore()
  const idx = store.findIndex((x) => x.adjustmentID === r.adjustmentID)
  if (idx >= 0) store[idx] = r
  else _store = [...store, r]
}

export function removeMockGoodsAdjustment(id: number): void {
  _store = getStore().filter((r) => r.adjustmentID !== id)
}

const SEED: GoodsAdjustment[] = [
  {
    adjustmentID: 1,
    documentNo: 'ADJ-2024-001',
    adjustmentDate: '2024-01-25',
    adjustmentType: 'INCREASE',
    adjustmentTypeDescription: 'Stock replenishment after physical count',
    remarks: 'Annual stock audit adjustment',
    lines: [
      {
        lineID: 1,
        stockCode: 'FILTER-001',
        stockDescription: 'Oil Filter – Heavy Duty',
        uom: 'PCS',
        stockLocationDescription: 'Warehouse A – Bay 3',
        quantity: 20,
        price: 350,
        totalPrice: 7000,
      },
      {
        lineID: 2,
        stockCode: 'LUBRICANT-002',
        stockDescription: 'Engine Oil 15W-40 (20L)',
        uom: 'CAN',
        stockLocationDescription: 'Warehouse A – Bay 5',
        quantity: 10,
        price: 1800,
        totalPrice: 18000,
      },
    ],
  },
  {
    adjustmentID: 2,
    documentNo: 'ADJ-2024-002',
    adjustmentDate: '2024-02-10',
    adjustmentType: 'DECREASE',
    adjustmentTypeDescription: 'Damaged goods written off',
    remarks: 'Items damaged during transport',
    lines: [
      {
        lineID: 3,
        stockCode: 'BELT-003',
        stockDescription: 'V-Belt Drive 850mm',
        uom: 'PCS',
        stockLocationDescription: 'Warehouse B – Bay 1',
        quantity: 5,
        price: 850,
        totalPrice: 4250,
      },
      {
        lineID: 4,
        stockCode: 'FLUID-004',
        stockDescription: 'Brake Fluid DOT 4 (1L)',
        uom: 'BTL',
        stockLocationDescription: 'Warehouse B – Bay 2',
        quantity: 8,
        price: 225,
        totalPrice: 1800,
      },
    ],
  },
  {
    adjustmentID: 3,
    documentNo: 'ADJ-2024-003',
    adjustmentDate: '2024-02-22',
    adjustmentType: 'TRANSFER',
    adjustmentTypeDescription: 'Inter-warehouse transfer',
    remarks: 'Moved from Warehouse A to Warehouse B',
    lines: [
      {
        lineID: 5,
        stockCode: 'BRAKE-001',
        stockDescription: 'Brake Pad Set – Front',
        uom: 'SET',
        stockLocationDescription: 'Warehouse A → Warehouse B',
        quantity: 4,
        price: 2400,
        totalPrice: 9600,
      },
      {
        lineID: 6,
        stockCode: 'DISC-005',
        stockDescription: 'Brake Disc Rotor 280mm',
        uom: 'PCS',
        stockLocationDescription: 'Warehouse A → Warehouse B',
        quantity: 2,
        price: 1650,
        totalPrice: 3300,
      },
      {
        lineID: 7,
        stockCode: 'FILTER-001',
        stockDescription: 'Oil Filter – Heavy Duty',
        uom: 'PCS',
        stockLocationDescription: 'Warehouse A → Warehouse B',
        quantity: 10,
        price: 350,
        totalPrice: 3500,
      },
    ],
  },
  {
    adjustmentID: 4,
    documentNo: 'ADJ-2024-004',
    adjustmentDate: '2024-03-05',
    adjustmentType: 'INCREASE',
    adjustmentTypeDescription: 'Cycle count correction',
    remarks: 'Discrepancy found during monthly cycle count',
    lines: [
      {
        lineID: 8,
        stockCode: 'LUBRICANT-002',
        stockDescription: 'Engine Oil 15W-40 (20L)',
        uom: 'CAN',
        stockLocationDescription: 'Warehouse A – Bay 5',
        quantity: 3,
        price: 1800,
        totalPrice: 5400,
      },
    ],
  },
  {
    adjustmentID: 5,
    documentNo: 'ADJ-2024-005',
    adjustmentDate: '2024-03-18',
    adjustmentType: 'INCREASE',
    adjustmentTypeDescription: 'System correction',
    remarks: 'Correcting data entry error',
    lines: [],
  },
  {
    adjustmentID: 6,
    documentNo: 'ADJ-2024-006',
    adjustmentDate: '2024-03-28',
    adjustmentType: 'DECREASE',
    adjustmentTypeDescription: 'Expired stock removal',
    remarks: 'Removing expired items from inventory',
    lines: [],
  },
  {
    adjustmentID: 7,
    documentNo: 'ADJ-2024-007',
    adjustmentDate: '2024-04-10',
    adjustmentType: 'TRANSFER',
    adjustmentTypeDescription: 'Workshop transfer',
    remarks: 'Transfer to workshop for maintenance',
    lines: [],
  },
  {
    adjustmentID: 8,
    documentNo: 'ADJ-2024-008',
    adjustmentDate: '2024-04-22',
    adjustmentType: 'WRITE_OFF',
    adjustmentTypeDescription: 'Write-off – beyond repair',
    remarks: 'Components beyond economical repair',
    lines: [],
  },
]

export const MOCK_GOODS_ADJUSTMENTS = SEED
