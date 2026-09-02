import { z } from 'zod';

const rangeRefinement = (query: { from?: string; to?: string }, ctx: z.RefinementCtx): void => {
  if (query.from && query.to && new Date(query.from) > new Date(query.to)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '`from` must be before or equal to `to`',
      path: ['from'],
    });
  }
};

const analyticsQueryObject = z.object({
  projectId: z.string().uuid(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  model: z.string().min(1).max(120).optional(),
});

/**
 * Common analytics filters, parsed from the query string. `projectId` is
 * required so every aggregation is scoped to a single owned project.
 */
export const analyticsQuerySchema = analyticsQueryObject.superRefine(rangeRefinement);

export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;

/**
 * Timeseries filter adds an explicit bucket granularity.
 */
export const timeseriesQuerySchema = analyticsQueryObject
  .extend({ bucket: z.enum(['day', 'hour']).default('day') })
  .superRefine(rangeRefinement);

export type TimeseriesQuery = z.infer<typeof timeseriesQuerySchema>;
