import type { StandardRate } from '@/types/standard-rate'

let _store: StandardRate[] | null = null

function getStore(): StandardRate[] {
  if (!_store) _store = [...SEED]
  return _store
}

export function getMockStandardRates(): StandardRate[] {
  return getStore()
}

export function upsertMockStandardRate(r: StandardRate): void {
  const store = getStore()
  const idx = store.findIndex((x) => x.standardRateID === r.standardRateID)
  if (idx >= 0) store[idx] = r
  else _store = [...store, r]
}

export function removeMockStandardRate(id: number): void {
  _store = getStore().filter((r) => r.standardRateID !== id)
}

const SEED: StandardRate[] = [
  {
    standardRateID: 1,
    rateCode: 'STD-2024-001',
    rateDate: '2024-01-01',
    effectiveDate: '2024-02-01',
    description: 'Standard Import Rate – Q1 2024',
    remarks: 'Base rate for all import customers',
    isApproved: true,
    approvedBy: 'General Manager',
    approvedOn: '2024-01-05',
    lines: [
      {
        lineID: 1,
        chargeCode: 'STD-TRIP-001',
        chargeDescription: 'Standard Transport Per Trip (20FT)',
        orderType: 'IMPORT',
        movementCode: 'LADEN',
        chargeType: 'PER_TRIP',
        billingUnit: 'TRIP',
        size: '20FT',
        paymentTo: 'DRIVER',
        sellRate: 5000,
      },
      {
        lineID: 2,
        chargeCode: 'STD-TRIP-002',
        chargeDescription: 'Standard Transport Per Trip (40FT)',
        orderType: 'IMPORT',
        movementCode: 'LADEN',
        chargeType: 'PER_TRIP',
        billingUnit: 'TRIP',
        size: '40FT',
        paymentTo: 'DRIVER',
        sellRate: 8000,
      },
      {
        lineID: 3,
        chargeCode: 'STD-WAIT-001',
        chargeDescription: 'Standard Waiting Charge',
        orderType: 'IMPORT',
        movementCode: 'LADEN',
        chargeType: 'PER_DAY',
        billingUnit: 'DAY',
        size: 'ALL',
        paymentTo: 'DRIVER',
        sellRate: 1500,
      },
    ],
  },
  {
    standardRateID: 2,
    rateCode: 'STD-2024-002',
    rateDate: '2024-01-01',
    effectiveDate: '2024-02-01',
    description: 'Standard Export Rate – Q1 2024',
    remarks: 'Base rate for all export customers',
    isApproved: true,
    approvedBy: 'General Manager',
    approvedOn: '2024-01-05',
    lines: [
      {
        lineID: 4,
        chargeCode: 'STD-TRIP-003',
        chargeDescription: 'Standard Export Transport (20FT)',
        orderType: 'EXPORT',
        movementCode: 'LADEN',
        chargeType: 'PER_TRIP',
        billingUnit: 'TRIP',
        size: '20FT',
        paymentTo: 'DRIVER',
        sellRate: 4500,
      },
      {
        lineID: 5,
        chargeCode: 'STD-TRIP-004',
        chargeDescription: 'Standard Export Transport (40FT)',
        orderType: 'EXPORT',
        movementCode: 'LADEN',
        chargeType: 'PER_TRIP',
        billingUnit: 'TRIP',
        size: '40FT',
        paymentTo: 'DRIVER',
        sellRate: 7500,
      },
      {
        lineID: 6,
        chargeCode: 'STD-EMPTY-001',
        chargeDescription: 'Empty Return Charge',
        orderType: 'EXPORT',
        movementCode: 'EMPTY',
        chargeType: 'PER_TRIP',
        billingUnit: 'TRIP',
        size: 'ALL',
        paymentTo: 'VENDOR',
        sellRate: 2500,
      },
      {
        lineID: 7,
        chargeCode: 'STD-FUEL-001',
        chargeDescription: 'Fuel Surcharge (Standard)',
        orderType: 'EXPORT',
        movementCode: 'LADEN',
        chargeType: 'FIXED',
        billingUnit: 'TRIP',
        size: 'ALL',
        paymentTo: 'DRIVER',
        sellRate: 600,
      },
    ],
  },
  {
    standardRateID: 3,
    rateCode: 'STD-2024-003',
    rateDate: '2024-04-01',
    effectiveDate: '2024-05-01',
    description: 'Standard Yard Storage Rate – H1 2024',
    remarks: 'Applies to all customers unless negotiated separately',
    isApproved: true,
    approvedBy: 'Director',
    approvedOn: '2024-04-05',
    lines: [
      {
        lineID: 8,
        chargeCode: 'STD-STORAGE-001',
        chargeDescription: 'Yard Storage (20FT) Per Day',
        orderType: 'IMPORT',
        movementCode: 'EMPTY',
        chargeType: 'PER_DAY',
        billingUnit: 'DAY',
        size: '20FT',
        paymentTo: 'COMPANY',
        sellRate: 900,
      },
      {
        lineID: 9,
        chargeCode: 'STD-STORAGE-002',
        chargeDescription: 'Yard Storage (40FT) Per Day',
        orderType: 'IMPORT',
        movementCode: 'EMPTY',
        chargeType: 'PER_DAY',
        billingUnit: 'DAY',
        size: '40FT',
        paymentTo: 'COMPANY',
        sellRate: 1400,
      },
      {
        lineID: 10,
        chargeCode: 'STD-HANDLING-001',
        chargeDescription: 'Container Handling Fee',
        orderType: 'IMPORT',
        movementCode: 'EMPTY',
        chargeType: 'FIXED',
        billingUnit: 'MOVE',
        size: 'ALL',
        paymentTo: 'COMPANY',
        sellRate: 350,
      },
    ],
  },
  {
    standardRateID: 4,
    rateCode: 'STD-2024-004',
    rateDate: '2024-07-01',
    effectiveDate: '2024-08-01',
    description: 'Standard Import Rate – Q3 2024 (Revised)',
    remarks: 'Fuel cost adjustment applied',
    isApproved: false,
    approvedBy: '',
    approvedOn: '',
    lines: [],
  },
  {
    standardRateID: 5,
    rateCode: 'STD-2024-005',
    rateDate: '2024-08-15',
    effectiveDate: '2024-09-01',
    description: 'Night Shift Surcharge Rate',
    remarks: 'Pending management approval',
    isApproved: false,
    approvedBy: '',
    approvedOn: '',
    lines: [],
  },
  {
    standardRateID: 6,
    rateCode: 'STD-2024-006',
    rateDate: '2024-10-01',
    effectiveDate: '2024-11-01',
    description: 'Year-End Standard Rate Package',
    remarks: 'Draft – under review by pricing committee',
    isApproved: false,
    approvedBy: '',
    approvedOn: '',
    lines: [],
  },
]
