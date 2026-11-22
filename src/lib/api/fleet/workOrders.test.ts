import { describe, expect, it } from 'vitest'
import { apiWoStatuses, chargeFor, repairSiteFor, toFormValues, toRequest, viewWoStatus, woFormSchema, woMoves, type WorkOrderDto } from './workOrders'

const charge = (p = {}) => ({ isBillable: false, billToPartyCode: null, rechargeMode: null, chargeCode: null, unitPrice: null, priceAmount: null, discountAmount: 0, ...p })

const dto = (p: Partial<WorkOrderDto> = {}): WorkOrderDto => ({
  workOrderId: 'wo1', branchId: 'b1', documentNo: 'WO-SCT1-2611-00001', documentDate: '2026-11-20', woType: 'CORRECTIVE', repairSite: 'IN_HOUSE',
  priority: 'HIGH', status: 'IN_PROGRESS', holdReasonCode: null, billingStatus: 'NONE', assetProfileId: 'a1', assetCode: 'TR-01', vehicleCode: null,
  driverId: 'd1', driverCode: 'DRV-1', workRequestId: 'wr1', defaultBillToPartyCode: null, vendorPartyCode: null, vendorInvoiceNo: null,
  estimateStatus: 'NONE', meterInKm: 120000, meterInHours: 3500, meterOutKm: null, meterOutHours: null, plannedStartAt: null, startedAt: null,
  promisedAt: null, completedAt: null, closedAt: null, takesAssetOos: true, currencyCode: 'THB', partsCost: 0, laborCost: 0, subletCost: 0,
  totalCost: 0, partsPrice: 0, laborPrice: 0, subletPrice: 0, sundryPrice: 0, discountAmount: 0, taxRate: 7, taxAmount: 0, totalPrice: 0,
  approvalStatus: 'NOT_REQUIRED', approvedAt: null, remarks: null, rowVersion: 'rv', warning: null,
  tasks: [
    { woTaskId: 't2', seqNo: 2, serviceTaskId: 'st2', pmTaskStateId: null, description: 'Brakes', complaint: 'squeal', cause: null, correction: null, status: 'OPEN', partsCost: 0, laborCost: 0, subletCost: 0, partsPrice: 0, laborPrice: 0, discountAmount: 0, remarks: null },
    { woTaskId: 't1', seqNo: 1, serviceTaskId: 'st1', pmTaskStateId: 'pm1', description: 'Oil change', complaint: null, cause: null, correction: null, status: 'DONE', partsCost: 0, laborCost: 0, subletCost: 0, partsPrice: 0, laborPrice: 0, discountAmount: 0, remarks: null },
  ],
  parts: [{ woPartId: 'p1', taskSeqNo: 1, itemId: 'i1', itemCode: 'OIL-15W40', description: 'Engine oil', qty: '20', uomCode: 'LTR', source: 'STOCK', unitCost: 95, costAmount: 1900, charge: charge() }],
  labor: [{ woLaborId: 'l1', taskSeqNo: 2, technicianId: 'tech1', technicianCode: 'T1', tradeCode: 'MECHANIC', description: null, timeBand: 'OT', startAt: null, endAt: null, hours: 1.5, stdHours: 1, costRate: 180, costRateSource: 'TENANT_TRADE', costAmount: 270, charge: charge({ chargeCode: 'LAB' }) }],
  sublets: [], sundries: [],
  ...p,
})

describe('work order status (prompt 09 §B)', () => {
  it('maps API → screen with the badges', () => {
    expect(viewWoStatus(dto({ status: 'ON_HOLD' }))).toEqual({ status: 'IN PROGRESS', onHold: true, closed: false })
    expect(viewWoStatus(dto({ status: 'CLOSED' }))).toEqual({ status: 'COMPLETED', onHold: false, closed: true })
    expect(viewWoStatus(dto({ status: 'COMPLETED', billingStatus: 'BILLED' })).status).toBe('INVOICED')
    expect(viewWoStatus(dto({ status: 'DRAFT' })).status).toBe('DRAFT')
    expect(apiWoStatuses('IN PROGRESS')).toEqual(['IN_PROGRESS', 'ON_HOLD'])
    expect(apiWoStatuses('COMPLETED')).toEqual(['COMPLETED', 'CLOSED'])
  })
  it('offers the moves of the status', () => {
    const all = { manage: true, close: true }
    expect(woMoves(dto({ status: 'DRAFT' }), all)).toEqual(['OPEN', 'CANCELLED'])
    expect(woMoves(dto({ status: 'DRAFT', approvalStatus: 'PENDING' }), all)).toEqual(['CANCELLED'])
    expect(woMoves(dto({ status: 'IN_PROGRESS' }), all)).toEqual(['ON_HOLD', 'COMPLETED', 'CANCELLED'])
    expect(woMoves(dto({ status: 'ON_HOLD' }), all)).toEqual(['IN_PROGRESS', 'CANCELLED'])
    expect(woMoves(dto({ status: 'COMPLETED' }), all)).toEqual(['CLOSED'])
    expect(woMoves(dto({ status: 'CLOSED' }), all)).toEqual(['REOPEN'])
    expect(woMoves(dto({ status: 'COMPLETED' }), { manage: true, close: false })).toEqual([])
  })
})

describe('work order request: lines', () => {
  it('reads tasks in order and points parts / labour at task positions', () => {
    const v = toFormValues(dto())
    expect(v.tasks.map((t) => t.id)).toEqual(['t1', 't2'])
    expect(v.parts[0]).toMatchObject({ id: 'p1', taskSeqNo: 1, itemId: 'i1', stockCode: 'OIL-15W40', qty: 20, unitPrice: 95 })
    expect(v.labor[0]).toMatchObject({ id: 'l1', taskSeqNo: 2, technicianId: 'tech1', chargeCode: 'LAB', actualHours: 1.5, standardHours: 1 })
  })

  it('sends every line with its id; complaint / pm link / time band kept; sublets + sundries unchanged', () => {
    const d = dto()
    const r = toRequest(toFormValues(d), d, null)
    expect(r.tasks?.map((t) => [t.id, t.status])).toEqual([['t1', 'DONE'], ['t2', 'OPEN']])
    expect(r.tasks?.[0].pmTaskStateId).toBe('pm1')
    expect(r.tasks?.[1].complaint).toBe('squeal')
    expect(r.parts?.[0]).toMatchObject({ id: 'p1', taskSeqNo: 1, itemId: 'i1', source: 'STOCK', qty: 20, unitCost: 95, uomCode: 'LTR' })
    expect(r.labor?.[0]).toMatchObject({ id: 'l1', taskSeqNo: 2, technicianId: 'tech1', tradeCode: null, timeBand: 'OT', hours: 1.5, stdHours: 1 })
    expect(r.sublets).toBeNull()
    expect(r.sundries).toBeNull()
    expect(r).toMatchObject({ meterInHours: 3500, branchId: 'b1', rowVersion: 'rv', taxRate: 7, takesAssetOos: true })
  })

  it('removes a line by leaving it out; a free-text part is DIRECT_PO; a task position past the list is dropped', () => {
    const d = dto()
    const v = toFormValues(d)
    const r = toRequest({ ...v, tasks: [v.tasks[0]], parts: [{ description: 'Wiper', qty: 2, unitPrice: 150, taskSeqNo: 2 }], labor: [] }, d, null)
    expect(r.tasks).toHaveLength(1)
    expect(r.parts?.[0]).toMatchObject({ id: null, itemId: null, source: 'DIRECT_PO', taskSeqNo: null, unitCost: 150 })
    expect(r.labor).toEqual([])
  })

  it('charges lines to the billing customer when one is set', () => {
    const d = dto()
    const r = toRequest({ ...toFormValues(d), billingCustomer: 'cus-1', parts: [{ description: 'Pad', qty: 1, unitPrice: 800, discount: 50 }] }, d, null)
    expect(r.defaultBillToPartyCode).toBe('CUS-1')
    expect(r.parts?.[0].charge).toEqual({ isBillable: true, billToPartyCode: null, rechargeMode: 'INVOICE', chargeCode: null, unitPrice: 800, discountAmount: 50 })
    expect(r.labor?.[0].charge).toMatchObject({ isBillable: true, rechargeMode: 'INVOICE', chargeCode: 'LAB', unitPrice: null })
    expect(chargeFor(false, 800, 50).isBillable).toBe(false)
  })

  it('works out the repair site from the vendor', () => {
    expect(repairSiteFor('SUP-1', 'IN_HOUSE')).toBe('VENDOR')
    expect(repairSiteFor('SUP-1', 'MIXED')).toBe('MIXED')
    expect(repairSiteFor(null, 'VENDOR')).toBe('IN_HOUSE')
    expect(repairSiteFor(null, 'ROADSIDE')).toBe('ROADSIDE')
  })

  it('needs a technician or a trade on a labour line', () => {
    const v = toFormValues(dto())
    const r = woFormSchema.safeParse({ ...v, labor: [{ description: 'x' }] })
    expect(r.success).toBe(false)
  })
})
