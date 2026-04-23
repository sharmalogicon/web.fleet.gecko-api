import type { VendorCreditNote } from '@/types/vendor-credit-note'

let _store: VendorCreditNote[] | null = null

function getStore(): VendorCreditNote[] {
  if (!_store) _store = [...SEED]
  return _store
}

export function getMockVendorCreditNotes(): VendorCreditNote[] {
  return getStore()
}

export function upsertMockVendorCreditNote(r: VendorCreditNote): void {
  const store = getStore()
  const idx = store.findIndex((x) => x.vendorCreditNoteID === r.vendorCreditNoteID)
  if (idx >= 0) store[idx] = r
  else _store = [...store, r]
}

export function removeMockVendorCreditNote(id: number): void {
  _store = getStore().filter((r) => r.vendorCreditNoteID !== id)
}

const SEED: VendorCreditNote[] = [
  {
    vendorCreditNoteID: 1,
    creditNoteNo: 'CN-VD-2024-001',
    creditNoteDate: '2024-01-18',
    vendorCode: 'VND-001',
    vendorName: 'Auto Parts Supplier Co.',
    address: '10 Industrial Estate, Samut Prakan 10280',
    creditTerm: 'Net 30',
    discountType: 'PERCENT',
    discount: 5,
    discountAmount: 750,
    taxType: 'VAT',
    vat: 7,
    vatAmount: 1050,
    totalAmount: 15000,
    nettAmount: 15300,
    status: 'ACTIVE',
    remarks: 'Price correction on invoice VND-INV-2024-010',
    lines: [
      {
        lineID: 1,
        transactionNo: 'VTX-001',
        equipmentCode: 'TRK-001',
        glCode: 'GL-4001',
        code: 'SP-OIL-001',
        description: 'Engine oil overcharge credit',
      },
      {
        lineID: 2,
        transactionNo: 'VTX-002',
        equipmentCode: 'TRK-001',
        glCode: 'GL-4002',
        code: 'SP-FLT-001',
        description: 'Oil filter credit',
      },
    ],
  },
  {
    vendorCreditNoteID: 2,
    creditNoteNo: 'CN-VD-2024-002',
    creditNoteDate: '2024-02-05',
    vendorCode: 'VND-002',
    vendorName: 'Heavy Parts Thailand Ltd.',
    address: '55 Bangna-Trad Rd, Bangkok 10260',
    creditTerm: 'Net 45',
    discountType: 'AMOUNT',
    discount: 3000,
    discountAmount: 3000,
    taxType: 'VAT',
    vat: 7,
    vatAmount: 1470,
    totalAmount: 21000,
    nettAmount: 19470,
    status: 'ACTIVE',
    remarks: 'Returned defective brake pads',
    lines: [
      {
        lineID: 3,
        transactionNo: 'VTX-010',
        equipmentCode: 'BUS-001',
        glCode: 'GL-4003',
        code: 'SP-BRK-001',
        description: 'Brake pad return credit',
      },
      {
        lineID: 4,
        transactionNo: 'VTX-011',
        equipmentCode: 'BUS-001',
        glCode: 'GL-4004',
        code: 'SP-BRK-002',
        description: 'Brake disc partial credit',
      },
      {
        lineID: 5,
        transactionNo: 'VTX-012',
        equipmentCode: 'BUS-002',
        glCode: 'GL-4005',
        code: 'SP-BRK-003',
        description: 'Caliper credit – wrong spec',
      },
    ],
  },
  {
    vendorCreditNoteID: 3,
    creditNoteNo: 'CN-VD-2024-003',
    creditNoteDate: '2024-02-22',
    vendorCode: 'VND-003',
    vendorName: 'Thai Tyre Distribution Co.',
    address: '200 Ladkrabang Rd, Bangkok 10520',
    creditTerm: 'COD',
    discountType: 'PERCENT',
    discount: 8,
    discountAmount: 1600,
    taxType: 'VAT',
    vat: 7,
    vatAmount: 1400,
    totalAmount: 20000,
    nettAmount: 19800,
    status: 'ACTIVE',
    remarks: 'Tyre quality claim credit',
    lines: [
      {
        lineID: 6,
        transactionNo: 'VTX-020',
        equipmentCode: 'TRK-005',
        glCode: 'GL-4010',
        code: 'TYR-RAD-001',
        description: 'Radial tyre credit – batch defect',
      },
      {
        lineID: 7,
        transactionNo: 'VTX-021',
        equipmentCode: 'TRK-005',
        glCode: 'GL-4011',
        code: 'TYR-RAD-002',
        description: 'Tube replacement credit',
      },
    ],
  },
  {
    vendorCreditNoteID: 4,
    creditNoteNo: 'CN-VD-2024-004',
    creditNoteDate: '2024-03-14',
    vendorCode: 'VND-004',
    vendorName: 'Northern Spare Parts Ltd.',
    address: '88 Chang Klan Rd, Chiang Mai 50100',
    creditTerm: 'Net 60',
    discountType: undefined,
    discount: 0,
    discountAmount: 0,
    taxType: 'VAT',
    vat: 7,
    vatAmount: 700,
    totalAmount: 10000,
    nettAmount: 10700,
    status: 'ACTIVE',
    remarks: 'Short delivery credit',
    lines: [
      {
        lineID: 8,
        transactionNo: 'VTX-030',
        equipmentCode: 'TRK-007',
        glCode: 'GL-4020',
        code: 'SP-ENG-001',
        description: 'Engine gasket – short delivery',
      },
    ],
  },
  {
    vendorCreditNoteID: 5,
    creditNoteNo: 'CN-VD-2024-005',
    creditNoteDate: '2024-04-02',
    vendorCode: 'VND-001',
    vendorName: 'Auto Parts Supplier Co.',
    address: '10 Industrial Estate, Samut Prakan 10280',
    creditTerm: 'Net 30',
    discountType: undefined,
    discount: 0,
    discountAmount: 0,
    taxType: 'NONE',
    vat: 0,
    vatAmount: 0,
    totalAmount: 0,
    nettAmount: 0,
    status: 'CANCELLED',
    remarks: 'Cancelled – vendor dispute resolved',
    lines: [],
  },
  {
    vendorCreditNoteID: 6,
    creditNoteNo: 'CN-VD-2024-006',
    creditNoteDate: '2024-04-20',
    vendorCode: 'VND-002',
    vendorName: 'Heavy Parts Thailand Ltd.',
    address: '55 Bangna-Trad Rd, Bangkok 10260',
    creditTerm: 'Net 45',
    discountType: undefined,
    discount: 0,
    discountAmount: 0,
    taxType: 'NONE',
    vat: 0,
    vatAmount: 0,
    totalAmount: 0,
    nettAmount: 0,
    status: 'CANCELLED',
    remarks: 'Cancelled – issued in error',
    lines: [],
  },
]

export const MOCK_VENDOR_CREDIT_NOTES = SEED
