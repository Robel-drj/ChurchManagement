
import { pool } from "../../config/database.js";
import { cloudinary } from "../../config/cloudinary.js";

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function uploadBufferToCloudinary(file, churchId, postId) {
  return new Promise((resolve, reject) => {
    const resourceType = file.mimetype.startsWith("video/")
      ? "video"
      : "image";

    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `churches/${churchId}/posts/${postId}`,
        resource_type: resourceType,
        use_filename: false,
        unique_filename: true,
      },
     (error, result) => {
  if (error) {
    console.error("CLOUDINARY UPLOAD ERROR:", {
      message: error.message,
      http_code: error.http_code,
      name: error.name,
    });

    return reject(error);
  }

  resolve(result);
}
    );

    stream.end(file.buffer);
  });
}

async function deleteCloudinaryAsset(publicId, resourceType) {
  if (!publicId) return;

  const result = await cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType === "video" ? "video" : "image",
    invalidate: true,
  });

  if (result.result !== "ok" && result.result !== "not found") {
    throw new Error(`Cloudinary could not delete asset ${publicId}.`);
  }
}

export async function createPost(churchId, membershipId, input) {
  const result = await pool.query(
    `INSERT INTO posts (
       church_id,
       title,
       content,
       post_type,
       status,
       created_by_membership_id
     )
     SELECT $1, $2, $3, $4, 'draft', cm.id
     FROM church_memberships cm
     WHERE cm.id = $5
       AND cm.church_id = $1
       AND cm.membership_status = 'active'
     RETURNING *`,
    [
      churchId,
      input.title,
      input.content,
      input.post_type,
      membershipId,
    ]
  );

  if (result.rowCount === 0) {
    throw createHttpError("Active church membership not found.", 403);
  }

  return result.rows[0];
}

export async function listManagePosts(churchId, filters) {
  const { page, limit, search, post_type, status } = filters;
  const conditions = ["p.church_id = $1"];
  const values = [churchId];

  if (search) {
    values.push(`%${search}%`);
    conditions.push(
      `(p.title ILIKE $${values.length} OR p.content ILIKE $${values.length})`
    );
  }

  if (post_type) {
    values.push(post_type);
    conditions.push(`p.post_type = $${values.length}`);
  }

  if (status) {
    values.push(status);
    conditions.push(`p.status = $${values.length}`);
  }

  const whereClause = conditions.join(" AND ");

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM posts p
     WHERE ${whereClause}`,
    values
  );

  const offset = (page - 1) * limit;
  const listValues = [...values, limit, offset];

  const result = await pool.query(
    `SELECT
       p.id,
       p.church_id,
       p.title,
       p.content,
       p.post_type,
       p.status,
       p.published_at,
       p.created_at,
       p.updated_at,
       u.full_name AS creator_name,
       COALESCE(
         json_agg(
           json_build_object(
             'id', pm.id,
             'media_type', pm.media_type,
             'media_url', pm.media_url,
             'file_name', pm.file_name,
             'file_size', pm.file_size,
             'mime_type', pm.mime_type,
             'display_order', pm.display_order
           )
           ORDER BY pm.display_order, pm.created_at
         ) FILTER (WHERE pm.id IS NOT NULL),
         '[]'::json
       ) AS media
     FROM posts p
     JOIN church_memberships cm
       ON cm.id = p.created_by_membership_id
      AND cm.church_id = p.church_id
     JOIN users u ON u.id = cm.user_id
     LEFT JOIN post_media pm
       ON pm.post_id = p.id
      AND pm.church_id = p.church_id
     WHERE ${whereClause}
     GROUP BY p.id, u.full_name
     ORDER BY p.created_at DESC
     LIMIT $${values.length + 1}
     OFFSET $${values.length + 2}`,
    listValues
  );

  return {
    posts: result.rows,
    pagination: {
      page,
      limit,
      total: countResult.rows[0].total,
      total_pages: Math.ceil(countResult.rows[0].total / limit),
    },
  };
}

export async function getPostDetails(churchId, postId) {
  const result = await pool.query(
    `SELECT
       p.id,
       p.church_id,
       p.title,
       p.content,
       p.post_type,
       p.status,
       p.published_at,
       p.created_at,
       p.updated_at,
       u.full_name AS creator_name,
       COALESCE(
         json_agg(
           json_build_object(
             'id', pm.id,
             'media_type', pm.media_type,
             'media_url', pm.media_url,
             'file_name', pm.file_name,
             'file_size', pm.file_size,
             'mime_type', pm.mime_type,
             'display_order', pm.display_order
           )
           ORDER BY pm.display_order, pm.created_at
         ) FILTER (WHERE pm.id IS NOT NULL),
         '[]'::json
       ) AS media
     FROM posts p
     JOIN church_memberships cm
       ON cm.id = p.created_by_membership_id
      AND cm.church_id = p.church_id
     JOIN users u ON u.id = cm.user_id
     LEFT JOIN post_media pm
       ON pm.post_id = p.id
      AND pm.church_id = p.church_id
     WHERE p.id = $1 AND p.church_id = $2
     GROUP BY p.id, u.full_name`,
    [postId, churchId]
  );

  if (result.rowCount === 0) {
    throw createHttpError("Post not found.", 404);
  }

  return result.rows[0];
}

export async function updatePost(churchId, postId, input) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existing = await client.query(
      `SELECT id, status
       FROM posts
       WHERE id = $1 AND church_id = $2
       FOR UPDATE`,
      [postId, churchId]
    );

    if (existing.rowCount === 0) {
      throw createHttpError("Post not found.", 404);
    }

    if (existing.rows[0].status === "archived") {
      throw createHttpError("Archived posts cannot be edited.", 409);
    }

    const fields = [];
    const values = [postId, churchId];

    const allowedFields = ["title", "content", "post_type"];

    for (const field of allowedFields) {
      if (Object.hasOwn(input, field)) {
        values.push(input[field]);
        fields.push(`${field} = $${values.length}`);
      }
    }

    const result = await client.query(
      `UPDATE posts
       SET ${fields.join(", ")},
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND church_id = $2
       RETURNING *`,
      values
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

export async function changePostStatus(churchId, postId, action) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existing = await client.query(
      `SELECT id, status
       FROM posts
       WHERE id = $1 AND church_id = $2
       FOR UPDATE`,
      [postId, churchId]
    );

    if (existing.rowCount === 0) {
      throw createHttpError("Post not found.", 404);
    }

    const currentStatus = existing.rows[0].status;
    let newStatus;

    if (action === "publish") {
      if (currentStatus === "archived") {
        throw createHttpError("Archived posts cannot be published.", 409);
      }
      if (currentStatus === "published") {
        throw createHttpError("Post is already published.", 409);
      }
      newStatus = "published";
    } else if (action === "unpublish") {
      if (currentStatus !== "published") {
        throw createHttpError("Only published posts can be unpublished.", 409);
      }
      newStatus = "draft";
    } else {
      if (currentStatus === "archived") {
        throw createHttpError("Post is already archived.", 409);
      }
      newStatus = "archived";
    }

    const result = await client.query(
      `UPDATE posts
       SET status = $1::varchar,
            published_at = CASE
              WHEN $1::varchar = 'published' THEN CURRENT_TIMESTAMP
              ELSE published_at
            END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND church_id = $3
       RETURNING *`,
      [newStatus, postId, churchId]
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

export async function addPostMedia(churchId, postId, files) {
  const postResult = await pool.query(
    `SELECT id, status
     FROM posts
     WHERE id = $1 AND church_id = $2`,
    [postId, churchId]
  );

  if (postResult.rowCount === 0) {
    throw createHttpError("Post not found.", 404);
  }

  if (postResult.rows[0].status === "archived") {
    throw createHttpError("Media cannot be added to archived posts.", 409);
  }

  const uploadedAssets = [];
  const client = await pool.connect();

  try {
    for (const file of files) {
      const asset = await uploadBufferToCloudinary(file, churchId, postId);
      uploadedAssets.push({
        ...asset,
        file,
      });
    }

    await client.query("BEGIN");

    const insertedMedia = [];

    for (let index = 0; index < uploadedAssets.length; index += 1) {
      const { file, ...asset } = uploadedAssets[index];

      const result = await client.query(
        `INSERT INTO post_media (
           church_id,
           post_id,
           media_type,
           media_url,
           cloudinary_public_id,
           file_name,
           file_size,
           mime_type,
           display_order
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING
           id,
           post_id,
           media_type,
           media_url,
           file_name,
           file_size,
           mime_type,
           display_order,
           created_at`,
        [
          churchId,
          postId,
          file.mimetype.startsWith("video/") ? "video" : "image",
          asset.secure_url,
          asset.public_id,
          file.originalname,
          file.size,
          file.mimetype,
          index,
        ]
      );

      insertedMedia.push(result.rows[0]);
    }

    await client.query("COMMIT");
    return insertedMedia;
  } catch (error) {
    await client.query("ROLLBACK");

    await Promise.allSettled(
      uploadedAssets.map((asset) =>
        deleteCloudinaryAsset(
          asset.public_id,
          asset.resource_type
        )
      )
    );

    throw error;
  } finally {
    client.release();
  }
}

export async function removePostMedia(churchId, postId, mediaId) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `SELECT pm.id, pm.cloudinary_public_id, pm.media_type
       FROM post_media pm
       JOIN posts p
         ON p.id = pm.post_id
        AND p.church_id = pm.church_id
       WHERE pm.id = $1
         AND pm.post_id = $2
         AND pm.church_id = $3
       FOR UPDATE OF pm`,
      [mediaId, postId, churchId]
    );

    if (result.rowCount === 0) {
      throw createHttpError("Post media not found.", 404);
    }

    const media = result.rows[0];

    if (media.cloudinary_public_id) {
      await deleteCloudinaryAsset(
        media.cloudinary_public_id,
        media.media_type
      );
    }

    await client.query(
      `DELETE FROM post_media
       WHERE id = $1 AND post_id = $2 AND church_id = $3`,
      [mediaId, postId, churchId]
    );

    await client.query("COMMIT");

    return { id: media.id };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function deletePost(churchId, postId) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const postResult = await client.query(
      `SELECT id, status
       FROM posts
       WHERE id = $1 AND church_id = $2
       FOR UPDATE`,
      [postId, churchId]
    );

    if (postResult.rowCount === 0) {
      throw createHttpError("Post not found.", 404);
    }

    const mediaResult = await client.query(
      `SELECT cloudinary_public_id, media_type
       FROM post_media
       WHERE post_id = $1 AND church_id = $2`,
      [postId, churchId]
    );

    // Delete Cloudinary assets before deleting database records.
    // If an asset deletion fails, keep the post and its DB records.
    for (const media of mediaResult.rows) {
      if (media.cloudinary_public_id) {
        await deleteCloudinaryAsset(
          media.cloudinary_public_id,
          media.media_type
        );
      }
    }

    await client.query(
      `DELETE FROM posts
       WHERE id = $1 AND church_id = $2`,
      [postId, churchId]
    );

    await client.query("COMMIT");

    return { id: postId };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listPublishedPosts(churchId, filters) {
  const { page, limit, search, post_type } = filters;
  const conditions = [
    "p.church_id = $1",
    "p.status = 'published'",
  ];
  const values = [churchId];

  if (search) {
    values.push(`%${search}%`);
    conditions.push(
      `(p.title ILIKE $${values.length} OR p.content ILIKE $${values.length})`
    );
  }

  if (post_type) {
    values.push(post_type);
    conditions.push(`p.post_type = $${values.length}`);
  }

  const whereClause = conditions.join(" AND ");

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM posts p
     WHERE ${whereClause}`,
    values
  );

  const offset = (page - 1) * limit;
  const listValues = [...values, limit, offset];

  const result = await pool.query(
    `SELECT
       p.id,
       p.title,
       p.content,
       p.post_type,
       p.published_at,
       COALESCE(
         json_agg(
           json_build_object(
             'id', pm.id,
             'media_type', pm.media_type,
             'media_url', pm.media_url,
             'file_name', pm.file_name,
             'mime_type', pm.mime_type,
             'display_order', pm.display_order
           )
           ORDER BY pm.display_order, pm.created_at
         ) FILTER (WHERE pm.id IS NOT NULL),
         '[]'::json
       ) AS media
     FROM posts p
     LEFT JOIN post_media pm
       ON pm.post_id = p.id
      AND pm.church_id = p.church_id
     WHERE ${whereClause}
     GROUP BY p.id
     ORDER BY p.published_at DESC
     LIMIT $${values.length + 1}
     OFFSET $${values.length + 2}`,
    listValues
  );

  return {
    posts: result.rows,
    pagination: {
      page,
      limit,
      total: countResult.rows[0].total,
      total_pages: Math.ceil(countResult.rows[0].total / limit),
    },
  };
}

export async function getPublishedPost(churchId, postId) {
  const result = await pool.query(
    `SELECT
       p.id,
       p.title,
       p.content,
       p.post_type,
       p.published_at,
       COALESCE(
         json_agg(
           json_build_object(
             'id', pm.id,
             'media_type', pm.media_type,
             'media_url', pm.media_url,
             'file_name', pm.file_name,
             'mime_type', pm.mime_type,
             'display_order', pm.display_order
           )
           ORDER BY pm.display_order, pm.created_at
         ) FILTER (WHERE pm.id IS NOT NULL),
         '[]'::json
       ) AS media
     FROM posts p
     LEFT JOIN post_media pm
       ON pm.post_id = p.id
      AND pm.church_id = p.church_id
     WHERE p.id = $1
       AND p.church_id = $2
       AND p.status = 'published'
     GROUP BY p.id`,
    [postId, churchId]
  );

  if (result.rowCount === 0) {
    throw createHttpError("Published post not found.", 404);
  }

  return result.rows[0];
}
