
import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { pool } from "../../config/database.js";
import { getPhoneLookupKey } from "../../utils/phone.js";
import {
  getPermittedChurchMemberships,
} from "../../utils/platformAccess.js";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const ACCESS_TTL = process.env.JWT_ACCESS_TTL || "15m";
const REFRESH_DAYS = Number(process.env.REFRESH_TOKEN_DAYS || 30);
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 12);

if (!ACCESS_SECRET || ACCESS_SECRET.length < 32) {
  throw new Error("JWT_ACCESS_SECRET must be at least 32 characters.");
}

function createAccessToken(user) {
  return jwt.sign(
    { sub: user.id },
    ACCESS_SECRET,
    { expiresIn: ACCESS_TTL }
  );
}

function createRefreshToken() {
  return crypto.randomBytes(48).toString("hex");
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function publicUser(user) {
  return {
    id: user.id,
    fullName: user.full_name,
    phone: user.phone,
    email: user.email,
    accountStatus: user.account_status,
    createdAt: user.created_at,
  };
}

// Retrieves platform roles and active church memberships for a user.
async function getUserAccessContext(client, userId) {
  const [platformResult, membershipResult] = await Promise.all([
    client.query(
      `SELECT pr.role_name
       FROM user_platform_roles upr
       JOIN platform_roles pr ON pr.id = upr.role_id
       WHERE upr.user_id = $1
       ORDER BY pr.role_name`,
      [userId]
    ),

    client.query(
      `SELECT
         cm.id AS membership_id,
         cm.church_id,
         cm.member_number,
         cm.membership_status,
         c.church_name,
         c.church_code,
         c.logo_url,
         c.status AS church_status,
         cr.role_name
       FROM church_memberships cm
       JOIN churches c
         ON c.id = cm.church_id
       LEFT JOIN membership_roles mr
         ON mr.membership_id = cm.id
        AND mr.church_id = cm.church_id
       LEFT JOIN church_roles cr
         ON cr.id = mr.role_id
        AND cr.church_id = cm.church_id
       WHERE cm.user_id = $1
         AND cm.membership_status = 'active'
         AND c.status = 'active'
       ORDER BY c.church_name, cr.role_name`,
      [userId]
    ),
  ]);

  const membershipsMap = new Map();

  for (const row of membershipResult.rows) {
    if (!membershipsMap.has(row.membership_id)) {
      membershipsMap.set(row.membership_id, {
        membershipId: row.membership_id,
        churchId: row.church_id,
        memberNumber: row.member_number,
        membershipStatus: row.membership_status,
        church: {
          id: row.church_id,
          name: row.church_name,
          code: row.church_code,
          logoUrl: row.logo_url,
          status: row.church_status,
        },
        roles: [],
      });
    }

    const membership = membershipsMap.get(row.membership_id);

    if (row.role_name && !membership.roles.includes(row.role_name)) {
      membership.roles.push(row.role_name);
    }
  }

  const platformRoles = platformResult.rows.map((row) => row.role_name);
  const memberships = Array.from(membershipsMap.values());

  return {
    platformRoles,
    memberships: getPermittedChurchMemberships(
      platformRoles,
      memberships
    ),
  };
}

async function createSession(client, userId) {
  const refreshToken = createRefreshToken();
  const tokenHash = hashToken(refreshToken);

  const expiresAt = new Date(
    Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000
  );

  await client.query(
    `INSERT INTO auth_sessions
      (user_id, refresh_token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt]
  );

  return refreshToken;
}

export async function register(data) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const email = data.email?.trim() || null;
    const phoneLookupKey = getPhoneLookupKey(data.phone);
    const existingUserResult = await client.query(
      `SELECT id
       FROM users
       WHERE phone = $1
          OR ($2::text IS NOT NULL AND LOWER(email) = LOWER($2))
          OR (
            $3::text IS NOT NULL
            AND RIGHT(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), 9) = $3
          )
       LIMIT 1`,
      [data.phone, email, phoneLookupKey]
    );

    if (existingUserResult.rowCount > 0) {
      throw new Error("That phone number or email is already registered.");
    }

    const passwordHash = await bcrypt.hash(
      data.password,
      BCRYPT_ROUNDS
    );

    const result = await client.query(
      `INSERT INTO users
        (full_name, phone, email, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, full_name, phone, email,
                 account_status, created_at`,
      [data.fullName, data.phone, email, passwordHash]
    );

    const user = result.rows[0];

    if (user.account_status !== "active") {
      throw new Error("Your account is not active.");
    }

    const refreshToken = await createSession(client, user.id);
    const accessToken = createAccessToken(user);
    const accessContext = await getUserAccessContext(client, user.id);

    await client.query("COMMIT");

    return {
      user: {
        ...publicUser(user),
        ...accessContext,
      },
      accessToken,
      refreshToken,
    };
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      throw new Error("That phone number or email is already registered.");
    }

    throw error;
  } finally {
    client.release();
  }
}

export async function login(identifier, password) {
  const phoneLookupKey = identifier.includes("@")
    ? null
    : getPhoneLookupKey(identifier);

  const result = await pool.query(
    `SELECT DISTINCT
            u.id, u.full_name, u.phone, u.email, u.password_hash,
            u.account_status, u.created_at
     FROM users u
     LEFT JOIN church_memberships cm
       ON cm.user_id = u.id
      AND cm.membership_status = 'active'
     WHERE u.phone = $1
        OR LOWER(u.email) = LOWER($1)
        OR (
          $2::text IS NOT NULL
          AND RIGHT(REGEXP_REPLACE(u.phone, '[^0-9]', '', 'g'), 9) = $2
        )
        OR LOWER(cm.member_number) = LOWER($1)
     LIMIT 2`,
    [identifier, phoneLookupKey]
  );

  if (result.rowCount !== 1) {
    const error = new Error(
      "Invalid phone, email, member number, or password."
    );
    error.statusCode = 401;
    throw error;
  }

  const user = result.rows[0];

  const passwordMatches = await bcrypt.compare(
    password,
    user.password_hash
  );

  if (!passwordMatches) {
    const error = new Error(
      "Invalid phone, email, member number, or password."
    );
    error.statusCode = 401;
    throw error;
  }

  if (user.account_status !== "active") {
    const error = new Error("Your account is disabled.");
    error.statusCode = 403;
    throw error;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const refreshToken = await createSession(client, user.id);
    const accessToken = createAccessToken(user);
    const accessContext = await getUserAccessContext(client, user.id);

    await client.query("COMMIT");

    return {
      user: {
        ...publicUser(user),
        ...accessContext,
      },
      accessToken,
      refreshToken,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function refresh(refreshToken) {
  if (!refreshToken || typeof refreshToken !== "string") {
    throw new Error("Refresh token is required.");
  }

  const oldHash = hashToken(refreshToken);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `SELECT s.id AS session_id, s.user_id, u.id,
              u.full_name, u.phone, u.email,
              u.account_status, u.created_at
       FROM auth_sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.refresh_token_hash = $1
         AND s.revoked_at IS NULL
         AND s.expires_at > NOW()
       FOR UPDATE OF s`,
      [oldHash]
    );

    const user = result.rows[0];

    if (!user || user.account_status !== "active") {
      throw new Error("Invalid or expired refresh token.");
    }

    await client.query(
      `UPDATE auth_sessions
       SET revoked_at = NOW()
       WHERE id = $1`,
      [user.session_id]
    );

    const newRefreshToken = await createSession(
      client,
      user.user_id
    );

    const accessToken = createAccessToken(user);
    const accessContext = await getUserAccessContext(
      client,
      user.user_id
    );

    await client.query("COMMIT");

    return {
      user: {
        ...publicUser(user),
        ...accessContext,
      },
      accessToken,
      refreshToken: newRefreshToken,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function logout(refreshToken) {
  if (!refreshToken || typeof refreshToken !== "string") {
    return { message: "Logged out successfully." };
  }

  const tokenHash = hashToken(refreshToken);

  await pool.query(
    `UPDATE auth_sessions
     SET revoked_at = NOW()
     WHERE refresh_token_hash = $1
       AND revoked_at IS NULL`,
    [tokenHash]
  );

  return { message: "Logged out successfully." };
}

export async function getCurrentUser(userId) {
  const result = await pool.query(
    `SELECT id, full_name, phone, email,
            account_status, created_at
     FROM users
     WHERE id = $1`,
    [userId]
  );

  const user = result.rows[0];

  if (!user || user.account_status !== "active") {
    throw new Error("User not found or account disabled.");
  }

  const accessContext = await getUserAccessContext(pool, userId);

  return {
    ...publicUser(user),
    ...accessContext,
  };
}
