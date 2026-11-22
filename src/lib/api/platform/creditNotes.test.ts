import { describe, expect, it } from 'vitest'
import { apiCnStatus, creditError, nothingToCredit, reasonError, toCreditLines, toIssueRequest, viewCnStatus } from './creditNotes'

describe('WO credit note (prompt 21)', () => {
  it('status mapping', () => {
    expect(viewCnStatus('ISSUED')).toBe('ACTIVE')
    expect(viewCnStatus('CANCELLED')).toBe('CANCELLED')
    expect(apiCnStatus('ACTIVE')).toBe('ISSUED')
    expect(apiCnStatus('CANCELLED')).toBe('CANCELLED')
    expect(apiCnStatus('ALL')).toBeUndefined()
  })
  it('lines default the credit to what is open; credit ≤ remaining; 0 = skip', () => {
    const lines = toCreditLines({ lines: [
      { invoiceLineId: 'b', lineNo: 2, orderNo: 'WO-2', containerNo: null, chargeCode: 'LAB', chargeName: 'Labour', quantity: 1, amount: 500, taxRate: 7, taxAmount: 35, credited: 0, remaining: 500 },
      { invoiceLineId: 'a', lineNo: 1, orderNo: 'WO-1', containerNo: null, chargeCode: 'PRT', chargeName: 'Parts', quantity: 1, amount: 1000, taxRate: 7, taxAmount: 70, credited: 400, remaining: 600 },
    ] } as never)
    expect(lines.map((l) => [l.invoiceLineId, l.credit])).toEqual([['a', '600'], ['b', '500']])
    expect(creditError({ credit: '600', remaining: 600 })).toBeNull()
    expect(creditError({ credit: '600.01', remaining: 600 })).toBe('woCn.rule.overRemaining')
    expect(creditError({ credit: '-1', remaining: 600 })).toBe('woCn.rule.amount')
    expect(creditError({ credit: '', remaining: 600 })).toBeNull()
    const req = toIssueRequest('inv1', [{ ...lines[0], credit: '100' }, { ...lines[1], credit: '0' }], '  wrong labour hours ')
    expect(req).toEqual({ invoiceId: 'inv1', reason: 'wrong labour hours', lines: [{ invoiceLineId: 'a', amount: 100 }], creditNoteDate: null, remarks: null })
    expect(nothingToCredit([{ ...lines[0], credit: '0' }])).toBe(true)
  })
  it('reason 3–500 characters', () => {
    expect(reasonError('ab')).toBe('woCn.rule.reason')
    expect(reasonError('abc')).toBeNull()
    expect(reasonError('x'.repeat(501))).toBe('woCn.rule.reason')
  })
})
