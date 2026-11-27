
import crypto from "node:crypto";
import { pool } from "../../config/database.js";
import { writeAudit } from "../../utils/audit.js";
const DEFAULT_ROLES = [
  {
    name: "church_admin",
    description: "Manages the church and its authorized operations.",
  },
  {
    name: "money_collector",
    description: "Manages authorized church financial records and collections.",
  },
  {
    name: "secretary",
    description: "Manages church member registration and member information.",
  },
  {
    name: "content_creator",
    description: "Creates and manages church content, announcements, and events.",
  },
  {
    name: "member",
    description: "Views published church content and available payment methods.",
  },
];

const PERMISSIONS = [
  ["church.dashboard.view", "View the church dashboard."],
  ["church.profile.read", "View church information."],
  ["church.profile.update", "Update church information."],
["notifications.read", "Read church notifications."],
["notifications.manage", "Create and manage church notifications."],
  ["members.read", "View church members."],
  ["members.create", "Register church members."],
  ["members.update", "Update church member information."],

  ["finance.read", "View authorized financial records."],
  ["finance.transaction.create", "Create financial transactions."],
  ["finance.transaction.update", "Update authorized financial transactions."],
  ["finance.payment_methods.read", "View available payment methods."],
  ["finance.payment_methods.manage", "Manage church payment methods."],
["finance.contribution.create_self", "Start an online contribution."],
["finance.contribution.read_own", "View your own online contributions."],
  ["content.read_published", "View published church content."],
  ["content.create", "Create church content."],
  ["content.update", "Update church content."],
  ["content.publish", "Publish church content."],
  ["content.delete", "Delete church content."],
  ["media.upload", "Upload content media."],

  ["events.read_published", "View published church events."],
  ["events.create", "Create church events."],
  ["events.update", "Update church events."],
  ["events.publish", "Publish church events."],
  ["events.delete", "Delete church events."],

  ["roles.read", "View church roles."],
  ["roles.assign", "Assign roles to church memberships."],
  ["roles.manage", "Manage church roles and permissions."],
];

const ROLE_PERMISSIONS = {
  church_admin: PERMISSIONS.map(([name]) => name),

  money_collector: [
    "church.dashboard.view",
    "finance.read",
    "finance.transaction.create",
    "finance.transaction.update",
    "finance.payment_methods.read",
    "finance.contribution.create_self",
"finance.contribution.read_own",
  ],

  secretary: [
    "church.dashboard.view",
    "members.read",
    "members.create",
    "members.update",
  ],

  content_creator: [
    "church.dashboard.view",
    "content.read_published",
    "content.create",
    "content.update",
    "content.publish",
    "content.delete",
    "media.upload",
    "events.read_published",
    "events.create",
    "events.update",
    "events.publish",
    "events.delete",
  ],

  member: [
    "notifications.read",
    "content.read_published",
    "events.read_published",
    "finance.payment_methods.read",
  ],
};

function generateChurchCode(churchName) {
  const prefix = churchName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 8) || "CHURCH";

  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();

  return `${prefix}-${suffix}`;
}

export async function createChurch(
  data,
  createdBy,
  ipAddress = null
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const churchCode = generateChurchCode(data.churchName);

    const churchResult = await client.query(
      `INSERT INTO churches (
          church_name,
          church_code,
          address,
          phone,
          email,
          logo_url,
          status,
          created_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)
       RETURNING *`,
      [
        data.churchName,
        churchCode,
        data.address || null,
        data.phone || null,
        data.email || null,
        data.logoUrl || null,
        createdBy,
      ]
    );

    const church = churchResult.rows[0];

    await writeAudit(client, {
      churchId: church.id,
      userId: createdBy,
      action: "church.created",
      entityType: "church",
      entityId: church.id,
      details: {
        churchName: church.church_name,
        churchCode: church.church_code,
        initialStatus: church.status,
      },
      ipAddress,
    });
    // Create all default roles for this church.
    const roleIds = {};

    for (const role of DEFAULT_ROLES) {
      const result = await client.query(
        `INSERT INTO church_roles (
            church_id,
            role_name,
            description
         )
         VALUES ($1, $2, $3)
         RETURNING id`,
        [church.id, role.name, role.description]
      );

      roleIds[role.name] = result.rows[0].id;
    }

    // Create global permission definitions if they do not exist.
    const permissionIds = {};

    for (const [permissionName, description] of PERMISSIONS) {
      const result = await client.query(
        `INSERT INTO permissions (permission_name, description)
         VALUES ($1, $2)
         ON CONFLICT (permission_name)
         DO UPDATE SET description = EXCLUDED.description
         RETURNING id`,
        [permissionName, description]
      );

      permissionIds[permissionName] = result.rows[0].id;
    }

    // Assign the appropriate permissions to each church role.
    for (const [roleName, permissionNames] of Object.entries(ROLE_PERMISSIONS)) {
      for (const permissionName of permissionNames) {
        await client.query(
          `INSERT INTO role_permissions (
              role_id,
              church_id,
              permission_id
           )
           VALUES ($1, $2, $3)
           ON CONFLICT (role_id, permission_id) DO NOTHING`,
          [
            roleIds[roleName],
            church.id,
            permissionIds[permissionName],
          ]
        );
      }
    }

    await client.query("COMMIT");

    return {
      church,
      rolesCreated: Object.keys(roleIds),
      permissionsCreated: PERMISSIONS.length,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
export async function updateChurch(
  churchId,
  data,
  updatedBy,
  ipAddress = null
) {
  const allowedFields = {
    churchName: "church_name",
    address: "address",
    phone: "phone",
    email: "email",
    logoUrl: "logo_url",
  };

  const updates = [];
  const values = [];
  const changedFields = [];

  for (const [key, column] of Object.entries(allowedFields)) {
    if (data[key] !== undefined) {
      values.push(data[key]);
      updates.push(`${column} = $${values.length}`);
      changedFields.push(column);
    }
  }

  if (updates.length === 0) {
    return null;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    values.push(churchId);

    const result = await client.query(
      `UPDATE churches
       SET ${updates.join(", ")},
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $${values.length}
       RETURNING *`,
      values
    );

    const church = result.rows[0];

    if (!church) {
      await client.query("ROLLBACK");
      return null;
    }

    await writeAudit(client, {
      churchId,
      userId: updatedBy,
      action: "church.updated",
      entityType: "church",
      entityId: churchId,
      details: {
        changedFields,
      },
      ipAddress,
    });

    await client.query("COMMIT");

    return church;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateChurchStatus(
  churchId,
  status,
  updatedBy,
  ipAddress = null
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `UPDATE churches
       SET status = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [status, churchId]
    );

    const church = result.rows[0];

    if (!church) {
      await client.query("ROLLBACK");
      return null;
    }

    await writeAudit(client, {
      churchId,
      userId: updatedBy,
      action: status === "active" ? "church.activated" : "church.suspended",
      entityType: "church",
      entityId: churchId,
      details: { status },
      ipAddress,
    });

    await client.query("COMMIT");

    return church;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listChurches({ status, search, limit = 20, offset = 0 }) {
  const values = [];
  const conditions = [];

  if (status) {
    values.push(status);
    conditions.push(`status = $${values.length}`);
  }

  if (search) {
    values.push(`%${search}%`);
    conditions.push(
      `(church_name ILIKE $${values.length}
        OR church_code ILIKE $${values.length}
        OR email ILIKE $${values.length})`
    );
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  values.push(limit);
  const limitPosition = values.length;

  values.push(offset);
  const offsetPosition = values.length;

  const result = await pool.query(
    `SELECT *
     FROM churches
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${limitPosition}
     OFFSET $${offsetPosition}`,
    values
  );

  return result.rows;
}

export async function getChurchById(churchId) {
  const result = await pool.query(
    `SELECT *
     FROM churches
     WHERE id = $1`,
    [churchId]
  );

  return result.rows[0] || null;
}
export async function listPlatformAuditLogs({
  action,
  search,
  limit = 20,
  offset = 0,
}) {
  const values = [];
  const conditions = [];

  if (action) {
    values.push(action);
    conditions.push(`al.action = $${values.length}`);
  }

  if (search) {
    values.push(`%${search}%`);
    const position = values.length;

    conditions.push(`(
      al.action ILIKE $${position}
      OR al.entity_type ILIKE $${position}
      OR COALESCE(u.full_name, '') ILIKE $${position}
      OR COALESCE(c.church_name, '') ILIKE $${position}
      OR COALESCE(al.details::text, '') ILIKE $${position}
    )`);
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM audit_logs al
     LEFT JOIN users u ON u.id = al.user_id
     LEFT JOIN churches c ON c.id = al.church_id
     ${whereClause}`,
    values
  );

  const total = countResult.rows[0].total;

  const listValues = [...values, limit, offset];

  const result = await pool.query(
    `SELECT
       al.id,
       al.church_id,
       c.church_name,
       al.user_id,
       u.full_name AS performed_by,
       al.action,
       al.entity_type,
       al.entity_id,
       al.details,
       al.ip_address,
       al.created_at
     FROM audit_logs al
     LEFT JOIN users u ON u.id = al.user_id
     LEFT JOIN churches c ON c.id = al.church_id
     ${whereClause}
     ORDER BY al.created_at DESC
     LIMIT $${values.length + 1}
     OFFSET $${values.length + 2}`,
    listValues
  );

  return {
    logs: result.rows,
    total,
  };
}
export async function getPlatformDashboardSummary() {
  const result = await pool.query(`
    SELECT
      COUNT(*)::int AS total_churches,
      COUNT(*) FILTER (
        WHERE status = 'active'
      )::int AS active_churches,
      COUNT(*) FILTER (
        WHERE status = 'pending'
      )::int AS pending_churches,
      COUNT(*) FILTER (
        WHERE status = 'suspended'
      )::int AS suspended_churches
    FROM churches
  `);

  const row = result.rows[0];

  return {
    totalChurches: row.total_churches,
    activeChurches: row.active_churches,
    pendingChurches: row.pending_churches,
    suspendedChurches: row.suspended_churches,
  };
}
