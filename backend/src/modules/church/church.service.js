
import { pool } from "../../config/database.js";

export async function getChurchDashboard(churchId) {
  // 1. Basic church information
  const churchResult = await pool.query(
    `SELECT
       id,
       church_name,
       church_code,
       status,
       created_at
     FROM churches
     WHERE id = $1`,
    [churchId]
  );

  if (churchResult.rowCount === 0) {
    const error = new Error("Church not found.");
    error.statusCode = 404;
    throw error;
  }

  // 2. Membership statistics
  const membershipResult = await pool.query(
    `SELECT
       COUNT(*)::int AS total_members,
       COUNT(*) FILTER (
         WHERE membership_status = 'active'
       )::int AS active_members,
       COUNT(*) FILTER (
         WHERE membership_status = 'pending'
       )::int AS pending_members,
       COUNT(*) FILTER (
         WHERE membership_status = 'suspended'
       )::int AS suspended_members
     FROM church_memberships
     WHERE church_id = $1`,
    [churchId]
  );

  // 3. Staff counts by assigned role
  const staffResult = await pool.query(
    `SELECT
       cr.role_name,
       COUNT(DISTINCT cm.id)::int AS member_count
     FROM church_roles cr
     LEFT JOIN membership_roles mr
       ON mr.role_id = cr.id
      AND mr.church_id = cr.church_id
     LEFT JOIN church_memberships cm
       ON cm.id = mr.membership_id
      AND cm.church_id = mr.church_id
      AND cm.membership_status = 'active'
     WHERE cr.church_id = $1
       AND cr.role_name <> 'member'
     GROUP BY cr.id, cr.role_name
     ORDER BY cr.role_name`,
    [churchId]
  );

  // 4. Recent membership registrations (last 7 calendar days)
  const activityResult = await pool.query(
    `SELECT
       TO_CHAR(joined_at::date, 'YYYY-MM-DD') AS registration_date,
       COUNT(*)::int AS registrations
     FROM church_memberships
     WHERE church_id = $1
       AND joined_at >= CURRENT_DATE - INTERVAL '6 days'
       AND joined_at < CURRENT_DATE + INTERVAL '1 day'
     GROUP BY joined_at::date
     ORDER BY joined_at::date`,
    [churchId]
  );

  return {
    church: churchResult.rows[0],
    memberships: membershipResult.rows[0],
    staff: staffResult.rows,
    recentRegistrations: activityResult.rows,
  };
}
