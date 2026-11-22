import { describe, expect, it } from 'vitest'
import { holdsAt } from './AuthContext'

const user = (permissions: string[], branchPermissions: string[]) => ({ permissions, branchPermissions }) as never

describe('holdsAt (branch-scoped platform permissions, owner answer 12 Q3)', () => {
  it('tenant-wide grants count at every branch', () => {
    expect(holdsAt(user(['revenue.tariff.manage'], []), 'revenue.tariff.manage', 'b1')).toBe(true)
  })
  it('a branch grant counts only at its branches', () => {
    const u = user([], ['revenue.tariff.view,revenue.tariff.manage@b1,b2'])
    expect(holdsAt(u, 'revenue.tariff.manage', 'b2')).toBe(true)
    expect(holdsAt(u, 'revenue.tariff.manage', 'b3')).toBe(false)
    expect(holdsAt(u, 'revenue.tariff.approve', 'b1')).toBe(false)
  })
  it('no branch = held at any branch; no user = nothing', () => {
    expect(holdsAt(user([], ['revenue.invoice.issue@b9']), 'revenue.invoice.issue', null)).toBe(true)
    expect(holdsAt(null, 'revenue.invoice.issue', 'b9')).toBe(false)
  })
})
