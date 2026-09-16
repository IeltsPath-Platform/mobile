import { z } from 'zod';

export const learnerProfileSchema = z.object({
  id: z.string(),
  displayName: z.string().min(1),
  targetBand: z.number().min(4).max(9).optional(),
  examDate: z.string().optional(),
});

export type LearnerProfile = z.infer<typeof learnerProfileSchema>;

export const dailyPlanItemSchema = z.object({
  id: z.string(),
  skill: z.enum(['listening', 'reading', 'writing', 'speaking', 'vocab']),
  title: z.string(),
  minutes: z.number().positive(),
  done: z.boolean(),
});

export const dailyPlanSchema = z.object({
  date: z.string(),
  items: z.array(dailyPlanItemSchema),
});

export type DailyPlan = z.infer<typeof dailyPlanSchema>;
