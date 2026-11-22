import { describe, expect, it } from 'vitest'
import { activeAssignments, leftText, pmFormSchema, toFormValues, toRequest, type PmProgramDto } from './pm'

const task = (id: string, serviceTaskId: string, seqNo: number, p: Partial<PmProgramDto['tasks'][number]> = {}) => ({
  pmProgramTaskId: id, serviceTaskId, taskCode: serviceTaskId.toUpperCase(), taskDescription: 'x', seqNo, intervalKm: 10000,
  intervalHours: 500, intervalDays: 180, remarks: null, parts: [{ itemId: 'i1', itemCode: 'OIL', itemDescription: 'Oil', qty: '20', uomCode: 'LTR' }],
  labor: [{ tradeCode: 'MECHANIC', stdHours: 1.5 }], ...p,
})

const dto: PmProgramDto = {
  pmProgramId: 'p1', programCode: 'PM-10K', nameEn: '10,000 km service', nameLocal: 'บริการ', categoryCode: 'PM', effectiveDate: '2026-01-01',
  defaultIntervalKm: 10000, assetClass: 'PRIME_MOVER', isActive: true, remarks: null, rowVersion: 'rv',
  tasks: [task('t2', 'st-filter', 2, { intervalKm: 20000 }), task('t1', 'st-oil', 1)],
  assignments: [
    { pmAssignmentId: 'a1', assetProfileId: 'x', assetCode: 'TR-1', registrationNo: null, assetClass: null, activeFrom: '2026-01-01', activeTo: null, remarks: null, rowVersion: 'r' },
    { pmAssignmentId: 'a2', assetProfileId: 'y', assetCode: 'TR-2', registrationNo: null, assetClass: null, activeFrom: '2026-01-01', activeTo: '2026-02-01', remarks: null, rowVersion: 'r' },
  ],
}

describe('PM program adapter', () => {
  it('maps to the form, services in task order', () => {
    const v = toFormValues(dto)
    expect(v).toMatchObject({ scheduleNo: 'PM-10K', serviceTypeDescription: '10,000 km service', serviceType: 'PM', meterKm: 10000, scheduleDate: '2026-01-01' })
    expect(v.services.map((s) => s.serviceTaskId)).toEqual(['st-oil', 'st-filter'])
  })

  it('sends tasks in the form order with hours / days / parts / labour as read', () => {
    const v = toFormValues(dto)
    const r = toRequest({ ...v, services: [v.services[1], { ...v.services[0], meterInterval: 15000 }] }, dto)
    expect(r.tasks?.map((t) => [t.serviceTaskId, t.intervalKm])).toEqual([['st-filter', 20000], ['st-oil', 15000]])
    expect(r.tasks?.[1]).toMatchObject({ intervalHours: 500, intervalDays: 180, parts: [{ itemId: 'i1', qty: '20' }], labor: [{ tradeCode: 'MECHANIC', stdHours: 1.5 }] })
    expect(r).toMatchObject({ nameLocal: 'บริการ', assetClass: 'PRIME_MOVER', rowVersion: 'rv' })
  })

  it('a new or re-pointed row carries nothing of the old task', () => {
    const v = toFormValues(dto)
    const r = toRequest({ ...v, services: [{ ...v.services[0], serviceTaskId: 'st-new' }, { serviceTaskId: 'st-other' }] }, dto)
    expect(r.tasks?.[0]).toMatchObject({ serviceTaskId: 'st-new', intervalHours: null, parts: null, labor: null })
    expect(r.tasks?.[1]).toMatchObject({ serviceTaskId: 'st-other', intervalKm: null, parts: null })
  })

  it('refuses a task listed twice', () => {
    const r = pmFormSchema.safeParse({ ...toFormValues(dto), services: [{ serviceTaskId: 'a' }, { serviceTaskId: 'a' }] })
    expect(r.success).toBe(false)
  })

  it('lists only assignments still in force', () => {
    expect(activeAssignments(dto, '2026-11-20').map((a) => a.pmAssignmentId)).toEqual(['a1'])
  })
})

describe('PM due text', () => {
  const t = (k: string) => ({ 'pm.late': 'late', 'pm.left': 'left' })[k] ?? k
  it('says left or late', () => {
    expect(leftText(1200, 'km', t)).toBe('1,200 km left')
    expect(leftText(-350, 'km', t)).toBe('350 km late')
    expect(leftText(undefined, 'km', t)).toBeNull()
  })
})
