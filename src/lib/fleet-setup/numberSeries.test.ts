import { describe, expect, it } from 'vitest';
import { datePart, datePartsFor, exampleNumber, validateSeries, type SeriesFields } from './numberSeries';

const NOV_2026 = new Date(Date.UTC(2026, 10, 20, 12));

const wo: SeriesFields = {
  prefix: 'WO', separator: '-', countPerBranch: true, datePartFormat: 'YYMM',
  resetPeriod: 'MONTHLY', numberLength: 5, startNumber: 1,
};

describe('exampleNumber (mirrors NumberSeriesEndpoints.Example)', () => {
  it('prints the default series like the API', () => {
    expect(exampleNumber(wo, 'SCT1', NOV_2026)).toBe('WO-SCT1-2611-00001');
  });

  it('uses BR01 for a tenant-wide series by default', () => {
    expect(exampleNumber(wo, undefined, NOV_2026)).toBe('WO-BR01-2611-00001');
  });

  it('leaves out the branch code when not counting per branch', () => {
    expect(exampleNumber({ ...wo, countPerBranch: false }, 'SCT1', NOV_2026)).toBe('WO-2611-00001');
  });

  it('leaves out an empty prefix and a NONE date part', () => {
    expect(exampleNumber({ ...wo, prefix: '', datePartFormat: 'NONE', countPerBranch: false }, 'X', NOV_2026)).toBe('00001');
  });

  it('joins with an empty separator', () => {
    expect(exampleNumber({ ...wo, separator: '' }, 'SCT1', NOV_2026)).toBe('WOSCT1261100001');
  });

  it('upper-cases the prefix and pads the start number', () => {
    expect(exampleNumber({ ...wo, prefix: 'po', separator: '/', datePartFormat: 'YYYY', numberLength: 7, startNumber: 42 }, 'LCB', NOV_2026))
      .toBe('PO/LCB/2026/0000042');
  });

  it('keeps a start number longer than the length (the API pads, never cuts)', () => {
    expect(exampleNumber({ ...wo, numberLength: 3, startNumber: 12345, countPerBranch: false }, 'X', NOV_2026)).toBe('WO-2611-12345');
  });
});

describe('datePart', () => {
  it('prints the Gregorian year in every format', () => {
    expect(datePart('YYYY', NOV_2026)).toBe('2026');
    expect(datePart('YY', NOV_2026)).toBe('26');
    expect(datePart('YYYYMM', NOV_2026)).toBe('202611');
    expect(datePart('YYMM', NOV_2026)).toBe('2611');
    expect(datePart('NONE', NOV_2026)).toBeNull();
  });

  it('uses UTC like the API clock', () => {
    // 2027-01-01 04:30 UTC is still 31 December west of UTC-5: the UTC month wins.
    expect(datePart('YYMM', new Date(Date.UTC(2027, 0, 1, 4, 30)))).toBe('2701');
  });
});

describe('validateSeries (mirrors NumberSeriesEndpoints.Check)', () => {
  it('accepts the default series', () => {
    expect(validateSeries(wo)).toEqual({});
  });

  it('allows letters and digits only in the prefix', () => {
    expect(validateSeries({ ...wo, prefix: 'W-O' }).prefix).toBe('fleetSetup.rule.prefix');
    expect(validateSeries({ ...wo, prefix: 'wo2' }).prefix).toBeUndefined();
    expect(validateSeries({ ...wo, prefix: '' }).prefix).toBeUndefined();
  });

  it('allows only the known separators', () => {
    expect(validateSeries({ ...wo, separator: '#' }).separator).toBe('fleetSetup.rule.separator');
    for (const sep of ['-', '/', '.', '_', '']) expect(validateSeries({ ...wo, separator: sep }).separator).toBeUndefined();
  });

  it('needs the month in a monthly reset', () => {
    expect(validateSeries({ ...wo, datePartFormat: 'YYYY' }).datePartFormat).toBe('fleetSetup.rule.monthly');
    expect(validateSeries({ ...wo, datePartFormat: 'YYYYMM' }).datePartFormat).toBeUndefined();
  });

  it('needs a date part in a yearly reset', () => {
    expect(validateSeries({ ...wo, resetPeriod: 'YEARLY', datePartFormat: 'NONE' }).datePartFormat).toBe('fleetSetup.rule.yearly');
    expect(validateSeries({ ...wo, resetPeriod: 'YEARLY', datePartFormat: 'YY' }).datePartFormat).toBeUndefined();
  });

  it('allows NONE when the series never resets', () => {
    expect(validateSeries({ ...wo, resetPeriod: 'NEVER', datePartFormat: 'NONE' })).toEqual({});
  });

  it('keeps the length between 3 and 15', () => {
    expect(validateSeries({ ...wo, numberLength: 2 }).numberLength).toBe('fleetSetup.rule.numberLength');
    expect(validateSeries({ ...wo, numberLength: 16 }).numberLength).toBe('fleetSetup.rule.numberLength');
    expect(validateSeries({ ...wo, numberLength: 15 }).numberLength).toBeUndefined();
  });

  it('needs the start number to fit in the length', () => {
    expect(validateSeries({ ...wo, numberLength: 3, startNumber: 1000 }).startNumber).toBe('fleetSetup.rule.startFits');
    expect(validateSeries({ ...wo, numberLength: 3, startNumber: 999 }).startNumber).toBeUndefined();
    expect(validateSeries({ ...wo, startNumber: -1 }).startNumber).toBe('fleetSetup.rule.startNumber');
    expect(validateSeries({ ...wo, startNumber: 0 }).startNumber).toBeUndefined();
  });

  it('locks reset period and branch counting once numbers were issued', () => {
    const locked = { issued: true, original: { resetPeriod: 'MONTHLY', countPerBranch: true } };
    const changed = validateSeries({ ...wo, resetPeriod: 'YEARLY', countPerBranch: false }, locked);
    expect(changed.resetPeriod).toBe('fleetSetup.rule.locked');
    expect(changed.countPerBranch).toBe('fleetSetup.rule.locked');
    expect(validateSeries({ ...wo, resetPeriod: 'YEARLY' }, { ...locked, issued: false }).resetPeriod).toBeUndefined();
  });
});

describe('datePartsFor', () => {
  it('offers only valid date parts per reset period', () => {
    expect(datePartsFor('MONTHLY')).toEqual(['YYYYMM', 'YYMM']);
    expect(datePartsFor('YEARLY')).not.toContain('NONE');
    expect(datePartsFor('NEVER')).toContain('NONE');
  });
});
