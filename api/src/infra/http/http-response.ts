/**
 * Standard success response envelope: `{ data, message?, meta? }`.
 */
export interface HttpSuccessResponse<TData> {
  data: TData;
  message?: string;
  meta?: Record<string, unknown>;
}

/**
 * Standard error response envelope: `{ message, errors? }`.
 */
export interface HttpErrorResponse {
  message: string;
  errors?: Record<string, string[]>;
}

export function ok<TData>(
  data: TData,
  extra?: { message?: string; meta?: Record<string, unknown> },
): HttpSuccessResponse<TData> {
  return {
    data,
    ...(extra?.message !== undefined ? { message: extra.message } : {}),
    ...(extra?.meta !== undefined ? { meta: extra.meta } : {}),
  };
}
