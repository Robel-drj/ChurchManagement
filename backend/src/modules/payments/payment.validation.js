
import { z } from "zod";

export const initializeOnlineContributionSchema = z.object({
  category_id: z.string().uuid(),
current_password: z.string().min(1).max(1024),
  amount: z.number()
    .finite()
    .min(1, "Minimum online contribution is 1 ETB.")
    .multipleOf(0.01),

  idempotency_key: z.string().uuid(),

  notes: z.string()
    .trim()
    .max(2000)
    .nullable()
    .optional(),
}).strict();
