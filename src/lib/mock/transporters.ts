import type { Transporter } from '@/types/transporter'

let _store: Transporter[] | null = null

function getStore(): Transporter[] {
  if (!_store) _store = [...SEED]
  return _store
}

export function getMockTransporters(): Transporter[] {
  return getStore()
}

export function upsertMockTransporter(t: Transporter): void {
  const store = getStore()
  const idx = store.findIndex((r) => r.transporterID === t.transporterID)
  if (idx >= 0) store[idx] = t
  else _store = [...store, t]
}

export function removeMockTransporter(id: number): void {
  _store = getStore().filter((r) => r.transporterID !== id)
}

const SEED: Transporter[] = [
  { transporterID: 1, branchID: 1, transporterName: 'PTT Logistics Co., Ltd.', registrationNo: 'TR-001', emailID: 'ops@pttlogistics.co.th', mobileNo: '02-123-4567', billingAddress: '123 Sukhumvit Rd, Bangkok 10110', isActive: true },
  { transporterID: 2, branchID: 1, transporterName: 'Siam Freight & Transport', registrationNo: 'TR-002', emailID: 'contact@siamfreight.com', mobileNo: '02-234-5678', billingAddress: '456 Vibhavadi Rd, Bangkok 10210', isActive: true },
  { transporterID: 3, branchID: 1, transporterName: 'Fast Track Logistics', registrationNo: 'TR-003', emailID: '', mobileNo: '081-345-6789', billingAddress: '789 Rama 9 Rd, Bangkok 10310', isActive: true },
  { transporterID: 4, branchID: 1, transporterName: 'Thai Express Transport', registrationNo: 'TR-004', emailID: 'info@thaiexpress.co.th', mobileNo: '02-456-7890', billingAddress: '321 Bangna-Trad Rd, Samut Prakan 10540', isActive: false },
  { transporterID: 5, branchID: 1, transporterName: 'Northern Cargo Services', registrationNo: 'TR-005', emailID: 'northern@cargo.co.th', mobileNo: '053-123-456', billingAddress: '99 Nimman Rd, Chiang Mai 50200', isActive: true },
]
