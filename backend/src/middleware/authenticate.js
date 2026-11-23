import jwt from "jsonwebtoken";
import { pool } from "../config/database.js";
import { PLATFORM_ADMIN_ROLE } from "../utils/platformAccess.js";

export async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;

    if (!header?.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication token required.",
      });
    }

    const token = header.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET
    );

    const result = await pool.query(
      `SELECT
         u.id,
         u.account_status,
         EXISTS (
           SELECT 1
           FROM user_platform_roles upr
           JOIN platform_roles pr ON pr.id = upr.role_id
           WHERE upr.user_id = u.id
             AND pr.role_name = $2
         ) AS is_platform_admin
       FROM users u
       WHERE u.id = $1`,
      [decoded.sub, PLATFORM_ADMIN_ROLE]
    );

    const user = result.rows[0];

    if (!user || user.account_status !== "active") {
      return res.status(401).json({
        success: false,
        message: "Account not found or disabled.",
      });
    }

    req.user = {
      id: user.id,
      isPlatformAdmin: user.is_platform_admin,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token.",
    });
  }
}
