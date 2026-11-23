
import { z } from "zod";

export const createNotificationSchema = z.object({
  title: z.string().trim().min(3).max(200),
  message: z.string().trim().min(3).max(5000),

  notification_type: z.enum([
    "general",
    "announcement",
    "event",
    "payment",
  ]).default("general"),

  target_type: z.enum(["all", "selected"]),

  membership_ids: z.array(z.string().uuid()).optional().default([]),
}).superRefine((data, ctx) => {
  if (data.target_type === "selected" && data.membership_ids.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Select at least one church member.",
      path: ["membership_ids"],
    });
  }

  if (data.target_type === "all" && data.membership_ids.length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Do not provide membership IDs when targeting all members.",
      path: ["membership_ids"],
    });
  }

  if (new Set(data.membership_ids).size !== data.membership_ids.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Duplicate membership IDs are not allowed.",
      path: ["membership_ids"],
    });
  }
});

export const notificationIdSchema = z.object({
  notificationId: z.string().uuid(),
});

export const notificationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["sent", "cancelled"]).optional(),
});

export const notificationInboxQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  unread_only: z.enum(["true", "false"]).optional(),
});
