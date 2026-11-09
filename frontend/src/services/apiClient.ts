/**
 * Minimal typed HTTP client for the KyneticForge backend.
 * In development, `/api` is proxied by Vite to FastAPI (see vite.config.ts).
 */

export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api/v1';

export interface ApiErrorDetail {
  loc?: string[];
  message: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: ApiErrorDetail[];

  constructor(status: number, code: string, message: string, details: ApiErrorDetail[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** Message plus the first few validation details, for display in the event log. */
  describe(maxDetails = 4): string {
    if (!this.details.length) return this.message;
    const shown = this.details
      .slice(0, maxDetails)
      .map((d) => (d.loc?.length ? `${d.loc.join('.')}: ${d.message}` : d.message));
    const more =
      this.details.length > maxDetails ? ` (+${this.details.length - maxDetails} more)` : '';
    return `${this.message} — ${shown.join('; ')}${more}`;
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const init: RequestInit = { method: options.method ?? 'GET', headers: {} };
  if (options.signal) init.signal = options.signal;
  if (options.body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, init);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiError(0, 'network_error', 'backend is unreachable — is the API server running?');
  }

  if (response.status === 204) return undefined as T;

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = (
      payload as { error?: { code?: string; message?: string; details?: ApiErrorDetail[] } }
    )?.error;
    throw new ApiError(
      response.status,
      error?.code ?? 'http_error',
      error?.message ?? `request failed with status ${response.status}`,
      error?.details ?? [],
    );
  }
  return payload as T;
}
