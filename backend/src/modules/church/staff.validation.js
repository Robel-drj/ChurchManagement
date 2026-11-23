import { z } from "zod";

export const assignStaffRoleSchema = z.object({
  role_name: z.enum([
    "secretary",
    "money_collector",
    "content_creator",
  ]),
}).strict();

export const removeStaffRoleSchema = z.object({
  role_name: z.enum([
    "secretary",
    "money_collector",
    "content_creator",
  ]),
}).strict();

export const staffMembershipIdSchema = z.string().uuid();