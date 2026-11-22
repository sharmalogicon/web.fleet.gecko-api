import { ApiError, fallbackFor } from './problem';

/**
 * The text to show for a failed call, in the user's language.
 * The API's own ProblemDetails wording is kept when it sent one (it names the field or rule);
 * otherwise the generic message for the status comes from i18n (`errors.<status>`).
 */
export function errorText(err: unknown, t: (key: string) => string): string {
  if (!(err instanceof ApiError)) return t('errors.generic');
  if (err.message && err.message !== fallbackFor(err.status) && err.status !== 0) return err.message;
  const bucket = err.status >= 502 ? 502 : err.status >= 500 ? 500 : err.status;
  const key = `errors.${bucket}`;
  const text = t(key);
  return text === key ? t('errors.generic') : text;
}
