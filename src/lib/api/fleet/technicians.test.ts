import { describe, expect, it } from 'vitest'
import { costRateText, mapFieldErrors, toRequest, toViewModel, type TechnicianDto } from './technicians'
import { technicianSchema, NEW_TECHNICIAN_DEFAULTS, type TechnicianFormValues } from '@/types/technician'

const dto: TechnicianDto = {
  technicianId: 't1', branchId: 'b1', technicianCode: 'TC-01', fullName: 'Somchai Jaidee', nickname: 'Chai', userId: null,
  userName: null, employmentType: 'EMPLOYEE', vendorPartyCode: null, primaryTradeCode: 'MECHANIC', costPerHour: null,
  otCostPerHour: null, currencyCode: null, costRate: { costPerHour: '180', otCostPerHour: 270, currencyCode: 'THB', source: 'BRANCH_TRADE' },
  hiredOn: '2024-01-15', leftOn: null, status: 'ACTIVE', remarks: null,
  skills: [{ tradeCode: 'WELDER', skillLevel: 'SENIOR', certifiedUntil: '2027-06-30' }], rowVersion: 'rv',
}

const t = (k: string) =>
  ({ 'technician.hourShort': 'h', 'technician.rateSource.BRANCH_TRADE': 'trade rate', 'technician.rateSource.TECHNICIAN': 'own rate', 'technician.noRate': 'No rate' })[k] ?? k

const valid: TechnicianFormValues = { ...NEW_TECHNICIAN_DEFAULTS, branchId: 'b1', technicianCode: 'TC-01', fullName: 'A', primaryTradeCode: 'MECHANIC' }
const issues = (v: TechnicianFormValues) => {
  const r = technicianSchema.safeParse(v)
  return r.success ? {} : Object.fromEntries(r.error.issues.map((i) => [i.path.join('.'), i.message]))
}

describe('technician adapter', () => {
  it('round-trips a record', () => {
    const v = toViewModel(dto)
    expect(v).toMatchObject({ id: 't1', nickname: 'Chai', skills: [{ tradeCode: 'WELDER', skillLevel: 'SENIOR', certifiedUntil: '2027-06-30' }] })
    expect(v.costRate).toEqual({ costPerHour: 180, otCostPerHour: 270, currencyCode: 'THB', source: 'BRANCH_TRADE' })
    expect(toRequest(v, v.rowVersion)).toMatchObject({
      technicianCode: 'TC-01', vendorPartyCode: null, costPerHour: null, currencyCode: null, rowVersion: 'rv',
      skills: [{ tradeCode: 'WELDER', skillLevel: 'SENIOR', certifiedUntil: '2027-06-30' }],
    })
  })

  it('drops the vendor of an employee and the currency without an own rate', () => {
    const r = toRequest({ ...valid, vendorPartyCode: 'abc', currencyCode: 'thb' })
    expect(r.vendorPartyCode).toBeNull()
    expect(r.currencyCode).toBeNull()
    expect(toRequest({ ...valid, employmentType: 'CONTRACTOR', vendorPartyCode: 'abc', costPerHour: 200, currencyCode: 'thb' }))
      .toMatchObject({ vendorPartyCode: 'ABC', currencyCode: 'THB', costPerHour: 200 })
  })

  it('writes the cost rate as text', () => {
    expect(costRateText(toViewModel(dto).costRate, t, 'LCB01')).toBe('฿180/h (trade rate, LCB01)')
    expect(costRateText(null, t)).toBe('No rate')
  })

  it('maps API errors, skills[1] onto the skills table', () => {
    const { fields, other } = mapFieldErrors({ 'skills[1].tradecode': 'twice', vendorpartycode: 'needed', x: 'y' })
    expect(fields).toEqual({ skills: 'twice', vendorPartyCode: 'needed' })
    expect(other).toEqual(['y'])
  })
})

describe('technician form rules (mirror TechnicianEndpoints)', () => {
  it('accepts a plain employee', () => expect(issues(valid)).toEqual({}))
  it('needs a company for a contractor', () => {
    expect(issues({ ...valid, employmentType: 'CONTRACTOR' }).vendorPartyCode).toBe('technician.rule.vendorRequired')
    expect(issues({ ...valid, vendorPartyCode: 'X' }).vendorPartyCode).toBeUndefined()
  })
  it('pairs an own rate with a currency, OT not below normal', () => {
    expect(issues({ ...valid, costPerHour: 200 }).currencyCode).toBe('technician.rule.currencyRequired')
    expect(issues({ ...valid, otCostPerHour: 300 }).costPerHour).toBe('technician.rule.otNeedsNormal')
    expect(issues({ ...valid, costPerHour: 200, otCostPerHour: 150, currencyCode: 'THB' }).otCostPerHour).toBe('technician.rule.otBelow')
    expect(issues({ ...valid, costPerHour: 200, otCostPerHour: 300, currencyCode: 'THB' })).toEqual({})
  })
  it('refuses leaving before hiring and a skill listed twice', () => {
    expect(issues({ ...valid, hiredOn: '2025-01-01', leftOn: '2024-12-31' }).leftOn).toBe('technician.rule.leftBeforeHired')
    const twice = issues({ ...valid, skills: [{ tradeCode: 'WELDER', skillLevel: 'SKILLED' }, { tradeCode: 'WELDER', skillLevel: 'MASTER' }] })
    expect(twice['skills.1.tradeCode']).toBe('technician.rule.skillTwice')
  })
  it('checks the code characters', () => {
    expect(issues({ ...valid, technicianCode: 'TC 01' }).technicianCode).toBe('technician.rule.code')
  })
})
