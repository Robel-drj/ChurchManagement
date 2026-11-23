
import { pool } from "../config/database.js";
import {
  PLATFORM_ADMIN_CHURCH_ACCESS_MESSAGE,
} from "../utils/platformAccess.js";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function requireChurchPermission(permissionName) {
  return async function churchPermissionMiddleware(req, res, next) {
    try {
      const churchId = req.params.churchId;

      if (!churchId || !UUID_REGEX.test(churchId)) {
        return res.status(400).json({
          success: false,
          message: "A valid church ID is required.",
        });
      }

      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          message: "Authentication required.",
        });
      }

      if (req.user.isPlatformAdmin) {
        return res.status(403).json({
          success: false,
          message: PLATFORM_ADMIN_CHURCH_ACCESS_MESSAGE,
        });
      }

      const result = await pool.query(
        `SELECT
           c.id AS church_id,
           c.church_name,
           c.status AS church_status,
           cm.id AS membership_id,
           cm.membership_status,
           COALESCE(
             ARRAY_AGG(DISTINCT cr.role_name)
               FILTER (WHERE cr.role_name IS NOT NULL),
             ARRAY[]::varchar[]
           ) AS roles,
           EXISTS (
             SELECT 1
             FROM membership_roles mr2
             JOIN role_permissions rp
               ON rp.role_id = mr2.role_id
              AND rp.church_id = mr2.church_id
             JOIN permissions p
               ON p.id = rp.permission_id
             WHERE mr2.membership_id = cm.id
               AND mr2.church_id = c.id
               AND p.permission_name = $3
           ) AS has_permission
         FROM churches c
         LEFT JOIN church_memberships cm
           ON cm.church_id = c.id
          AND cm.user_id = $1
         LEFT JOIN membership_roles mr
           ON mr.membership_id = cm.id
          AND mr.church_id = cm.church_id
         LEFT JOIN church_roles cr
           ON cr.id = mr.role_id
          AND cr.church_id = mr.church_id
         WHERE c.id = $2
         GROUP BY
           c.id,
           c.church_name,
           c.status,
           cm.id,
           cm.membership_status`,
        [req.user.id, churchId, permissionName]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: "Church not found.",
        });
      }

      const context = result.rows[0];

      if (context.church_status !== "active") {
        return res.status(403).json({
          success: false,
          message: "This church is not currently active.",
        });
      }

      if (
        !context.membership_id ||
        context.membership_status !== "active"
      ) {
        return res.status(403).json({
          success: false,
          message: "You do not have an active membership in this church.",
        });
      }

      if (!context.has_permission) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to perform this action.",
        });
      }

      req.church = {
        id: context.church_id,
        name: context.church_name,
      };

      req.churchMembership = {
        id: context.membership_id,
        status: context.membership_status,
      };

      req.churchRoles = context.roles;

      next();
    } catch (error) {
      next(error);
    }
  };
}
