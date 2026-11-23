import { z } from "zod";

const optionalNullableText = (max) =>
  z.string().trim().max(max).nullable().optional();

export const createContributionCategorySchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: optionalNullableText(1000),
}).strict();

export const updateContributionCategorySchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: optionalNullableText(1000),
  is_active: z.boolean().optional(),
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  { message: "Provide at least one field to update." }
);

export const createPaymentMethodSchema = z.object({
  method_name: z.string().trim().min(2).max(100),
  provider: optionalNullableText(150),
  account_name: optionalNullableText(150),
  account_number: optionalNullableText(100),
  instructions: optionalNullableText(2000),
}).strict();

export const updatePaymentMethodSchema = z.object({
  method_name: z.string().trim().min(2).max(100).optional(),
  provider: optionalNullableText(150),
  account_name: optionalNullableText(150),
  account_number: optionalNullableText(100),
  instructions: optionalNullableText(2000),
  is_active: z.boolean().optional(),
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  { message: "Provide at least one field to update." }
);
export const createContributionSchema = z.object({
  membership_id: z.string().uuid(),
  category_id: z.string().uuid(),
  payment_method_id: z.string().uuid(),
  amount: z.number().finite().positive(),
  payment_status: z.enum(["pending", "confirmed"]).optional(),
  transaction_reference: optionalNullableText(150),
  contribution_date: z.string().datetime({ offset: true }).optional(),
  notes: optionalNullableText(2000),
}).strict();

export const updateContributionSchema = z.object({
  payment_status: z.enum(["confirmed", "rejected"]).optional(),
  transaction_reference: optionalNullableText(150),
  notes: optionalNullableText(2000),
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  { message: "Provide at least one field to update." }
);

export const listContributionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
  category_id: z.string().uuid().optional(),
  payment_method_id: z.string().uuid().optional(),
  payment_status: z.enum([
    "pending",
    "confirmed",
    "rejected",
    "reversed",
  ]).optional(),
  date_from: z.string().date().optional(),
  date_to: z.string().date().optional(),
}).strict().refine(
  (data) =>
    !data.date_from ||
    !data.date_to ||
    data.date_from <= data.date_to,
  {
    message: "date_from must be earlier than or equal to date_to.",
    path: ["date_to"],
  }
);
export const financeReportQuerySchema = z.object({
  date_from: z.string().date().optional(),
  date_to: z.string().date().optional(),
}).strict().refine(
  (data) =>
    !data.date_from ||
    !data.date_to ||
    data.date_from <= data.date_to,
  {
    message: "date_from must be earlier than or equal to date_to.",
    path: ["date_to"],
  }
);
export const createContributionAdjustmentSchema = z.object({
  contribution_id: z.string().uuid(),
  adjustment_type: z.enum(["refund", "reversal", "correction"]),
  amount: z.number().finite().positive(),
  reason: z.string().trim().min(5).max(2000),
}).strict();

export const listContributionAdjustmentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["pending", "approved", "rejected"]).optional(),
  adjustment_type: z.enum(["refund", "reversal", "correction"]).optional(),
}).strict();

export const decideContributionAdjustmentSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
}).strict();
export const financeIdSchema = z.string().uuid();