/**
 * API failures, parsed in one place.
 *
 * The APIs answer with RFC 7807 ProblemDetails; a 400 adds an `errors` map keyed by
 * field (`{ errors: { vehicleCode: ["..."] } }`). Screens read `forField()` to show
 * a message next to its input and `message` for everything else.
 */

export type FieldErrors = Record<string, string[]>;

export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: FieldErrors;
  /** Application code when the API sends one, e.g. "password_change_required". */
  readonly code?: string;

  constructor(status: number, message: string, fieldErrors: FieldErrors = {}, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.code = code;
  }

  /** The first message for a field, matched case-insensitively (exact match first). */
  forField(name: string): string | undefined {
    const keys = Object.keys(this.fieldErrors);
    const key = keys.find((k) => k === name) ?? keys.find((k) => k.toLowerCase() === name.toLowerCase());
    return key ? this.fieldErrors[key][0] : undefined;
  }

  /** Field errors keyed by lower-case field name, for a form to look up. */
  get fieldMap(): Record<string, string> {
    const map: Record<string, string> = {};
    for (const [key, messages] of Object.entries(this.fieldErrors))
      if (messages?.[0]) map[key.toLowerCase()] = messages[0];
    return map;
  }
}

/** What to say when the server said nothing useful. */
const FALLBACK: Record<number, string> = {
  0: 'No connection to the server. Check the network, then try again.',
  401: 'Your session has ended. Sign in again.',
  403: 'You are not allowed to do this at this branch.',
  404: 'Not found. It may have been removed, or you cannot see it.',
  409: 'Someone else changed this first. Reload and try again.',
  429: 'Too many attempts. Wait a moment and try again.',
  500: 'The server could not finish this request. Try again in a moment.',
  502: 'The server is not answering. It may be restarting; try again in a minute.',
};

export function fallbackFor(status: number): string {
  if (FALLBACK[status]) return FALLBACK[status];
  if (status >= 502) return FALLBACK[502];
  if (status >= 500) return FALLBACK[500];
  return `Request failed (${status}).`;
}

/** A request that never reached the server (API stopped, network down). */
export function offlineError(): ApiError {
  return new ApiError(0, process.env.NODE_ENV === 'development'
    ? 'The API is not reachable. Start the Platform API (5100) and the Fleet API (5300).'
    : fallbackFor(0));
}

export async function toApiError(response: Response): Promise<ApiError> {
  let message = fallbackFor(response.status);
  let fieldErrors: FieldErrors = {};
  let code: string | undefined;

  try {
    const body = await response.json();
    if (body && typeof body === 'object') {
      const problem = body as Record<string, unknown>;
      // 403 keeps our own wording unless the API wrote a specific one.
      if (typeof problem.detail === 'string' && problem.detail) message = `${typeof problem.title === 'string' ? problem.title + ' ' : ''}${problem.detail}`;
      else if (typeof problem.title === 'string' && problem.title && !/^(Forbidden|Not Found|One or more validation errors occurred\.?)$/i.test(problem.title)) message = problem.title;
      // A stale rowVersion: the screens reload the latest version, so say that instead of the API's wording.
      if (response.status === 409 && typeof problem.detail === 'string' && /rowVersion/i.test(problem.detail)) {
        message = 'Someone else saved this record after you opened it. Their version is now shown — make your change again.';
      }
      if (typeof problem.code === 'string') code = problem.code;
      if (problem.errors && typeof problem.errors === 'object') {
        fieldErrors = problem.errors as FieldErrors;
        const first = Object.values(fieldErrors)[0];
        if (response.status === 400 && Array.isArray(first) && typeof first[0] === 'string') message = first[0];
      }
    }
  } catch {
    // A non-JSON body (a proxy error page) keeps the fallback message.
  }
  return new ApiError(response.status, message, fieldErrors, code);
}

/** An ApiError from whatever a catch block was handed. */
export function problemOf(err: unknown, fallback = 'Something went wrong.'): ApiError {
  return err instanceof ApiError ? err : new ApiError(0, err instanceof Error ? err.message : fallback);
}
