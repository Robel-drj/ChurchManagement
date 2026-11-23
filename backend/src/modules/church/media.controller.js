
import { z } from "zod";
import { listChurchMedia } from "./media.service.js";

const mediaQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  source: z.enum(["all", "post", "event"]).default("all"),
  media_type: z.enum(["image", "video"]).optional(),
  search: z.string().trim().max(150).optional(),
});

export async function getChurchMediaLibrary(req, res, next) {
  try {
    const filters = mediaQuerySchema.parse(req.query);

    const result = await listChurchMedia(
      req.church.id,
      filters
    );

    return res.status(200).json({
      success: true,
      message: "Media library retrieved successfully.",
      data: result.media,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}
