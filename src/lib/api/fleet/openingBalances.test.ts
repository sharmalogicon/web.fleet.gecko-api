import { describe, expect, it } from 'vitest'
import { canImport, fileKey, toImportView } from './openingBalances'

const file = (name = 'meters.xlsx', size = 1000, lastModified = 1) => ({ name, size, lastModified }) as File

describe('opening balance import (prompt 18 §A)', () => {
  it('maps the result: errors in row order, clean = rows and no errors', () => {
    const v = toImportView({ kind: 'METERS', rows: 3, valid: 1, committed: 0, dryRun: true,
      errors: [{ row: 7, message: 'Unknown asset TRK-9' }, { row: 3, message: 'Reading lower than the last one' }] } as never)
    expect(v).toMatchObject({ rows: 3, valid: 1, committed: 0, dryRun: true, clean: false })
    expect(v.errors.map((e) => e.row)).toEqual([3, 7])
    expect(toImportView({ kind: 'METERS', rows: 0, valid: 0, committed: 0, dryRun: true, errors: [] } as never).clean).toBe(false)
  })
  it('import only after a clean check of the same file', () => {
    const f = file()
    const clean = { key: fileKey(f), view: toImportView({ kind: 'METERS', rows: 2, valid: 2, committed: 0, dryRun: true, errors: [] } as never) }
    expect(canImport(f, clean)).toBe(true)
    expect(canImport(file('meters.xlsx', 1001), clean)).toBe(false)
    expect(canImport(null, clean)).toBe(false)
    expect(canImport(f, null)).toBe(false)
    expect(canImport(f, { ...clean, view: { ...clean.view, clean: false } })).toBe(false)
    expect(canImport(f, { ...clean, view: { ...clean.view, dryRun: false } })).toBe(false)
  })
})
