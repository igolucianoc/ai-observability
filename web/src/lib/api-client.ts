import { z } from 'zod';

const successEnvelopeSchema = <TSchema extends z.ZodTypeAny>(dataSchema: TSchema) =>
  z.object({
    data: dataSchema,
    message: z.string().optional(),
    meta: z.record(z.unknown()).optional(),
  });

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';

/// Thrown when the API responds with a non-2xx status.
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ApiResult<TData> {
  data: TData;
  meta?: Record<string, unknown>;
}

/**
 * Calls an API endpoint and validates the `{ data, meta? }` envelope against the
 * provided schema. Cookies are always included so the httpOnly session travels
 * with the request. Boundary data is never trusted without validation.
 */
export async function apiRequest<TSchema extends z.ZodTypeAny>(
  path: string,
  dataSchema: TSchema,
  init?: RequestInit,
): Promise<ApiResult<z.infer<TSchema>>> {
  const response = await fetch(`${API_BASE_URL}/api${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const body: unknown = await response.json();
      if (body && typeof body === 'object' && 'message' in body) {
        message = String((body as { message: unknown }).message);
      }
    } catch {
      // keep the default message
    }
    throw new ApiError(response.status, message);
  }

  const json: unknown = await response.json();
  const parsed = successEnvelopeSchema(dataSchema).parse(json);
  return { data: parsed.data, meta: parsed.meta };
}

/// Convenience wrapper that returns only the `data` payload.
export async function apiGet<TSchema extends z.ZodTypeAny>(
  path: string,
  dataSchema: TSchema,
): Promise<z.infer<TSchema>> {
  const { data } = await apiRequest(path, dataSchema);
  return data;
}

/// Builds a query string from a record, skipping undefined/empty values.
export function toQueryString(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}
