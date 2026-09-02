import { z } from 'zod';

export const listTracesQuerySchema = z
  .object({
    projectId: z.string().uuid(),
    from: z.string().datetime({ offset: true }).optional(),
    to: z.string().datetime({ offset: true }).optional(),
    status: z.enum(['SUCCESS', 'ERROR', 'TIMEOUT']).optional(),
    model: z.string().min(1).max(120).optional(),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(20),
  })
  .superRefine((query, ctx) => {
    if (query.from && query.to && new Date(query.from) > new Date(query.to)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '`from` must be before or equal to `to`',
        path: ['from'],
      });
    }
  });

export type ListTracesQuery = z.infer<typeof listTracesQuerySchema>;
