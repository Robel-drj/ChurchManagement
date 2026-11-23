import dotenv from "dotenv";
import bcrypt from "bcrypt";
import { pool } from "../src/config/database.js";

dotenv.config();

async function provisionSuperAdmin() {
  const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD;
  const fullName = process.env.SUPER_ADMIN_NAME?.trim();
  const phone = process.env.SUPER_ADMIN_PHONE?.trim();
  let client;

  try {
    if (!email || !password) {
      throw new Error(
        "SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be configured in .env"
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("SUPER_ADMIN_EMAIL must be a valid email address.");
    }

    if (password.length < 8 || password.length > 72) {
      throw new Error(
        "SUPER_ADMIN_PASSWORD must contain between 8 and 72 characters."
      );
    }

    const rounds = Number(process.env.BCRYPT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(password, rounds);

    client = await pool.connect();
    await client.query("BEGIN");

    const roleResult = await client.query(
      `INSERT INTO platform_roles (role_name, description)
       VALUES ('super_admin', 'Platform management access only')
       ON CONFLICT (role_name)
       DO UPDATE SET role_name = EXCLUDED.role_name
       RETURNING id`,
    );

    const userResult = await client.query(
      `SELECT id, account_status
       FROM users
       WHERE LOWER(email) = $1
       FOR UPDATE`,
      [email]
    );

    if (userResult.rowCount > 1) {
      throw new Error(
        "Multiple accounts use SUPER_ADMIN_EMAIL. Resolve the duplicate accounts first."
      );
    }

    let userId;
    let accountCreated = false;

    if (userResult.rowCount === 0) {
      if (!fullName || !phone) {
        throw new Error(
          "No matching account exists. Configure SUPER_ADMIN_NAME and SUPER_ADMIN_PHONE to create it."
        );
      }

      const newUserResult = await client.query(
        `INSERT INTO users (
           full_name,
           phone,
           email,
           password_hash,
           account_status
         )
         VALUES ($1, $2, $3, $4, 'active')
         RETURNING id`,
        [fullName, phone, email, passwordHash]
      );

      userId = newUserResult.rows[0].id;
      accountCreated = true;
    } else {
      const user = userResult.rows[0];

      if (user.account_status !== "active") {
        throw new Error(
          "The configured Platform Administrator account is disabled. Reactivate it before assigning platform access."
        );
      }

      userId = user.id;

      await client.query(
        `UPDATE users
         SET password_hash = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [passwordHash, userId]
      );
    }

    const existingAssignmentResult = await client.query(
      `SELECT 1
       FROM user_platform_roles
       WHERE user_id = $1
         AND role_id = $2
       LIMIT 1`,
      [userId, roleResult.rows[0].id]
    );

    if (existingAssignmentResult.rowCount === 0) {
      const churchMembershipResult = await client.query(
        `SELECT 1
         FROM church_memberships
         WHERE user_id = $1
         LIMIT 1`,
        [userId]
      );

      if (churchMembershipResult.rowCount > 0) {
        throw new Error(
          "Platform Administrator access requires a separate account with no church membership. Configure a different SUPER_ADMIN_EMAIL."
        );
      }
    }

    const assignmentResult = await client.query(
      `INSERT INTO user_platform_roles (user_id, role_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, role_id) DO NOTHING
       RETURNING id`,
      [userId, roleResult.rows[0].id]
    );

    // A password reset invalidates existing refresh sessions for this account.
    const authSessionsResult = await client.query(
      `SELECT to_regclass('public.auth_sessions') AS table_name`
    );

    if (authSessionsResult.rows[0].table_name) {
      await client.query(
        `UPDATE auth_sessions
         SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP)
         WHERE user_id = $1`,
        [userId]
      );
    }

    await client.query("COMMIT");

    console.log("Platform Administrator provisioned successfully.");
    console.log("Account:", email);
    console.log("Account created:", accountCreated ? "yes" : "no");
    console.log(
      "Role assigned:",
      assignmentResult.rowCount > 0 ? "yes" : "already assigned"
    );
  } catch (error) {
    if (client) {
      await client.query("ROLLBACK").catch(() => {});
    }

    console.error(
      "Platform Administrator provisioning failed:",
      error.message
    );
    process.exitCode = 1;
  } finally {
    client?.release();
    await pool.end();
  }
}

provisionSuperAdmin();
