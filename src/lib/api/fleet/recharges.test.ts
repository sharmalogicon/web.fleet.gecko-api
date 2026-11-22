import { describe, expect, it } from 'vitest'
import { canReleaseWo, describeRef, modeClass, rechargeActions, statusClass } from './recharges'

describe('recharges (prompt 12 §B/§C)', () => {
  it('status badges: FAILED red, INVOICED / DEDUCTED green, mode INVOICE blue / DEDUCTION purple', () => {
    expect(statusClass('FAILED')).toContain('red')
    expect(statusClass('INVOICED')).toContain('green')
    expect(statusClass('DEDUCTED')).toContain('green')
    expect(statusClass('CANCELLED')).toContain('gray')
    expect(modeClass('INVOICE')).toContain('blue')
    expect(modeClass('DEDUCTION')).toContain('purple')
  })

  it('row actions by status', () => {
    expect(rechargeActions('FAILED')).toEqual({ retry: true, refresh: false, cancel: true })
    expect(rechargeActions('ACCEPTED')).toEqual({ retry: false, refresh: true, cancel: true })
    expect(rechargeActions('INVOICED')).toEqual({ retry: false, refresh: false, cancel: false })
  })

  it('rate card refs', () => {
    expect(describeRef('CARD:3')).toEqual({ key: 'recharge.ref.card', detail: '3' })
    expect(describeRef('COST').key).toBe('recharge.ref.cost')
    expect(describeRef('FLAT-INCLUDED').key).toBe('recharge.ref.flatIncluded')
    expect(describeRef('TARIFF:SHOP_SUPPLIES')).toEqual({ key: 'recharge.ref.tariff', detail: 'SHOP_SUPPLIES' })
    expect(describeRef(null).key).toBe('recharge.ref.none')
  })

  it('release only on completed / closed, unbilled WOs', () => {
    expect(canReleaseWo({ status: 'COMPLETED', billingStatus: 'UNBILLED' })).toBe(true)
    expect(canReleaseWo({ status: 'CLOSED', billingStatus: 'BILLED' })).toBe(false)
    expect(canReleaseWo({ status: 'IN_PROGRESS' })).toBe(false)
  })
})
