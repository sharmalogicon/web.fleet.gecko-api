import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { ApiError } from './problem'
import { errorText } from './errorText'

/**
 * API field names (lower-cased, as ApiError.fieldMap gives them) → form field names, and the rest.
 * `apiToForm` keys are lower-case; a key like `lines[2].qty` is matched on its root (`lines`) too.
 */
export function mapApiFields<F extends string>(fieldMap: Record<string, string>, apiToForm: Record<string, F>) {
  const fields: Partial<Record<F, string>> = {}
  const other: string[] = []
  for (const [key, message] of Object.entries(fieldMap)) {
    const lower = key.toLowerCase()
    const target = apiToForm[lower] ?? apiToForm[lower.split(/[.[]/)[0]]
    if (target) fields[target] ??= message
    else other.push(message)
  }
  return { fields, other }
}

interface Toasts {
  error: (title: string, message?: string) => void
  warning: (title: string, message?: string) => void
}

/**
 * The house handling of a failed save (prompts 03–07):
 * 409 → warning toast (the caller's mutation refetches, the form remounts on the new rowVersion);
 * 400 → messages under the inputs, the rest in the banner; anything else (403, 5xx, offline) → banner + toast.
 */
export function handleSaveError<T extends FieldValues>(
  err: unknown,
  opts: {
    setError: UseFormSetError<T>
    apiToForm: Record<string, Path<T>>
    setBanner: (text: string | null) => void
    t: (key: string) => string
    toast: Toasts
    title?: string
  },
) {
  const { setError, apiToForm, setBanner, t, toast } = opts
  const title = opts.title ?? t('common.saveFailed')
  if (err instanceof ApiError && err.status === 409) {
    toast.warning(t('equipment.conflict'), errorText(err, t))
    return
  }
  if (err instanceof ApiError && err.status === 400) {
    const { fields, other } = mapApiFields(err.fieldMap, apiToForm)
    for (const [name, message] of Object.entries(fields)) setError(name as Path<T>, { message: message as string })
    setBanner(other.length ? other.join(' ') : Object.keys(fields).length ? null : errorText(err, t))
    toast.error(title, t('equipment.checkFields'))
    return
  }
  setBanner(errorText(err, t))
  toast.error(title, errorText(err, t))
}
