import { z } from "zod";

export const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(150),
  phone: z.string().trim().min(7).max(20),
  email: z.string().trim().email().max(150).optional().or(z.literal("")),
  password: z.string().min(8).max(72),
});

export const loginSchema = z.object({
  identifier: z.string().trim().min(3),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(20),
});
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(1024),
  newPassword: z.string().min(8).refine(
    (password) => Buffer.byteLength(password, "utf8") <= 72,
    { message: "The new password must be at most 72 bytes." }
  ),
}).strict();