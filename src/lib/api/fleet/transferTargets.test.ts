import { describe, expect, it } from 'vitest'
import { targetsState, toTargetsRequest } from './warehouses'

const w = (id: string) => ({ warehouseId: id })

describe('store transfer targets (owner-approved proposal 2026-11-22)', () => {
  it('reads every other active store as ANY; a subset as LIST', () => {
    expect(targetsState([w('b'), w('c')], [w('b'), w('c')])).toEqual({ mode: 'ANY', ids: [] })
    expect(targetsState([w('b')], [w('b'), w('c')])).toEqual({ mode: 'LIST', ids: ['b'] })
    expect(targetsState([], [w('b')])).toEqual({ mode: 'ANY', ids: [] })
  })
  it('ANY → empty list; LIST needs at least one store; no duplicates', () => {
    expect(toTargetsRequest('ANY', ['b'])).toEqual({ body: { targetWarehouseIds: [] }, error: null })
    expect(toTargetsRequest('LIST', [])).toEqual({ body: null, error: 'store.targets.rule.pickOne' })
    expect(toTargetsRequest('LIST', ['b', 'b', 'c']).body).toEqual({ targetWarehouseIds: ['b', 'c'] })
  })
})
