import { z } from 'zod'

/** An optional number input: empty stays empty (z.coerce would turn '' into 0 and save it). */
export const optNum = z.preprocess(
  (v) => (v === '' || v === null || v === undefined || (typeof v === 'number' && Number.isNaN(v)) ? undefined : Number(v)),
  z.number().optional(),
)

/** An optional text input: '' and whitespace become undefined. */
export const optText = z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().optional())
