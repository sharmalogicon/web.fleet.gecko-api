import type { WOCreditNote } from '@/types/wo-credit-note'

let _store: WOCreditNote[] | null = null

function getStore(): WOCreditNote[] {
  if (!_store) _store = [...SEED]
  return _store
}

export function getMockWOCreditNotes(): WOCreditNote[] {
  return getStore()
}

export function upsertMockWOCreditNote(r: WOCreditNote): void {
  const store = getStore()
  const idx = store.findIndex((x) => x.woCreditNoteID === r.woCreditNoteID)
  if (idx >= 0) store[idx] = r
  else _store = [...store, r]
}

export function removeMockWOCreditNote(id: number): void {
  _store = getStore().filter((r) => r.woCreditNoteID !== id)
}

const SEED: WOCreditNote[] = [
  {
    woCreditNoteID: 1,
    creditNoteNo: 'CN-WO-2024-001',
    creditNoteDate: '2024-01-15',
    customerCode: 'CST-001',
    customerName: 'Bangkok Logistics Co.',
    address: '123 Sukhumvit Rd, Bangkok 10110',
    creditTerm: 'Net 30',
    discountType: 'PERCENT',
    discount: 5,
    taxType: 'VAT',
    vat: 7,
    totalAmount: 15000,
    vatAmount: 1050,
    nettAmount: 16050,
    status: 'ACTIVE',
    remarks: 'Credit note for overcharge on WO-2024-001',
    lines: [
      {
        lineID: 1,
        woNo: 'WO-2024-001',
        transactionNo: 'TXN-001',
        registrationNo: 'TRK-001',
        serviceType: 'PREVENTIVE MAINTENANCE',
        glCode: 'GL-5001',
        code: 'PM-001',
        description: 'Engine oil change credit',
      },
      {
        lineID: 2,
        woNo: 'WO-2024-001',
        transactionNo: 'TXN-002',
        registrationNo: 'TRK-001',
        serviceType: 'PREVENTIVE MAINTENANCE',
        glCode: 'GL-5002',
        code: 'PM-002',
        description: 'Filter replacement credit',
      },
    ],
  },
  {
    woCreditNoteID: 2,
    creditNoteNo: 'CN-WO-2024-002',
    creditNoteDate: '2024-02-03',
    customerCode: 'CST-002',
    customerName: 'Thai Transport Ltd.',
    address: '456 Rama IV Rd, Bangkok 10500',
    creditTerm: 'Net 45',
    discountType: 'AMOUNT',
    discount: 2000,
    taxType: 'VAT',
    vat: 7,
    totalAmount: 22000,
    vatAmount: 1540,
    nettAmount: 21540,
    status: 'ACTIVE',
    remarks: 'Partial credit – service quality dispute',
    lines: [
      {
        lineID: 3,
        woNo: 'WO-2024-004',
        transactionNo: 'TXN-010',
        registrationNo: 'BUS-001',
        serviceType: 'CORRECTIVE MAINTENANCE',
        glCode: 'GL-5003',
        code: 'CM-001',
        description: 'Labour overcharge credit',
      },
      {
        lineID: 4,
        woNo: 'WO-2024-004',
        transactionNo: 'TXN-011',
        registrationNo: 'BUS-001',
        serviceType: 'CORRECTIVE MAINTENANCE',
        glCode: 'GL-5004',
        code: 'CM-002',
        description: 'Parts cost adjustment',
      },
      {
        lineID: 5,
        woNo: 'WO-2024-005',
        transactionNo: 'TXN-012',
        registrationNo: 'BUS-002',
        serviceType: 'INSPECTION',
        glCode: 'GL-5005',
        code: 'INS-001',
        description: 'Inspection fee credit',
      },
    ],
  },
  {
    woCreditNoteID: 3,
    creditNoteNo: 'CN-WO-2024-003',
    creditNoteDate: '2024-02-20',
    customerCode: 'CST-003',
    customerName: 'Eastern Fleet Co.',
    address: '789 Phetchaburi Rd, Bangkok 10400',
    creditTerm: 'COD',
    discountType: 'PERCENT',
    discount: 10,
    taxType: 'VAT',
    vat: 7,
    totalAmount: 8000,
    vatAmount: 560,
    nettAmount: 8560,
    status: 'ACTIVE',
    remarks: 'Tyre credit note – wrong size delivered',
    lines: [
      {
        lineID: 6,
        woNo: 'WO-2024-005',
        transactionNo: 'TXN-020',
        registrationNo: 'TRK-005',
        serviceType: 'TYRE SERVICE',
        glCode: 'GL-6001',
        code: 'TYR-001',
        description: 'Wrong tyre size – full credit',
      },
      {
        lineID: 7,
        woNo: 'WO-2024-005',
        transactionNo: 'TXN-021',
        registrationNo: 'TRK-005',
        serviceType: 'TYRE SERVICE',
        glCode: 'GL-6002',
        code: 'TYR-002',
        description: 'Mounting fee credit',
      },
    ],
  },
  {
    woCreditNoteID: 4,
    creditNoteNo: 'CN-WO-2024-004',
    creditNoteDate: '2024-03-10',
    customerCode: 'CST-004',
    customerName: 'Northern Cargo Ltd.',
    address: '55 Nimman Rd, Chiang Mai 50200',
    creditTerm: 'Net 60',
    discountType: undefined,
    discount: 0,
    taxType: 'VAT',
    vat: 7,
    totalAmount: 12000,
    vatAmount: 840,
    nettAmount: 12840,
    status: 'ACTIVE',
    remarks: 'Billing error correction',
    lines: [
      {
        lineID: 8,
        woNo: 'WO-2024-006',
        transactionNo: 'TXN-030',
        registrationNo: 'TRK-007',
        serviceType: 'PREVENTIVE MAINTENANCE',
        glCode: 'GL-5001',
        code: 'PM-006',
        description: 'Duplicate charge credit',
      },
    ],
  },
  {
    woCreditNoteID: 5,
    creditNoteNo: 'CN-WO-2024-005',
    creditNoteDate: '2024-04-01',
    customerCode: 'CST-001',
    customerName: 'Bangkok Logistics Co.',
    address: '123 Sukhumvit Rd, Bangkok 10110',
    creditTerm: 'Net 30',
    discountType: undefined,
    discount: 0,
    taxType: 'NONE',
    vat: 0,
    totalAmount: 0,
    vatAmount: 0,
    nettAmount: 0,
    status: 'CANCELLED',
    remarks: 'Cancelled – issued in error',
    lines: [],
  },
  {
    woCreditNoteID: 6,
    creditNoteNo: 'CN-WO-2024-006',
    creditNoteDate: '2024-04-18',
    customerCode: 'CST-002',
    customerName: 'Thai Transport Ltd.',
    address: '456 Rama IV Rd, Bangkok 10500',
    creditTerm: 'Net 45',
    discountType: undefined,
    discount: 0,
    taxType: 'NONE',
    vat: 0,
    totalAmount: 0,
    vatAmount: 0,
    nettAmount: 0,
    status: 'CANCELLED',
    remarks: 'Cancelled – customer withdrew claim',
    lines: [],
  },
]

export const MOCK_WO_CREDIT_NOTES = SEED
