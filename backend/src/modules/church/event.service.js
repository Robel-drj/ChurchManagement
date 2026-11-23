import { pool } from "../../config/database.js";
import { cloudinary } from "../../config/cloudinary.js";

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function getMediaType(mimeType) {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  throw httpError(400, "Unsupported media type.");
}

function uploadBufferToCloudinary(file, churchId, eventId) {
  const mediaType = getMediaType(file.mimetype);

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `churches/${churchId}/events/${eventId}`,
        resource_type: mediaType,
        use_filename: true,
        unique_filename: true,
      },
      (error, result) => {
        if (error) {
          console.error("Cloudinary event upload error:", {
            message: error.message,
            http_code: error.http_code,
            name: error.name,
          });
          return reject(error);
        }

        resolve({
          media_url: result.secure_url,
          cloudinary_public_id: result.public_id,
          media_type: mediaType,
        });
      }
    );

    stream.end(file.buffer);
  });
}

async function deleteCloudinaryMedia(publicId, mediaType) {
  if (!publicId) return;

  const result = await cloudinary.uploader.destroy(publicId, {
    resource_type: mediaType,
    invalidate: true,
  });

  if (result.result !== "ok" && result.result !== "not found") {
    throw httpError(502, "Could not delete media from Cloudinary.");
  }
}

export async function createEvent(churchId, membershipId, data) {
  const result = await pool.query(
    `INSERT INTO events (
       church_id, title, description, location,
       start_date, end_date, created_by_membership_id
     )
     SELECT $1, $3, $4, $5, $6, $7, $2
     FROM churches
     WHERE id = $1 AND status = 'active'
     RETURNING *`,
    [
      churchId,
      membershipId,
      data.title,
      data.description ?? null,
      data.location ?? null,
      data.start_date,
      data.end_date ?? null,
    ]
  );

  if (!result.rowCount) {
    throw httpError(404, "Active church not found.");
  }

  return result.rows[0];
}

export async function listManageEvents(churchId, query) {
  const { page, limit, search, status } = query;
  const offset = (page - 1) * limit;
  const values = [churchId];
  const conditions = ["e.church_id = $1"];

  if (search) {
    values.push(`%${search}%`);
    conditions.push(
      `(e.title ILIKE $${values.length} OR e.description ILIKE $${values.length} OR e.location ILIKE $${values.length})`
    );
  }

  if (status) {
    values.push(status);
    conditions.push(`e.status = $${values.length}`);
  }

  const where = conditions.join(" AND ");

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM events e
     WHERE ${where}`,
    values
  );

  values.push(limit, offset);

  const result = await pool.query(
    `SELECT
       e.*,
       u.full_name AS created_by_name,
       COALESCE(
         (
           SELECT json_agg(
             json_build_object(
               'id', em.id,
               'media_type', em.media_type,
               'media_url', em.media_url,
               'file_name', em.file_name,
               'file_size', em.file_size,
               'mime_type', em.mime_type
             )
             ORDER BY em.created_at
           )
           FROM event_media em
           WHERE em.event_id = e.id
             AND em.church_id = e.church_id
         ),
         '[]'::json
       ) AS media
     FROM events e
     JOIN church_memberships cm
       ON cm.id = e.created_by_membership_id
      AND cm.church_id = e.church_id
     JOIN users u ON u.id = cm.user_id
     WHERE ${where}
     ORDER BY e.start_date DESC
     LIMIT $${values.length - 1}
     OFFSET $${values.length}`,
    values
  );

  return {
    events: result.rows,
    pagination: {
      page,
      limit,
      total: countResult.rows[0].total,
      totalPages: Math.ceil(countResult.rows[0].total / limit),
    },
  };
}

export async function getManageEvent(churchId, eventId) {
  const result = await pool.query(
    `SELECT
       e.*,
       COALESCE(
         (
           SELECT json_agg(
             json_build_object(
               'id', em.id,
               'media_type', em.media_type,
               'media_url', em.media_url,
               'file_name', em.file_name,
               'file_size', em.file_size,
               'mime_type', em.mime_type
             )
             ORDER BY em.created_at
           )
           FROM event_media em
           WHERE em.event_id = e.id
             AND em.church_id = e.church_id
         ),
         '[]'::json
       ) AS media
     FROM events e
     WHERE e.id = $1 AND e.church_id = $2`,
    [eventId, churchId]
  );

  if (!result.rowCount) {
    throw httpError(404, "Event not found.");
  }

  return result.rows[0];
}

export async function updateEvent(churchId, eventId, data) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existing = await client.query(
      `SELECT * FROM events
       WHERE id = $1 AND church_id = $2
       FOR UPDATE`,
      [eventId, churchId]
    );

    if (!existing.rowCount) {
      throw httpError(404, "Event not found.");
    }

    if (["cancelled", "completed"].includes(existing.rows[0].status)) {
      throw httpError(409, "Cancelled or completed events cannot be edited.");
    }

    const current = existing.rows[0];
    const startDate = data.start_date ?? current.start_date;
    const endDate =
      data.end_date !== undefined ? data.end_date : current.end_date;

    if (endDate && new Date(endDate) < new Date(startDate)) {
      throw httpError(400, "End date cannot be earlier than start date.");
    }

    const result = await client.query(
      `UPDATE events
       SET title = $3,
           description = $4,
           location = $5,
           start_date = $6,
           end_date = $7,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND church_id = $2
       RETURNING *`,
      [
        eventId,
        churchId,
        data.title ?? current.title,
        data.description !== undefined ? data.description : current.description,
        data.location !== undefined ? data.location : current.location,
        startDate,
        endDate,
      ]
    );

    await client.query("COMMIT");
    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function changeEventStatus(churchId, eventId, action) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existing = await client.query(
      `SELECT * FROM events
       WHERE id = $1 AND church_id = $2
       FOR UPDATE`,
      [eventId, churchId]
    );

    if (!existing.rowCount) {
      throw httpError(404, "Event not found.");
    }

    const current = existing.rows[0];
    let newStatus;

    switch (action) {
      case "publish":
        if (current.status !== "draft") {
          throw httpError(409, "Only draft events can be published.");
        }
        newStatus = "published";
        break;

      case "unpublish":
        if (current.status !== "published") {
          throw httpError(409, "Only published events can be unpublished.");
        }
        newStatus = "draft";
        break;

      case "cancel":
        if (["cancelled", "completed"].includes(current.status)) {
          throw httpError(409, "This event can no longer be cancelled.");
        }
        newStatus = "cancelled";
        break;

      case "complete":
        if (current.status !== "published") {
          throw httpError(409, "Only published events can be completed.");
        }
        newStatus = "completed";
        break;

      default:
        throw httpError(400, "Invalid event action.");
    }

    const result = await client.query(
      `UPDATE events
       SET status = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND church_id = $2
       RETURNING *`,
      [eventId, churchId, newStatus]
    );

    await client.query("COMMIT");
    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function addEventMedia(churchId, eventId, files) {
  if (!files?.length) {
    throw httpError(400, "Select at least one media file.");
  }

  const eventResult = await pool.query(
    `SELECT id, status FROM events
     WHERE id = $1 AND church_id = $2`,
    [eventId, churchId]
  );

  if (!eventResult.rowCount) {
    throw httpError(404, "Event not found.");
  }

  if (["cancelled", "completed"].includes(eventResult.rows[0].status)) {
    throw httpError(409, "Media cannot be added to cancelled or completed events.");
  }

  const uploaded = [];

  try {
    for (const file of files) {
      const cloudResult = await uploadBufferToCloudinary(
        file,
        churchId,
        eventId
      );

      uploaded.push({
        ...cloudResult,
        file_name: file.originalname,
        file_size: file.size,
        mime_type: file.mimetype,
      });
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const inserted = [];

      for (const media of uploaded) {
        const result = await client.query(
          `INSERT INTO event_media (
             church_id, event_id, media_type, media_url,
             file_name, file_size, mime_type, cloudinary_public_id
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING *`,
          [
            churchId,
            eventId,
            media.media_type,
            media.media_url,
            media.file_name,
            media.file_size,
            media.mime_type,
            media.cloudinary_public_id,
          ]
        );

        inserted.push(result.rows[0]);
      }

      await client.query("COMMIT");
      return inserted;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    for (const media of uploaded) {
      try {
        await deleteCloudinaryMedia(
          media.cloudinary_public_id,
          media.media_type
        );
      } catch (cleanupError) {
        console.error("Cloudinary cleanup failed:", cleanupError.message);
      }
    }

    throw error;
  }
}

export async function removeEventMedia(churchId, eventId, mediaId) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `SELECT * FROM event_media
       WHERE id = $1 AND event_id = $2 AND church_id = $3
       FOR UPDATE`,
      [mediaId, eventId, churchId]
    );

    if (!result.rowCount) {
      throw httpError(404, "Event media not found.");
    }

    const media = result.rows[0];

    await deleteCloudinaryMedia(
      media.cloudinary_public_id,
      media.media_type
    );

    await client.query(
      `DELETE FROM event_media
       WHERE id = $1 AND event_id = $2 AND church_id = $3`,
      [mediaId, eventId, churchId]
    );

    await client.query("COMMIT");
    return { message: "Event media deleted successfully." };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteEvent(churchId, eventId) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const eventResult = await client.query(
      `SELECT * FROM events
       WHERE id = $1 AND church_id = $2
       FOR UPDATE`,
      [eventId, churchId]
    );

    if (!eventResult.rowCount) {
      throw httpError(404, "Event not found.");
    }

    const mediaResult = await client.query(
      `SELECT * FROM event_media
       WHERE event_id = $1 AND church_id = $2`,
      [eventId, churchId]
    );

    for (const media of mediaResult.rows) {
      await deleteCloudinaryMedia(
        media.cloudinary_public_id,
        media.media_type
      );
    }

    await client.query(
      `DELETE FROM events WHERE id = $1 AND church_id = $2`,
      [eventId, churchId]
    );

    await client.query("COMMIT");
    return { message: "Event deleted successfully." };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listPublishedEvents(churchId, query) {
  const { page, limit, search } = query;
  const offset = (page - 1) * limit;
  const values = [churchId];
  let searchCondition = "";

  if (search) {
    values.push(`%${search}%`);
    searchCondition = `AND (e.title ILIKE $2 OR e.description ILIKE $2 OR e.location ILIKE $2)`;
  }

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM events e
     WHERE e.church_id = $1
       AND e.status = 'published'
       ${searchCondition}`,
    values
  );

  const listValues = [...values, limit, offset];

  const result = await pool.query(
    `SELECT
       e.id, e.church_id, e.title, e.description, e.location,
       e.start_date, e.end_date, e.status, e.created_at,
       COALESCE(
         (
           SELECT json_agg(
             json_build_object(
               'id', em.id,
               'media_type', em.media_type,
               'media_url', em.media_url
             )
             ORDER BY em.created_at
           )
           FROM event_media em
           WHERE em.event_id = e.id
             AND em.church_id = e.church_id
         ),
         '[]'::json
       ) AS media
     FROM events e
     WHERE e.church_id = $1
       AND e.status = 'published'
       ${searchCondition}
     ORDER BY e.start_date ASC
     LIMIT $${listValues.length - 1}
     OFFSET $${listValues.length}`,
    listValues
  );

  return {
    events: result.rows,
    pagination: {
      page,
      limit,
      total: countResult.rows[0].total,
      totalPages: Math.ceil(countResult.rows[0].total / limit),
    },
  };
}

export async function getPublishedEvent(churchId, eventId) {
  const result = await pool.query(
    `SELECT
       e.id, e.church_id, e.title, e.description, e.location,
       e.start_date, e.end_date, e.status, e.created_at,
       COALESCE(
         (
           SELECT json_agg(
             json_build_object(
               'id', em.id,
               'media_type', em.media_type,
               'media_url', em.media_url
             )
             ORDER BY em.created_at
           )
           FROM event_media em
           WHERE em.event_id = e.id
             AND em.church_id = e.church_id
         ),
         '[]'::json
       ) AS media
     FROM events e
     WHERE e.id = $1
       AND e.church_id = $2
       AND e.status = 'published'`,
    [eventId, churchId]
  );

  if (!result.rowCount) {
    throw httpError(404, "Published event not found.");
  }

  return result.rows[0];
}