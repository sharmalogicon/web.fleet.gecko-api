import { describe, expect, it } from 'vitest'
import { apiWrStatuses, toFormValues, toRequest, viewWrStatus, wrActions, type WorkRequestDto } from './workRequests'

const dto = (p: Partial<WorkRequestDto> = {}): WorkRequestDto => ({
  workRequestId: 'w1', branchId: 'b1', documentNo: 'WR-SCT1-2611-00001', documentDate: '2026-11-20', status: 'DRAFT', assetProfileId: 'a1',
  assetCode: 'TR-01', driverCode: null, priority: 'HIGH', source: 'DRIVER', problem: 'Brakes squeal', meterKm: 120000, meterHours: null,
  billToPartyCode: 'CUS-1', vendorPartyCode: null, workOrderId: null, workOrderNo: null, workOrderStatus: null, rejectReason: null,
  remarks: null, tasks: [], createdAt: '2026-11-20T01:00:00Z', rowVersion: 'rv', ...p,
})

describe('work request status (prompt 09 §A)', () => {
  it('maps API → screen', () => {
    expect(viewWrStatus(dto({ status: 'DRAFT' })).status).toBe('DRAFT')
    expect(viewWrStatus(dto({ status: 'SUBMITTED' }))).toEqual({ status: 'SUBMITTED', approved: false, rejected: false })
    expect(viewWrStatus(dto({ status: 'APPROVED' }))).toEqual({ status: 'SUBMITTED', approved: true, rejected: false })
    expect(viewWrStatus(dto({ status: 'CONVERTED', workOrderStatus: 'IN_PROGRESS' })).status).toBe('IN PROGRESS')
    expect(viewWrStatus(dto({ status: 'CONVERTED', workOrderStatus: 'ON_HOLD' })).status).toBe('IN PROGRESS')
    expect(viewWrStatus(dto({ status: 'CONVERTED', workOrderStatus: 'COMPLETED' })).status).toBe('COMPLETED')
    expect(viewWrStatus(dto({ status: 'CONVERTED', workOrderStatus: 'CLOSED' })).status).toBe('COMPLETED')
    expect(viewWrStatus(dto({ status: 'REJECTED' }))).toEqual({ status: 'CANCELLED', approved: false, rejected: true })
    expect(viewWrStatus(dto({ status: 'CANCELLED' })).status).toBe('CANCELLED')
  })
  it('maps the filter to API statuses', () => {
    expect(apiWrStatuses('SUBMITTED')).toEqual(['SUBMITTED', 'APPROVED'])
    expect(apiWrStatuses('CANCELLED')).toEqual(['REJECTED', 'CANCELLED'])
    expect(apiWrStatuses('IN PROGRESS')).toEqual(['CONVERTED'])
    expect(apiWrStatuses('ALL')).toBeUndefined()
  })
  it('offers the actions of the status', () => {
    const all = { create: true, approve: true, convert: true }
    expect(wrActions(undefined, all)).toMatchObject({ save: true, submit: true, approve: false, convert: false, cancel: false })
    expect(wrActions(dto({ status: 'SUBMITTED' }), all)).toMatchObject({ save: true, submit: false, approve: true, reject: true, cancel: true })
    expect(wrActions(dto({ status: 'APPROVED' }), all)).toMatchObject({ save: false, convert: true, cancel: true })
    expect(wrActions(dto({ status: 'CONVERTED' }), all)).toMatchObject({ save: false, convert: false, cancel: false })
    expect(wrActions(dto({ status: 'SUBMITTED' }), { ...all, approve: false }).approve).toBe(false)
  })
})

describe('work request request', () => {
  it('sends the form fields and keeps source / meters / tasks as read', () => {
    const d = dto()
    const r = toRequest({ ...toFormValues(d), vendorCode: 'sup-9' }, d)
    expect(r).toMatchObject({
      assetProfileId: 'a1', problem: 'Brakes squeal', priority: 'HIGH', source: 'DRIVER', meterKm: 120000, billToPartyCode: 'CUS-1',
      vendorPartyCode: 'SUP-9', tasks: null, submit: false, rowVersion: 'rv', documentDate: '2026-11-20',
    })
  })
  it('creates a MANUAL request, optionally submitted', () => {
    const r = toRequest({ priorityType: 'NORMAL', equipmentCode: 'TR-01', assetProfileId: 'a1', description: ' x ' }, undefined, true)
    expect(r).toMatchObject({ source: 'MANUAL', problem: 'x', tasks: [], submit: true, rowVersion: null, billToPartyCode: null })
  })
})
