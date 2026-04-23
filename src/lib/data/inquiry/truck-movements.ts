const delay = (ms: number) => new Promise<void>((res) => setTimeout(res, ms))

export interface TruckMovement {
  movementID: number
  truckNo: string
  dateTime: string
  durationMins?: number
  haulierCode?: string
  tripType: 'IMPORT' | 'EXPORT' | 'LOCAL'
  bookingBLNo?: string
  containerSize?: string
  containerNo?: string
  agentCode?: string
  orderNo?: string
  movementCode?: string
}

export interface TruckMovementCriteria {
  truckNo?: string
  tripType?: string
  dateFrom?: string
  dateTo?: string
}

let _movements: TruckMovement[] | null = null

function getMovements(): TruckMovement[] {
  if (!_movements) {
    _movements = [
      {
        movementID: 1,
        truckNo: 'TRK-001',
        dateTime: '2024-03-01T08:15:00',
        durationMins: 45,
        haulierCode: 'HL-001',
        tripType: 'IMPORT',
        bookingBLNo: 'BL-2024-0301',
        containerSize: '40FT',
        containerNo: 'CSNU-4501234',
        agentCode: 'AGT-BKK',
        orderNo: 'ORD-2024-0301',
        movementCode: 'LADEN',
      },
      {
        movementID: 2,
        truckNo: 'TRK-002',
        dateTime: '2024-03-01T09:30:00',
        durationMins: 30,
        haulierCode: 'HL-002',
        tripType: 'EXPORT',
        bookingBLNo: 'BL-2024-0302',
        containerSize: '20FT',
        containerNo: 'TCKU-2201567',
        agentCode: 'AGT-LCB',
        orderNo: 'ORD-2024-0302',
        movementCode: 'LADEN',
      },
      {
        movementID: 3,
        truckNo: 'TRK-001',
        dateTime: '2024-03-01T14:00:00',
        durationMins: 20,
        haulierCode: 'HL-001',
        tripType: 'LOCAL',
        bookingBLNo: undefined,
        containerSize: undefined,
        containerNo: undefined,
        agentCode: undefined,
        orderNo: 'ORD-2024-0303',
        movementCode: 'EMPTY',
      },
      {
        movementID: 4,
        truckNo: 'TRK-003',
        dateTime: '2024-03-02T07:45:00',
        durationMins: 60,
        haulierCode: 'HL-003',
        tripType: 'IMPORT',
        bookingBLNo: 'BL-2024-0304',
        containerSize: '40FT',
        containerNo: 'HLXU-3309871',
        agentCode: 'AGT-BKK',
        orderNo: 'ORD-2024-0304',
        movementCode: 'LADEN',
      },
      {
        movementID: 5,
        truckNo: 'TRK-004',
        dateTime: '2024-03-02T10:20:00',
        durationMins: 25,
        haulierCode: 'HL-001',
        tripType: 'EXPORT',
        bookingBLNo: 'BL-2024-0305',
        containerSize: '20FT',
        containerNo: 'MSCU-1104455',
        agentCode: 'AGT-PCT',
        orderNo: 'ORD-2024-0305',
        movementCode: 'LADEN',
      },
      {
        movementID: 6,
        truckNo: 'TRK-002',
        dateTime: '2024-03-02T13:15:00',
        durationMins: 15,
        haulierCode: 'HL-002',
        tripType: 'LOCAL',
        bookingBLNo: undefined,
        containerSize: undefined,
        containerNo: undefined,
        agentCode: undefined,
        orderNo: 'ORD-2024-0306',
        movementCode: 'EMPTY',
      },
      {
        movementID: 7,
        truckNo: 'TRK-005',
        dateTime: '2024-03-03T08:00:00',
        durationMins: 90,
        haulierCode: 'HL-004',
        tripType: 'IMPORT',
        bookingBLNo: 'BL-2024-0307',
        containerSize: '40FT',
        containerNo: 'OOLU-6672334',
        agentCode: 'AGT-BKK',
        orderNo: 'ORD-2024-0307',
        movementCode: 'LADEN',
      },
      {
        movementID: 8,
        truckNo: 'TRK-003',
        dateTime: '2024-03-03T11:30:00',
        durationMins: 40,
        haulierCode: 'HL-003',
        tripType: 'EXPORT',
        bookingBLNo: 'BL-2024-0308',
        containerSize: '20FT',
        containerNo: 'YMLU-8821009',
        agentCode: 'AGT-LCB',
        orderNo: 'ORD-2024-0308',
        movementCode: 'LADEN',
      },
      {
        movementID: 9,
        truckNo: 'TRK-004',
        dateTime: '2024-03-04T09:00:00',
        durationMins: 35,
        haulierCode: 'HL-001',
        tripType: 'LOCAL',
        bookingBLNo: undefined,
        containerSize: undefined,
        containerNo: undefined,
        agentCode: undefined,
        orderNo: 'ORD-2024-0309',
        movementCode: 'EMPTY',
      },
      {
        movementID: 10,
        truckNo: 'TRK-005',
        dateTime: '2024-03-04T15:45:00',
        durationMins: 50,
        haulierCode: 'HL-004',
        tripType: 'IMPORT',
        bookingBLNo: 'BL-2024-0310',
        containerSize: '40FT',
        containerNo: 'CMAU-5567890',
        agentCode: 'AGT-PCT',
        orderNo: 'ORD-2024-0310',
        movementCode: 'LADEN',
      },
    ]
  }
  return _movements
}

export async function getTruckMovementInquiry(criteria: TruckMovementCriteria): Promise<TruckMovement[]> {
  await delay(200)
  let results = getMovements()

  if (criteria.truckNo) {
    const q = criteria.truckNo.toLowerCase()
    results = results.filter((r) => r.truckNo.toLowerCase().includes(q))
  }

  if (criteria.tripType && criteria.tripType !== 'ALL') {
    results = results.filter((r) => r.tripType === criteria.tripType)
  }

  if (criteria.dateFrom) {
    results = results.filter((r) => r.dateTime.slice(0, 10) >= criteria.dateFrom!)
  }

  if (criteria.dateTo) {
    results = results.filter((r) => r.dateTime.slice(0, 10) <= criteria.dateTo!)
  }

  return results
}
