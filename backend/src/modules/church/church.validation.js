import { z } from "zod";

export const updateChurchProfileSchema = z.object({
  church_name: z.string().trim().min(2).max(200).optional(),
  address: z.string().trim().max(1000).nullable().optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  email: z.string().trim().email().max(254).nullable().optional(),
  logo_url: z.string().trim().max(2048).nullable().optional(),
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  { message: "Provide at least one field to update." }
);