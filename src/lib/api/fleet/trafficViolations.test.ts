import { describe, expect, it } from 'vitest'
import { payrollCsv, toFormValues, toRequest, toRow, violationActions, type TrafficViolationDto } from './trafficViolations'

const dto = (p: Partial<TrafficViolationDto> = {}): TrafficViolationDto => ({
  trafficViolationId: 'tv1', branchId: 'b1', documentNo: 'TVN-0001', documentDate: '2026-11-20', status: 'OPEN', ticketNo: 'T-77',
  issuingAuthority: 'Highway police', occurredAt: '2026-11-19T02:00:00Z', locationText: 'Rama 2', assetProfileId: 'a1', assetCode: 'TRK-01',
  registrationNo: null, driverId: 'd1', driverCode: 'DRV1', driverName: 'Somchai', driverEmployment: 'EMPLOYEE', violationType: 'SPEEDING',
  description: '95 in 80', fineAmount: '1000', currencyCode: 'THB', points: 2, dueDate: '2026-12-01', paidBy: null, paidAt: null, paymentRef: null,
  deductionMode: null, deductionAmount: null, deductedAt: null, deductionPartyCode: null, deductionRef: null, payrollExportedAt: null,
  disputeReason: null, cancelReason: null, remarks: null, createdAt: '2026-11-19T03:00:00Z', rowVersion: 'rv1',
  ...p,
})

describe('traffic violation request (prompt 14 §E)', () => {
  it('maps the screen fields; optional fields with no input go back as read', () => {
    const r = toRequest(toFormValues(dto()), dto())
    expect(r).toMatchObject({ ticketNo: 'T-77', violationType: 'SPEEDING', fineAmount: 1000, driverId: 'd1', description: '95 in 80',
      issuingAuthority: 'Highway police', locationText: 'Rama 2', points: 2, dueDate: '2026-12-01', rowVersion: 'rv1' })
    expect(toRow(dto())).toMatchObject({ violationID: 'tv1', violationAmount: 1000, driverName: 'Somchai', status: 'OPEN' })
  })
})

describe('traffic violation actions', () => {
  it('deduct only when the company paid and a driver is set; take back until exported', () => {
    expect(violationActions(dto(), true)).toMatchObject({ save: true, pay: true, deduct: false, dispute: true, cancel: true })
    expect(violationActions(dto({ status: 'PAID', paidBy: 'COMPANY' }), true).deduct).toBe(true)
    expect(violationActions(dto({ status: 'PAID', paidBy: 'DRIVER' }), true).deduct).toBe(false)
    expect(violationActions(dto({ status: 'PAID', paidBy: 'COMPANY', driverId: null }), true).deduct).toBe(false)
    expect(violationActions(dto({ status: 'DEDUCTED', deductionMode: 'PAYROLL' }), true)).toMatchObject({ takeBack: true, refresh: false, save: false })
    expect(violationActions(dto({ status: 'DEDUCTED', deductionMode: 'PAYROLL', payrollExportedAt: '2026-11-21' }), true).takeBack).toBe(false)
    expect(violationActions(dto({ status: 'DEDUCTED', deductionMode: 'SUBCON' }), true).refresh).toBe(true)
    expect(violationActions(dto({ status: 'DISPUTED' }), true)).toMatchObject({ reopen: true, save: true, cancel: true, pay: false })
    expect(violationActions(dto(), false).pay).toBe(false)
  })
})

describe('payroll CSV', () => {
  it('quotes cells with commas / quotes', () => {
    const csv = payrollCsv([{ trafficViolationId: 'x', documentNo: 'TVN-1', ticketNo: 'T,1', occurredAt: '2026-11-19', driverCode: 'D1', driverName: 'A "B"',
      assetCode: 'TRK', violationType: 'SPEEDING', amount: 500, currencyCode: 'THB', deductedAt: '2026-11-20', exportedAt: '2026-11-21' }])
    expect(csv.split('\r\n')[1]).toBe('TVN-1,"T,1",2026-11-19,D1,"A ""B""",TRK,SPEEDING,500,THB,2026-11-20,2026-11-21')
  })
})
