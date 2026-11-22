/**
 * Number-series rules, mirrored from Gecko.Fleet NumberSeriesEndpoints (Check + Example) so the
 * form rarely gets a 400 and the live example matches the API's `example` field.
 * Pure functions: no React, no i18n (errors are i18n KEYS under `fleetSetup.rule.*`).
 */

export const DATE_PART_FORMATS = ['NONE', 'YYYY', 'YY', 'YYYYMM', 'YYMM'] as const;
export const RESET_PERIODS = ['NEVER', 'YEARLY', 'MONTHLY'] as const;
/** '' = no separator. */
export const SEPARATORS = ['-', '/', '.', '_', ''] as const;
export const NUMBER_LENGTH_MIN = 3;
export const NUMBER_LENGTH_MAX = 15;
/** The branch code the API prints for a tenant-wide series. */
export const EXAMPLE_BRANCH_CODE = 'BR01';

export type DatePartFormat = (typeof DATE_PART_FORMATS)[number];
export type ResetPeriod = (typeof RESET_PERIODS)[number];

export interface SeriesFields {
  prefix: string;
  separator: string;
  /** true = each branch counts on its own AND its code is printed (one switch). */
  countPerBranch: boolean;
  datePartFormat: string;
  resetPeriod: string;
  numberLength: number;
  startNumber: number;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** The date part as the database prints it: Gregorian year (never Buddhist), UTC like the API's clock. */
export function datePart(format: string, at: Date): string | null {
  const yyyy = String(at.getUTCFullYear());
  const mm = pad2(at.getUTCMonth() + 1);
  switch (format) {
    case 'YYYY': return yyyy;
    case 'YY': return yyyy.slice(-2);
    case 'YYYYMM': return yyyy + mm;
    case 'YYMM': return yyyy.slice(-2) + mm;
    default: return null;
  }
}

/** The first number the series would issue at `at` (same CONCAT_WS rule as usp_next_number). */
export function exampleNumber(s: SeriesFields, branchCode: string = EXAMPLE_BRANCH_CODE, at: Date = new Date()): string {
  const prefix = s.prefix.trim().toUpperCase();
  const digits = String(Math.max(0, Math.trunc(s.startNumber || 0))).padStart(s.numberLength || 0, '0');
  const parts = [prefix || null, s.countPerBranch ? branchCode : null, datePart(s.datePartFormat, at), digits];
  return parts.filter((p): p is string => p !== null).join(s.separator ?? '');
}

export type SeriesErrors = Partial<Record<keyof SeriesFields, string>>;

/** The API's rules; values are i18n keys. `issued` + `original` add the locked-field rules of an update. */
export function validateSeries(
  s: SeriesFields,
  locked?: { issued: boolean; original: Pick<SeriesFields, 'resetPeriod' | 'countPerBranch'> },
): SeriesErrors {
  const errors: SeriesErrors = {};
  const prefix = s.prefix.trim().toUpperCase();
  if (prefix && !/^[A-Z0-9]+$/.test(prefix)) errors.prefix = 'fleetSetup.rule.prefix';
  else if (prefix.length > 20) errors.prefix = 'fleetSetup.rule.prefixLength';
  if (!(SEPARATORS as readonly string[]).includes(s.separator ?? '')) errors.separator = 'fleetSetup.rule.separator';
  if (s.resetPeriod === 'YEARLY' && s.datePartFormat === 'NONE') errors.datePartFormat = 'fleetSetup.rule.yearly';
  if (s.resetPeriod === 'MONTHLY' && s.datePartFormat !== 'YYYYMM' && s.datePartFormat !== 'YYMM')
    errors.datePartFormat = 'fleetSetup.rule.monthly';
  if (!Number.isInteger(s.numberLength) || s.numberLength < NUMBER_LENGTH_MIN || s.numberLength > NUMBER_LENGTH_MAX)
    errors.numberLength = 'fleetSetup.rule.numberLength';
  if (!Number.isInteger(s.startNumber) || s.startNumber < 0) errors.startNumber = 'fleetSetup.rule.startNumber';
  else if (!errors.numberLength && String(s.startNumber).length > s.numberLength) errors.startNumber = 'fleetSetup.rule.startFits';
  if (locked?.issued) {
    if (s.resetPeriod !== locked.original.resetPeriod) errors.resetPeriod = 'fleetSetup.rule.locked';
    if (s.countPerBranch !== locked.original.countPerBranch) errors.countPerBranch = 'fleetSetup.rule.locked';
  }
  return errors;
}

/** Date parts a reset period allows (the select only offers these). */
export function datePartsFor(resetPeriod: string): readonly string[] {
  if (resetPeriod === 'MONTHLY') return ['YYYYMM', 'YYMM'];
  if (resetPeriod === 'YEARLY') return ['YYYY', 'YY', 'YYYYMM', 'YYMM'];
  return DATE_PART_FORMATS;
}
