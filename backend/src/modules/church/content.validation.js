
import { z } from "zod";

export const createPostSchema = z.object({
  title: z.string().trim().min(2).max(200),
  content: z.string().trim().min(1).max(20000),
  post_type: z.enum([
    "announcement",
    "news",
    "teaching",
    "notice",
    "other",
  ]).default("announcement"),
}).strict();

export const updatePostSchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  content: z.string().trim().min(1).max(20000).optional(),
  post_type: z.enum([
    "announcement",
    "news",
    "teaching",
    "notice",
    "other",
  ]).optional(),
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  { message: "Provide at least one field to update." }
);

export const postIdSchema = z.string().uuid();

export const listPostsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
  post_type: z.enum([
    "announcement",
    "news",
    "teaching",
    "notice",
    "other",
  ]).optional(),
  status: z.enum([
    "draft",
    "published",
    "archived",
  ]).optional(),
}).strict();

export const postActionSchema = z.object({
  action: z.enum(["publish", "unpublish", "archive"]),
}).strict();
