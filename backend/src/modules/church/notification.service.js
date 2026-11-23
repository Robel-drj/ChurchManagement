
import { pool } from "../../config/database.js";

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export async function createAndSendNotification(
  churchId,
  creatorMembershipId,
  data
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const churchResult = await client.query(
      `SELECT id FROM churches WHERE id = $1 AND status = 'active' FOR SHARE`,
      [churchId]
    );

    if (!churchResult.rowCount) {
      throw httpError(403, "Church is not active.");
    }

    const creatorResult = await client.query(
      `SELECT id
       FROM church_memberships
       WHERE id = $1
         AND church_id = $2
         AND membership_status = 'active'
       FOR SHARE`,
      [creatorMembershipId, churchId]
    );

    if (!creatorResult.rowCount) {
      throw httpError(403, "Your church membership is not active.");
    }

    let recipientResult;

    if (data.target_type === "all") {
      recipientResult = await client.query(
        `SELECT id
         FROM church_memberships
         WHERE church_id = $1
           AND membership_status = 'active'`,
        [churchId]
      );
    } else {
      recipientResult = await client.query(
        `SELECT id
         FROM church_memberships
         WHERE church_id = $1
           AND membership_status = 'active'
           AND id = ANY($2::uuid[])`,
        [churchId, data.membership_ids]
      );

      if (recipientResult.rowCount !== data.membership_ids.length) {
        throw httpError(
          400,
          "One or more selected members are invalid or inactive in this church."
        );
      }
    }

    if (!recipientResult.rowCount) {
      throw httpError(400, "There are no active recipients.");
    }

    const notificationResult = await client.query(
      `INSERT INTO notifications (
         church_id,
         title,
         message,
         notification_type,
         target_type,
         status,
         created_by_membership_id,
         sent_at
       )
       VALUES ($1, $2, $3, $4, $5, 'sent', $6, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        churchId,
        data.title,
        data.message,
        data.notification_type,
        data.target_type,
        creatorMembershipId,
      ]
    );

    const notification = notificationResult.rows[0];

    const recipientIds = recipientResult.rows.map(row => row.id);

    await client.query(
      `INSERT INTO notification_recipients (
         church_id,
         notification_id,
         membership_id,
         delivered_at
       )
       SELECT $1, $2, member_id, CURRENT_TIMESTAMP
       FROM unnest($3::uuid[]) AS member_id
       ON CONFLICT (notification_id, membership_id) DO NOTHING`,
      [churchId, notification.id, recipientIds]
    );

    await client.query("COMMIT");

    return {
      ...notification,
      recipient_count: recipientIds.length,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listChurchNotifications(churchId, filters) {
  const offset = (filters.page - 1) * filters.limit;

  const result = await pool.query(
    `SELECT
       n.*,
       COUNT(nr.id)::int AS recipient_count,
       COUNT(nr.id) FILTER (WHERE nr.is_read = true)::int AS read_count,
       COUNT(nr.id) FILTER (WHERE nr.is_read = false)::int AS unread_count
     FROM notifications n
     LEFT JOIN notification_recipients nr
       ON nr.notification_id = n.id
      AND nr.church_id = n.church_id
     WHERE n.church_id = $1
       AND ($2::text IS NULL OR n.status = $2)
     GROUP BY n.id
     ORDER BY n.created_at DESC
     LIMIT $3 OFFSET $4`,
    [churchId, filters.status || null, filters.limit, offset]
  );

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM notifications
     WHERE church_id = $1
       AND ($2::text IS NULL OR status = $2)`,
    [churchId, filters.status || null]
  );

  const total = countResult.rows[0].total;

  return {
    notifications: result.rows,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.ceil(total / filters.limit),
    },
  };
}

export async function getChurchNotification(churchId, notificationId) {
  const result = await pool.query(
    `SELECT
       n.*,
       COUNT(nr.id)::int AS recipient_count,
       COUNT(nr.id) FILTER (WHERE nr.is_read = true)::int AS read_count,
       COUNT(nr.id) FILTER (WHERE nr.is_read = false)::int AS unread_count
     FROM notifications n
     LEFT JOIN notification_recipients nr
       ON nr.notification_id = n.id
      AND nr.church_id = n.church_id
     WHERE n.id = $1
       AND n.church_id = $2
     GROUP BY n.id`,
    [notificationId, churchId]
  );

  if (!result.rowCount) {
    throw httpError(404, "Notification not found.");
  }

  return result.rows[0];
}

export async function cancelChurchNotification(churchId, notificationId) {
  const result = await pool.query(
    `UPDATE notifications
     SET status = 'cancelled'
     WHERE id = $1
       AND church_id = $2
       AND status = 'sent'
     RETURNING *`,
    [notificationId, churchId]
  );

  if (!result.rowCount) {
    throw httpError(
      404,
      "Sent notification not found or already cancelled."
    );
  }

  return result.rows[0];
}

export async function listMemberNotifications(
  churchId,
  membershipId,
  filters
) {
  const offset = (filters.page - 1) * filters.limit;
  const unreadOnly = filters.unread_only === "true";

  const result = await pool.query(
    `SELECT
       n.id,
       n.title,
       n.message,
       n.notification_type,
       n.sent_at,
       nr.id AS recipient_id,
       nr.is_read,
       nr.read_at,
       nr.delivered_at,
       nr.created_at AS received_at
     FROM notification_recipients nr
     INNER JOIN notifications n
       ON n.id = nr.notification_id
      AND n.church_id = nr.church_id
     WHERE nr.church_id = $1
       AND nr.membership_id = $2
       AND n.status = 'sent'
       AND ($3::boolean = false OR nr.is_read = false)
     ORDER BY nr.created_at DESC
     LIMIT $4 OFFSET $5`,
    [churchId, membershipId, unreadOnly, filters.limit, offset]
  );

  const countResult = await pool.query(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE is_read = false)::int AS unread_count
     FROM notification_recipients nr
     INNER JOIN notifications n
       ON n.id = nr.notification_id
      AND n.church_id = nr.church_id
     WHERE nr.church_id = $1
       AND nr.membership_id = $2
       AND n.status = 'sent'
       AND ($3::boolean = false OR nr.is_read = false)`,
    [churchId, membershipId, unreadOnly]
  );

  const counts = countResult.rows[0];

  return {
    notifications: result.rows,
    unread_count: counts.unread_count,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total: counts.total,
      totalPages: Math.ceil(counts.total / filters.limit),
    },
  };
}

export async function markMemberNotificationRead(
  churchId,
  membershipId,
  notificationId
) {
  const result = await pool.query(
    `UPDATE notification_recipients nr
     SET is_read = true,
         read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
     FROM notifications n
     WHERE nr.notification_id = n.id
       AND nr.church_id = n.church_id
       AND nr.notification_id = $1
       AND nr.church_id = $2
       AND nr.membership_id = $3
       AND n.status = 'sent'
     RETURNING nr.id, nr.is_read, nr.read_at`,
    [notificationId, churchId, membershipId]
  );

  if (!result.rowCount) {
    throw httpError(404, "Notification not found in your inbox.");
  }

  return result.rows[0];
}

export async function markAllMemberNotificationsRead(churchId, membershipId) {
  const result = await pool.query(
    `UPDATE notification_recipients nr
     SET is_read = true,
         read_at = CURRENT_TIMESTAMP
     FROM notifications n
     WHERE nr.notification_id = n.id
       AND nr.church_id = n.church_id
       AND nr.church_id = $1
       AND nr.membership_id = $2
       AND nr.is_read = false
       AND n.status = 'sent'
     RETURNING nr.id`,
    [churchId, membershipId]
  );

  return { updated_count: result.rowCount };
}
