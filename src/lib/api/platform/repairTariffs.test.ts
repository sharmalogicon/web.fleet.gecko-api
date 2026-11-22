import { describe, expect, it } from 'vitest'
import { appliesTo, copyCard, defaultChargeCode, newRow, rateMeaning, toCardRequest, toLineInput } from './repairTariffs'

describe('repair tariff line kinds (prompt 12 §A)', () => {
  it('maps each kind to its "Applies to" inputs', () => {
    expect(appliesTo('LABOR')).toEqual(['tradeCode', 'timeBand', 'minQty'])
    expect(appliesTo('FLAT')).toEqual(['serviceTaskCode', 'stdHours'])
    expect(appliesTo('MARKUP')).toEqual(['costFrom', 'costTo', 'itemCategoryCode'])
    expect(appliesTo('PART_PRICE')).toEqual(['itemCode'])
    expect(appliesTo('SUNDRY', 'SHOP_SUPPLIES')).toEqual(['sundryKind', 'capAmount'])
    expect(appliesTo('SUNDRY', 'CALL_OUT')).toEqual(['sundryKind'])
  })

  it('says what the rate means', () => {
    expect(rateMeaning('LABOR')).toBe('perHour')
    expect(rateMeaning('MARKUP')).toBe('percent')
    expect(rateMeaning('SUNDRY', 'SHOP_SUPPLIES')).toBe('percent')
    expect(rateMeaning('SUNDRY', 'TOWING')).toBe('amount')
  })

  it('default charge codes by kind (sublet markup → WO_SUBLET)', () => {
    expect(defaultChargeCode('LABOR')).toBe('WO_LABOR')
    expect(defaultChargeCode('PART_PRICE')).toBe('WO_PARTS')
    expect(defaultChargeCode('MARKUP', 'SUBLET')).toBe('WO_SUBLET')
    expect(defaultChargeCode('SUNDRY')).toBe('WO_SUNDRY')
  })

  it('sends only the kind\'s fields; others null', () => {
    const r = { ...newRow('LABOR'), tradeCode: 'mech', minQty: '1', rate: '450', itemCode: 'LEFTOVER', costFrom: '9' }
    const l = toLineInput(r)
    expect(l).toMatchObject({ lineKind: 'LABOR', tradeCode: 'MECH', timeBand: 'NORMAL', minQty: 1, rate: 450, itemCode: null, costFrom: null })
    const m = toLineInput({ ...newRow('MARKUP'), costFrom: '0', costTo: '1000', rate: '15', tradeCode: 'X' })
    expect(m).toMatchObject({ costFrom: 0, costTo: 1000, itemCategoryCode: null, tradeCode: null, timeBand: null, rate: 15 })
  })

  it('standard cards never send a party; copy makes a DRAFT-ready header', () => {
    const h = { cardCode: 'std-1', cardDate: '2026-11-20', effectiveFrom: '2026-12-01', effectiveTo: '', partyCode: 'CUST', currencyCode: '', pricesIncludeTax: false, description: '', salesPerson: '', contactNo: '', remarks: '' }
    expect(toCardRequest(h, [], true)).toMatchObject({ cardCode: 'STD-1', partyCode: null, currencyCode: 'THB', effectiveTo: null })
    expect(toCardRequest(h, [], false).partyCode).toBe('CUST')
    const c = copyCard({ cardCode: 'C1', partyCode: 'P', currencyCode: 'THB', pricesIncludeTax: false, description: null, salesPerson: null, contactNo: null, remarks: null, lines: [] } as never)
    expect(c.header.cardCode).toBe('C1-COPY')
  })
})

describe('standard cards are always open-ended (owner answer 12 Q2)', () => {
  it('never sends effectiveTo for a standard card', () => {
    const h = { cardCode: 'S', cardDate: '2026-11-20', effectiveFrom: '2026-11-20', effectiveTo: '2027-01-01', partyCode: '', currencyCode: 'THB', pricesIncludeTax: false, description: '', salesPerson: '', contactNo: '', remarks: '' }
    expect(toCardRequest(h, [], true).effectiveTo).toBeNull()
    expect(toCardRequest(h, [], false).effectiveTo).toBe('2027-01-01')
  })
})
