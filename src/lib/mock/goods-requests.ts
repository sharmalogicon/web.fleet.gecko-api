import type { GoodsRequest } from '@/types/goods-request'

let _store: GoodsRequest[] | null = null

function getStore(): GoodsRequest[] {
  if (!_store) _store = [...SEED]
  return _store
}

export function getMockGoodsRequests(): GoodsRequest[] {
  return getStore()
}

export function upsertMockGoodsRequest(r: GoodsRequest): void {
  const store = getStore()
  const idx = store.findIndex((x) => x.goodsRequestID === r.goodsRequestID)
  if (idx >= 0) store[idx] = r
  else _store = [...store, r]
}

export function removeMockGoodsRequest(id: number): void {
  _store = getStore().filter((r) => r.goodsRequestID !== id)
}

const SEED: GoodsRequest[] = [
  {
    goodsRequestID: 1,
    reqNo: 'GR-2024-001',
    reqDate: '2024-01-10',
    requireDate: '2024-01-13',
    workOrderNo: '',
    jobRefNo: 'JR-001',
    remarks: 'Urgent – required for scheduled maintenance',
    status: 'OPEN',
  },
  {
    goodsRequestID: 2,
    reqNo: 'GR-2024-002',
    reqDate: '2024-01-18',
    requireDate: '2024-01-25',
    workOrderNo: '',
    jobRefNo: 'JR-002',
    remarks: 'Spare parts for EQ-003',
    status: 'OPEN',
  },
  {
    goodsRequestID: 3,
    reqNo: 'GR-2024-003',
    reqDate: '2024-02-05',
    requireDate: '2024-02-12',
    workOrderNo: '',
    jobRefNo: '',
    remarks: '',
    status: 'OPEN',
  },
  {
    goodsRequestID: 4,
    reqNo: 'GR-2024-004',
    reqDate: '2024-02-20',
    requireDate: '2024-03-01',
    workOrderNo: '',
    jobRefNo: 'JR-004',
    remarks: 'Filters and lubricants',
    status: 'OPEN',
  },
  {
    goodsRequestID: 5,
    reqNo: 'GR-2024-005',
    reqDate: '2024-03-01',
    requireDate: '2024-03-10',
    workOrderNo: 'WO-001',
    jobRefNo: 'JR-005',
    remarks: 'Fulfilled via WO-001',
    status: 'FULFILLED',
  },
  {
    goodsRequestID: 6,
    reqNo: 'GR-2024-006',
    reqDate: '2024-03-15',
    requireDate: '2024-03-22',
    workOrderNo: 'WO-002',
    jobRefNo: 'JR-006',
    remarks: 'Issued from stock',
    status: 'FULFILLED',
  },
  {
    goodsRequestID: 7,
    reqNo: 'GR-2024-007',
    reqDate: '2024-04-01',
    requireDate: '2024-04-08',
    workOrderNo: '',
    jobRefNo: 'JR-007',
    remarks: 'Cancelled – vendor out of stock',
    status: 'CANCELLED',
  },
  {
    goodsRequestID: 8,
    reqNo: 'GR-2024-008',
    reqDate: '2024-04-10',
    requireDate: '2024-04-17',
    workOrderNo: '',
    jobRefNo: '',
    remarks: 'Cancelled – requisition withdrawn',
    status: 'CANCELLED',
  },
]

export const MOCK_GOODS_REQUESTS = SEED
