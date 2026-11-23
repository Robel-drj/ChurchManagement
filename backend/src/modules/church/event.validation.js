import { z } from "zod";

export const createEventSchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(10000).nullable().optional(),
  location: z.string().trim().max(500).nullable().optional(),
  start_date: z.string().datetime({ offset: true }),
  end_date: z.string().datetime({ offset: true }).nullable().optional(),
}).refine(
  (data) =>
    !data.end_date ||
    new Date(data.end_date) >= new Date(data.start_date),
  {
    message: "End date cannot be earlier than start date.",
    path: ["end_date"],
  }
);

export const updateEventSchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  description: z.string().trim().max(10000).nullable().optional(),
  location: z.string().trim().max(500).nullable().optional(),
  start_date: z.string().datetime({ offset: true }).optional(),
  end_date: z.string().datetime({ offset: true }).nullable().optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided." }
);

export const eventIdSchema = z.string().uuid();

export const listEventsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).optional(),
  status: z.enum(["draft", "published", "cancelled", "completed"]).optional(),
});

export const eventActionSchema = z.object({
  action: z.enum(["publish", "unpublish", "cancel", "complete"]),
});