import { z } from 'zod';

export const streamQuerySchema = z.object({
  projectId: z.string().uuid(),
});

export type StreamQuery = z.infer<typeof streamQuerySchema>;
