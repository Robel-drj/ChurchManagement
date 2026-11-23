import { z } from "zod";

const optionalText = (max) =>
  z.string().trim().max(max).nullable().optional();

export const registerMemberSchema = z.object({
  full_name: z.string().trim().min(2).max(150),

  phone: z.string().trim().min(7).max(20),

  email: z.union([
    z.string().trim().email().max(150),
    z.literal(""),
    z.null(),
  ]).optional(),

  // The member must enter their own password.
  password: z.string().min(8).max(72),

  gender: optionalText(20),

  date_of_birth: z.union([
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format."),
    z.null(),
  ]).optional(),

  address: optionalText(1000),
  emergency_contact: optionalText(20),
  profile_image: optionalText(2048),
}).strict();
export const listMembersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
});

export const memberIdSchema = z.string().uuid();

export const updateMemberProfileSchema = z.object({
  gender: z.string().trim().max(20).nullable().optional(),

  date_of_birth: z.union([
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    z.null(),
  ]).optional(),

  address: z.string().trim().max(1000).nullable().optional(),

  emergency_contact: z.string().trim().max(20).nullable().optional(),

  profile_image: z.string().trim().max(2048).nullable().optional(),
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  { message: "Provide at least one profile field to update." }
);

export const updateMembershipStatusSchema = z.object({
  membership_status: z.enum(["active", "suspended"]),
}).strict();
