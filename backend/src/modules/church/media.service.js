
import { pool } from "../../config/database.js";

export async function listChurchMedia(churchId, filters) {
  const {
    page = 1,
    limit = 20,
    source = "all",
    media_type,
    search,
  } = filters;

  const offset = (page - 1) * limit;

  const result = await pool.query(
    `
    WITH all_media AS (
      SELECT
        pm.id,
        pm.church_id,
        pm.media_type,
        pm.media_url,
        pm.file_name,
        pm.file_size,
        pm.mime_type,
        pm.cloudinary_public_id,
        pm.created_at,
        'post'::text AS source,
        p.id AS parent_id,
        p.title AS parent_title,
        p.status AS parent_status
      FROM post_media pm
      INNER JOIN posts p
        ON p.id = pm.post_id
       AND p.church_id = pm.church_id
      WHERE pm.church_id = $1

      UNION ALL

      SELECT
        em.id,
        em.church_id,
        em.media_type,
        em.media_url,
        em.file_name,
        em.file_size,
        em.mime_type,
        em.cloudinary_public_id,
        em.created_at,
        'event'::text AS source,
        e.id AS parent_id,
        e.title AS parent_title,
        e.status AS parent_status
      FROM event_media em
      INNER JOIN events e
        ON e.id = em.event_id
       AND e.church_id = em.church_id
      WHERE em.church_id = $1
    )
    SELECT *
    FROM all_media
    WHERE
      ($2::text = 'all' OR source = $2)
      AND ($3::text IS NULL OR media_type = $3)
      AND (
        $4::text IS NULL
        OR file_name ILIKE '%' || $4 || '%'
        OR parent_title ILIKE '%' || $4 || '%'
      )
    ORDER BY created_at DESC
    LIMIT $5 OFFSET $6
    `,
    [
      churchId,
      source,
      media_type || null,
      search || null,
      limit,
      offset,
    ]
  );

  const countResult = await pool.query(
    `
    WITH all_media AS (
      SELECT
        pm.media_type,
        pm.file_name,
        p.title AS parent_title,
        'post'::text AS source
      FROM post_media pm
      INNER JOIN posts p
        ON p.id = pm.post_id
       AND p.church_id = pm.church_id
      WHERE pm.church_id = $1

      UNION ALL

      SELECT
        em.media_type,
        em.file_name,
        e.title AS parent_title,
        'event'::text AS source
      FROM event_media em
      INNER JOIN events e
        ON e.id = em.event_id
       AND e.church_id = em.church_id
      WHERE em.church_id = $1
    )
    SELECT COUNT(*)::int AS total
    FROM all_media
    WHERE
      ($2::text = 'all' OR source = $2)
      AND ($3::text IS NULL OR media_type = $3)
      AND (
        $4::text IS NULL
        OR file_name ILIKE '%' || $4 || '%'
        OR parent_title ILIKE '%' || $4 || '%'
      )
    `,
    [churchId, source, media_type || null, search || null]
  );

  const total = countResult.rows[0].total;

  return {
    media: result.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
