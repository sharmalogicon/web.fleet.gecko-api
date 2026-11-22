import { describe, expect, it } from 'vitest'
import { answerErrors, isFail, lineErrors, numberFails, priorityForSeverity, toAnswers, toTemplateItems, emptyLine, type TemplateItemDto } from './inspections'
import { uploadError, MAX_BYTES } from './woAttachments'

const item = (id: string, responseType: string, p: Partial<TemplateItemDto> = {}): TemplateItemDto => ({
  inspectionTemplateItemId: id, seqNo: 1, sectionEn: 'Brakes', sectionLocal: null, itemTextEn: 'Pad', itemTextLocal: null, responseType,
  unitLabel: null, minValue: null, maxValue: null, photoRequiredOnFail: false, defaultSeverity: 'MAJOR', ...p,
})

describe('inspection answers (prompt 10 §C)', () => {
  const items = [item('a', 'PASS_FAIL'), item('b', 'NUMBER', { minValue: 4, maxValue: '30', unitLabel: 'mm' }), item('c', 'TEXT'), item('d', 'PHOTO')]

  it('a NUMBER outside min–max is a FAIL', () => {
    expect(numberFails(items[1], '3.5')).toBe(true)
    expect(numberFails(items[1], '31')).toBe(true)
    expect(numberFails(items[1], '12')).toBe(false)
    expect(numberFails(items[1], '')).toBe(false)
    expect(isFail(items[1], { valueNumber: '2' })).toBe(true)
  })

  it('every line must be answered, a FAIL needs a comment', () => {
    const e = answerErrors(items, { a: { response: 'FAIL' }, b: { valueNumber: '2', comment: 'worn' }, c: { valueText: ' ' } })
    expect(e).toEqual({ a: 'insp.rule.failComment', c: 'insp.rule.answer', d: 'insp.rule.answer' })
    expect(answerErrors(items, { a: { response: 'PASS' }, b: { valueNumber: '10' }, c: { valueText: 'ok' }, d: { response: 'NA' } })).toEqual({})
  })

  it('maps the answers to the request by response type', () => {
    const r = toAnswers(items, { a: { response: 'PASS', valueNumber: '9' }, b: { valueNumber: '10', response: 'FAIL' }, c: { valueText: ' ok ' }, d: { response: 'FAIL', comment: 'cracked' } })
    expect(r).toEqual([
      { inspectionTemplateItemId: 'a', response: 'PASS', valueNumber: null, valueText: null, comment: null },
      { inspectionTemplateItemId: 'b', response: null, valueNumber: 10, valueText: null, comment: null },
      { inspectionTemplateItemId: 'c', response: null, valueNumber: null, valueText: 'ok', comment: null },
      { inspectionTemplateItemId: 'd', response: 'FAIL', valueNumber: null, valueText: null, comment: 'cracked' },
    ])
  })
})

describe('defects', () => {
  it('raises the WR with a priority from the severity', () => {
    expect(priorityForSeverity('OUT_OF_SERVICE')).toBe('URGENT')
    expect(priorityForSeverity('MAJOR')).toBe('HIGH')
    expect(priorityForSeverity('MINOR')).toBe('NORMAL')
  })
})

describe('checklist lines', () => {
  it('checks text and min ≤ max; units and limits only for NUMBER', () => {
    const lines = [{ ...emptyLine('A'), itemTextEn: 'Tread', responseType: 'NUMBER' as const, minValue: '10', maxValue: '2', unitLabel: 'mm' }, emptyLine('A')]
    expect(lineErrors(lines)).toEqual({ 0: 'insp.rule.minMax', 1: 'insp.rule.itemText' })
    const out = toTemplateItems([{ ...lines[0], minValue: '1' }, { ...emptyLine(), itemTextEn: 'Horn', unitLabel: 'x', minValue: '3' }])
    expect(out[0]).toMatchObject({ responseType: 'NUMBER', unitLabel: 'mm', minValue: 1, maxValue: 2, sectionEn: 'A' })
    expect(out[1]).toMatchObject({ responseType: 'PASS_FAIL', unitLabel: null, minValue: null, maxValue: null, sectionEn: null })
  })
})

describe('photo upload check (prompt 10 §A)', () => {
  it('allows JPEG / PNG / WebP / PDF up to 10 MB', () => {
    expect(uploadError({ type: 'image/jpeg', size: 1000 })).toBeNull()
    expect(uploadError({ type: 'application/pdf', size: MAX_BYTES })).toBeNull()
    expect(uploadError({ type: 'image/gif', size: 10 })).toBe('wo.photo.badType')
    expect(uploadError({ type: 'image/png', size: MAX_BYTES + 1 })).toBe('wo.photo.tooBig')
  })
})
