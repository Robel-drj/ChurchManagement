import { pool } from "../../config/database.js";
import {
  PLATFORM_ADMIN_ROLE_CONFLICT_MESSAGE,
  userHasPlatformAdminRole,
} from "../../utils/platformAccess.js";

const ASSIGNABLE_STAFF_ROLES = [
  "secretary",
  "money_collector",
  "content_creator",
];

export async function listChurchStaff(churchId) {
  const result = await pool.query(
    `SELECT
       cm.id AS membership_id,
       cm.member_number,
       cm.membership_status,
       cm.joined_at,
       u.id AS user_id,
       u.full_name,
       u.phone,
       u.email,
       ARRAY_AGG(DISTINCT cr.role_name)
         FILTER (
           WHERE cr.role_name IS NOT NULL
             AND cr.role_name <> 'member'
         ) AS staff_roles
     FROM church_memberships cm
     JOIN users u
       ON u.id = cm.user_id
     JOIN membership_roles mr
       ON mr.membership_id = cm.id
      AND mr.church_id = cm.church_id
     JOIN church_roles cr
       ON cr.id = mr.role_id
      AND cr.church_id = mr.church_id
     WHERE cm.church_id = $1
       AND cr.role_name IN (
         'church_admin',
         'secretary',
         'money_collector',
         'content_creator'
       )
     GROUP BY cm.id, u.id
     ORDER BY u.full_name ASC`,
    [churchId]
  );

  return result.rows;
}

export async function assignChurchStaffRole(
  churchId,
  membershipId,
  roleName,
  assignedBy
) {
  if (!ASSIGNABLE_STAFF_ROLES.includes(roleName)) {
    const error = new Error("This staff role cannot be assigned.");
    error.statusCode = 400;
    throw error;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Ensure the church is active and serialize role changes
    // against other staff-management operations.
    const churchResult = await client.query(
      `SELECT id
       FROM churches
       WHERE id = $1
         AND status = 'active'
       FOR UPDATE`,
      [churchId]
    );

    if (churchResult.rowCount === 0) {
      const error = new Error("Church not found or not active.");
      error.statusCode = 403;
      throw error;
    }

    // Ensure the target membership belongs to this church.
    const membershipResult = await client.query(
      `SELECT id, user_id, membership_status
       FROM church_memberships
       WHERE id = $1
         AND church_id = $2
       FOR UPDATE`,
      [membershipId, churchId]
    );

    if (membershipResult.rowCount === 0) {
      const error = new Error("Member not found in this church.");
      error.statusCode = 404;
      throw error;
    }

    if (membershipResult.rows[0].membership_status !== "active") {
      const error = new Error(
        "Staff roles can only be assigned to active memberships."
      );
      error.statusCode = 409;
      throw error;
    }

    if (
      await userHasPlatformAdminRole(
        client,
        membershipResult.rows[0].user_id
      )
    ) {
      const error = new Error(
        PLATFORM_ADMIN_ROLE_CONFLICT_MESSAGE
      );
      error.statusCode = 409;
      throw error;
    }

    const roleResult = await client.query(
      `SELECT id
       FROM church_roles
       WHERE church_id = $1
         AND role_name = $2`,
      [churchId, roleName]
    );

    if (roleResult.rowCount === 0) {
      const error = new Error(
        "The requested staff role is not configured for this church."
      );
      error.statusCode = 404;
      throw error;
    }

    const assignmentResult = await client.query(
      `INSERT INTO membership_roles (
         membership_id,
         church_id,
         role_id,
         assigned_by
       )
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (membership_id, role_id) DO NOTHING
       RETURNING id, assigned_at`,
      [
        membershipId,
        churchId,
        roleResult.rows[0].id,
        assignedBy,
      ]
    );

    await client.query("COMMIT");

    return {
      membership_id: membershipId,
      role_name: roleName,
      assigned: assignmentResult.rowCount > 0,
      message: assignmentResult.rowCount > 0
        ? "Staff role assigned successfully."
        : "This staff role is already assigned.",
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function removeChurchStaffRole(
  churchId,
  membershipId,
  roleName
) {
  if (!ASSIGNABLE_STAFF_ROLES.includes(roleName)) {
    const error = new Error("This staff role cannot be removed here.");
    error.statusCode = 400;
    throw error;
  }

  const result = await pool.query(
    `DELETE FROM membership_roles mr
     USING church_roles cr, church_memberships cm
     WHERE mr.role_id = cr.id
       AND mr.church_id = cr.church_id
       AND mr.membership_id = cm.id
       AND mr.church_id = cm.church_id
       AND mr.church_id = $1
       AND mr.membership_id = $2
       AND cr.role_name = $3
     RETURNING mr.id`,
    [churchId, membershipId, roleName]
  );

  if (result.rowCount === 0) {
    const error = new Error(
      "The requested staff role was not assigned to this membership."
    );
    error.statusCode = 404;
    throw error;
  }

  return {
    membership_id: membershipId,
    role_name: roleName,
    removed: true,
  };
}
