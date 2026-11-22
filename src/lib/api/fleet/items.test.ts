import { describe, expect, it } from 'vitest'
import { normaliseItemErrors, stockPoliciesFor, toRequest, toViewModel, type ItemDto } from './items'
import { binChanges } from './warehouses'

const policy = (warehouseId: string, p: Partial<ItemDto['stockPolicies'][number]> = {}) => ({
  warehouseId, warehouseCode: warehouseId.toUpperCase(), branchId: 'b', isDefaultWarehouse: true, defaultBinCode: null,
  reorderPoint: null, minQty: null, maxQty: null, reorderQty: null, leadTimeDays: null, ...p,
})

const dto = (p: Partial<ItemDto> = {}): ItemDto => ({
  itemId: 'i1', itemCode: 'FLT-001', descriptionEn: 'Oil filter', descriptionLocal: 'กรอง', itemType: 'PART', categoryCode: 'FILTER',
  brandCode: 'DENSO', baseUomCode: 'H87', tracking: 'LOT', oemPartNo: 'OEM-9', isOriginalPart: true, warrantyValue: 6,
  warrantyPeriod: 'MONTH', warrantyKm: 10000, isStocked: true, isActive: true, remarks: null, aliases: [{ aliasType: 'OEM', aliasCode: 'X' }],
  vendors: [], rowVersion: 'rv',
  stockPolicies: [
    policy('wh-lcb', { defaultBinCode: 'A-01', reorderPoint: '5', minQty: 2, maxQty: 20, reorderQty: 10, leadTimeDays: 3 }),
    policy('wh-sct', { minQty: 1 }),
  ],
  ...p,
})

describe('stock adapter: the default store policy', () => {
  it('reads the reorder fields from the header branch default store', () => {
    expect(toViewModel(dto(), 'wh-lcb')).toMatchObject({ location: 'A-01', reOrderLevel: 5, minQty: 2, maxQty: 20, reOrderQty: 10, leadTime: 3 })
    expect(toViewModel(dto(), 'wh-other').minQty).toBeUndefined()
    expect(toViewModel(dto(), null).location).toBeUndefined()
  })

  it('replaces only that store and keeps the others', () => {
    const d = dto()
    const v = { ...toViewModel(d, 'wh-lcb'), minQty: 4, location: 'b-02' }
    expect(stockPoliciesFor(v, d, 'wh-lcb')).toEqual([
      { warehouseId: 'wh-sct', defaultBinCode: null, reorderPoint: null, minQty: 1, maxQty: null, reorderQty: null, leadTimeDays: null },
      { warehouseId: 'wh-lcb', defaultBinCode: 'B-02', reorderPoint: 5, minQty: 4, maxQty: 20, reorderQty: 10, leadTimeDays: 3 },
    ])
  })

  it('adds a policy for a store that had none', () => {
    const d = dto({ stockPolicies: [] })
    expect(stockPoliciesFor({ ...toViewModel(d, 'wh-new'), reOrderLevel: 7 }, d, 'wh-new')).toEqual([
      { warehouseId: 'wh-new', defaultBinCode: null, reorderPoint: 7, minQty: null, maxQty: null, reorderQty: null, leadTimeDays: null },
    ])
  })

  it('drops an all-empty policy, and sends null (unchanged) without a default store', () => {
    const d = dto()
    const cleared = { ...toViewModel(d, 'wh-lcb'), location: '', reOrderLevel: undefined, minQty: undefined, maxQty: undefined, reOrderQty: undefined, leadTime: undefined }
    expect(stockPoliciesFor(cleared, d, 'wh-lcb')?.map((p) => p.warehouseId)).toEqual(['wh-sct'])
    expect(stockPoliciesFor(toViewModel(d, null), d, null)).toBeNull()
  })
})

describe('stock adapter: the item', () => {
  it('sends aliases/vendors null (unchanged) and the fields with no input as read', () => {
    const d = dto()
    expect(toRequest(toViewModel(d, 'wh-lcb'), toViewModel(d, 'wh-lcb'), 'wh-lcb')).toMatchObject({
      itemCode: 'FLT-001', itemType: 'PART', baseUomCode: 'H87', tracking: 'LOT', oemPartNo: 'OEM-9', descriptionLocal: 'กรอง',
      warrantyValue: 6, warrantyPeriod: 'MONTH', warrantyKm: 10000, aliases: null, vendors: null, rowVersion: 'rv',
    })
  })
  it('sends warranty value and period both or neither', () => {
    const d = dto()
    const r = toRequest({ ...toViewModel(d, null), warrantyPeriod: '' }, toViewModel(d, null), null)
    expect([r.warrantyValue, r.warrantyPeriod]).toEqual([null, null])
  })
  it('creates with defaults', () => {
    expect(toRequest({ code: 'n-1', description: 'New', isActive: true, isOriginalPart: false, uom: 'ltr' }, undefined, null))
      .toMatchObject({ itemCode: 'N-1', itemType: 'PART', tracking: 'NONE', baseUomCode: 'LTR', stockPolicies: null, rowVersion: null })
  })
  it('normalises indexed policy errors', () => {
    expect(normaliseItemErrors({ 'stockPolicies[1].maxQty': 'x' })).toEqual({ 'stockPolicies.maxQty': 'x' })
  })
})

describe('store bins: what to write', () => {
  const stored = [{ binId: 'b1', binCode: 'A-01', description: null, isActive: true, rowVersion: 'r1' }]
  it('posts new rows and puts changed ones only', () => {
    const { creates, updates } = binChanges(
      [
        { binId: 'b1', binCode: 'a-01', description: '', isActive: true, rowVersion: 'r1' },
        { binCode: 'b-02', description: 'Shelf', isActive: true },
      ],
      stored,
    )
    expect(updates).toEqual([])
    expect(creates).toEqual([{ binCode: 'B-02', description: 'Shelf', isActive: true, rowVersion: null }])
    expect(binChanges([{ binId: 'b1', binCode: 'A-01', isActive: false, rowVersion: 'r1' }], stored).updates).toEqual([
      { binId: 'b1', body: { binCode: 'A-01', description: null, isActive: false, rowVersion: 'r1' } },
    ])
  })
})
