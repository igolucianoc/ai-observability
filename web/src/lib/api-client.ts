import { z } from 'zod';

const successEnvelopeSchema = <TSchema extends z.ZodTypeAny>(dataSchema: TSchema) =>
  z.object({
    data: dataSchema,
    message: z.string().optional(),
    meta: z.record(z.unknown()).optional(),
  });

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';

/**
 * Fetches an API resource and validates the `{ data }` envelope against the
 * provided schema. Boundary data is never trusted without validation.
 */
export async function fetchFromApi<TSchema extends z.ZodTypeAny>(
  path: string,
  dataSchema: TSchema,
  init?: RequestInit,
): Promise<z.infer<TSchema>> {
  const response = await fetch(`${API_BASE_URL}/api${path}`, init);

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  const json: unknown = await response.json();
  const parsed = successEnvelopeSchema(dataSchema).parse(json);
  return parsed.data;
}
