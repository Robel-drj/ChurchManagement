import bcrypt from "bcrypt";
import { pool } from "../../config/database.js";
import { getPhoneLookupKey } from "../../utils/phone.js";
import {
  PLATFORM_ADMIN_ROLE_CONFLICT_MESSAGE,
  userHasPlatformAdminRole,
} from "../../utils/platformAccess.js";

export async function registerChurchMember(churchId, input) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Confirm that the church is still active.
    const churchResult = await client.query(
      `SELECT id
       FROM churches
       WHERE id = $1 AND status = 'active'
       FOR SHARE`,
      [churchId]
    );

    if (churchResult.rowCount === 0) {
      const error = new Error("Church not found or not active.");
      error.statusCode = 403;
      throw error;
    }

    // Find an existing account using either local or international phone form.
    const phoneLookupKey = getPhoneLookupKey(input.phone);
    const userResult = await client.query(
      `SELECT id, full_name, phone, email, password_hash, account_status
       FROM users
       WHERE phone = $1
          OR (
            $2::text IS NOT NULL
            AND RIGHT(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), 9) = $2
          )
       LIMIT 2
       FOR UPDATE`,
      [input.phone, phoneLookupKey]
    );

    if (userResult.rowCount > 1) {
      const error = new Error(
        "Multiple accounts use equivalent phone numbers. Contact the platform administrator."
      );
      error.statusCode = 409;
      throw error;
    }

    let user;
    let isNewUser = false;

    if (userResult.rowCount > 0) {
      user = userResult.rows[0];

      if (user.account_status !== "active") {
        const error = new Error("This user account is disabled.");
        error.statusCode = 403;
        throw error;
      }

      if (await userHasPlatformAdminRole(client, user.id)) {
        const error = new Error(
          PLATFORM_ADMIN_ROLE_CONFLICT_MESSAGE
        );
        error.statusCode = 409;
        throw error;
      }

      // Existing account owner must verify their password.
      const passwordMatches = await bcrypt.compare(
        input.password,
        user.password_hash
      );

      if (!passwordMatches) {
        const error = new Error(
          "The existing account password could not be verified."
        );
        error.statusCode = 401;
        throw error;
      }

      // Do not silently change existing account details.
      if (user.full_name.trim().toLowerCase() !==
          input.full_name.trim().toLowerCase()) {
        const error = new Error(
          "The supplied name does not match the existing account."
        );
        error.statusCode = 409;
        throw error;
      }

      if (
        input.email &&
        user.email &&
        input.email.toLowerCase() !== user.email.toLowerCase()
      ) {
        const error = new Error(
          "The supplied email does not match the existing account."
        );
        error.statusCode = 409;
        throw error;
      }
    } else {
      // Avoid creating a new account with an email already in use.
      if (input.email) {
        const emailResult = await client.query(
          `SELECT id
           FROM users
           WHERE LOWER(email) = LOWER($1)
           LIMIT 1`,
          [input.email]
        );

        if (emailResult.rowCount > 0) {
          const error = new Error(
            "This email is already associated with another account."
          );
          error.statusCode = 409;
          throw error;
        }
      }

      const rounds = Number(process.env.BCRYPT_ROUNDS) || 12;
      const passwordHash = await bcrypt.hash(input.password, rounds);

      const newUserResult = await client.query(
        `INSERT INTO users (
           full_name,
           phone,
           email,
           password_hash
         )
         VALUES ($1, $2, $3, $4)
         RETURNING id, full_name, phone, email, account_status`,
        [
          input.full_name,
          input.phone,
          input.email || null,
          passwordHash,
        ]
      );

      user = newUserResult.rows[0];
      isNewUser = true;
    }

    // Prevent duplicate membership in the same church.
    const membershipResult = await client.query(
      `INSERT INTO church_memberships (
         user_id,
         church_id,
         membership_status
       )
       VALUES ($1, $2, 'active')
       ON CONFLICT (user_id, church_id) DO NOTHING
       RETURNING id, membership_status, joined_at`,
      [user.id, churchId]
    );

    if (membershipResult.rowCount === 0) {
      const error = new Error(
        "This person is already registered in this church."
      );
      error.statusCode = 409;
      throw error;
    }

    const membership = membershipResult.rows[0];

    // Find the preconfigured member role for this church.
    const roleResult = await client.query(
      `SELECT id
       FROM church_roles
       WHERE church_id = $1
         AND role_name = 'member'
       LIMIT 1`,
      [churchId]
    );

    if (roleResult.rowCount === 0) {
      const error = new Error(
        "The member role has not been configured for this church."
      );
      error.statusCode = 500;
      throw error;
    }

    // Assign the member role.
    await client.query(
      `INSERT INTO membership_roles (
         membership_id,
         church_id,
         role_id
       )
       VALUES ($1, $2, $3)
       ON CONFLICT (membership_id, role_id) DO NOTHING`,
      [membership.id, churchId, roleResult.rows[0].id]
    );

    // Create the member's profile.
    const profileResult = await client.query(
      `INSERT INTO member_profiles (
         membership_id,
         gender,
         date_of_birth,
         address,
         emergency_contact,
         profile_image
       )
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, gender, date_of_birth, address,
                 emergency_contact, profile_image`,
      [
        membership.id,
        input.gender ?? null,
        input.date_of_birth ?? null,
        input.address ?? null,
        input.emergency_contact ?? null,
        input.profile_image ?? null,
      ]
    );

    await client.query("COMMIT");

    return {
      user: {
        id: user.id,
        full_name: user.full_name,
        phone: user.phone,
        email: user.email,
      },
      membership,
      profile: profileResult.rows[0],
      account_created: isNewUser,
    };
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      const conflict = new Error(
        "A user or membership with these details already exists."
      );
      conflict.statusCode = 409;
      throw conflict;
    }

    throw error;
  } finally {
    client.release();
  }
}
export async function listChurchMembers(churchId, options) {
  const { page, limit, search } = options;
  const offset = (page - 1) * limit;
  const searchTerm = search ? `%${search}%` : null;

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM church_memberships cm
     JOIN users u ON u.id = cm.user_id
     WHERE cm.church_id = $1
       AND (
         $2::text IS NULL
         OR u.full_name ILIKE $2
         OR u.phone ILIKE $2
         OR COALESCE(u.email, '') ILIKE $2
         OR COALESCE(cm.member_number, '') ILIKE $2
       )`,
    [churchId, searchTerm]
  );

  const membersResult = await pool.query(
    `SELECT
       cm.id AS membership_id,
       cm.member_number,
       cm.membership_status,
       cm.joined_at,
       u.id AS user_id,
       u.full_name,
       u.phone,
       u.email,
       mp.gender,
       mp.date_of_birth,
       mp.address,
       mp.emergency_contact,
       mp.profile_image,
       COALESCE(
         ARRAY_AGG(DISTINCT cr.role_name)
           FILTER (WHERE cr.role_name IS NOT NULL),
         ARRAY[]::varchar[]
       ) AS roles
     FROM church_memberships cm
     JOIN users u ON u.id = cm.user_id
     LEFT JOIN member_profiles mp
       ON mp.membership_id = cm.id
     LEFT JOIN membership_roles mr
       ON mr.membership_id = cm.id
      AND mr.church_id = cm.church_id
     LEFT JOIN church_roles cr
       ON cr.id = mr.role_id
      AND cr.church_id = mr.church_id
     WHERE cm.church_id = $1
       AND (
         $2::text IS NULL
         OR u.full_name ILIKE $2
         OR u.phone ILIKE $2
         OR COALESCE(u.email, '') ILIKE $2
         OR COALESCE(cm.member_number, '') ILIKE $2
       )
     GROUP BY cm.id, u.id, mp.id
     ORDER BY cm.joined_at DESC, cm.id
     LIMIT $3 OFFSET $4`,
    [churchId, searchTerm, limit, offset]
  );

  const total = countResult.rows[0].total;

  return {
    members: membersResult.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getChurchMemberDetails(churchId, membershipId) {
  const result = await pool.query(
    `SELECT
       cm.id AS membership_id,
       cm.member_number,
       cm.membership_status,
       cm.joined_at,
       cm.created_at AS membership_created_at,
       u.id AS user_id,
       u.full_name,
       u.phone,
       u.email,
       u.account_status,
       mp.id AS profile_id,
       mp.gender,
       mp.date_of_birth,
       mp.address,
       mp.emergency_contact,
       mp.profile_image,
       mp.created_at AS profile_created_at,
       mp.updated_at AS profile_updated_at,
       COALESCE(
         ARRAY_AGG(DISTINCT cr.role_name)
           FILTER (WHERE cr.role_name IS NOT NULL),
         ARRAY[]::varchar[]
       ) AS roles
     FROM church_memberships cm
     JOIN users u ON u.id = cm.user_id
     LEFT JOIN member_profiles mp
       ON mp.membership_id = cm.id
     LEFT JOIN membership_roles mr
       ON mr.membership_id = cm.id
      AND mr.church_id = cm.church_id
     LEFT JOIN church_roles cr
       ON cr.id = mr.role_id
      AND cr.church_id = mr.church_id
     WHERE cm.church_id = $1
       AND cm.id = $2
     GROUP BY cm.id, u.id, mp.id`,
    [churchId, membershipId]
  );

  if (result.rowCount === 0) {
    const error = new Error("Member not found in this church.");
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
}
export async function updateChurchMemberProfile(
  churchId,
  membershipId,
  updates
) {
  // Verify that this membership belongs to the selected church.
  const membershipResult = await pool.query(
    `SELECT id
     FROM church_memberships
     WHERE id = $1 AND church_id = $2`,
    [membershipId, churchId]
  );

  if (membershipResult.rowCount === 0) {
    const error = new Error("Member not found in this church.");
    error.statusCode = 404;
    throw error;
  }

  // The unique membership_id constraint allows a safe upsert.
  const result = await pool.query(
    `INSERT INTO member_profiles (
       membership_id,
       gender,
       date_of_birth,
       address,
       emergency_contact,
       profile_image
     )
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (membership_id)
     DO UPDATE SET
       gender = CASE WHEN $7 THEN EXCLUDED.gender
                     ELSE member_profiles.gender END,
       date_of_birth = CASE WHEN $8 THEN EXCLUDED.date_of_birth
                            ELSE member_profiles.date_of_birth END,
       address = CASE WHEN $9 THEN EXCLUDED.address
                      ELSE member_profiles.address END,
       emergency_contact = CASE WHEN $10 THEN EXCLUDED.emergency_contact
                                ELSE member_profiles.emergency_contact END,
       profile_image = CASE WHEN $11 THEN EXCLUDED.profile_image
                            ELSE member_profiles.profile_image END,
       updated_at = CURRENT_TIMESTAMP
     RETURNING
       id,
       membership_id,
       gender,
       date_of_birth,
       address,
       emergency_contact,
       profile_image,
       created_at,
       updated_at`,
    [
      membershipId,
      updates.gender ?? null,
      updates.date_of_birth ?? null,
      updates.address ?? null,
      updates.emergency_contact ?? null,
      updates.profile_image ?? null,
      Object.hasOwn(updates, "gender"),
      Object.hasOwn(updates, "date_of_birth"),
      Object.hasOwn(updates, "address"),
      Object.hasOwn(updates, "emergency_contact"),
      Object.hasOwn(updates, "profile_image"),
    ]
  );

  return result.rows[0];
}

export async function updateChurchMembershipStatus(
  churchId,
  membershipId,
  newStatus
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const membershipResult = await client.query(
       `SELECT
          cm.id,
          cm.user_id,
          cm.membership_status,
         EXISTS (
           SELECT 1
           FROM membership_roles mr
           JOIN church_roles cr
             ON cr.id = mr.role_id
            AND cr.church_id = mr.church_id
           WHERE mr.membership_id = cm.id
             AND mr.church_id = cm.church_id
             AND cr.role_name = 'church_admin'
         ) AS is_church_admin
       FROM church_memberships cm
       WHERE cm.id = $1
         AND cm.church_id = $2
       FOR UPDATE`,
      [membershipId, churchId]
    );

    if (membershipResult.rowCount === 0) {
      const error = new Error("Member not found in this church.");
      error.statusCode = 404;
      throw error;
    }

    const membership = membershipResult.rows[0];

    if (
      newStatus === "active" &&
      await userHasPlatformAdminRole(client, membership.user_id)
    ) {
      const error = new Error(
        PLATFORM_ADMIN_ROLE_CONFLICT_MESSAGE
      );
      error.statusCode = 409;
      throw error;
    }

    if (
      newStatus === "suspended" &&
      membership.membership_status === "active" &&
      membership.is_church_admin
    ) {
      // Lock the church row to serialize administrator suspension checks.
      await client.query(
        `SELECT id FROM churches WHERE id = $1 FOR UPDATE`,
        [churchId]
      );

      const otherAdminsResult = await client.query(
        `SELECT COUNT(DISTINCT cm.id)::int AS total
         FROM church_memberships cm
         JOIN membership_roles mr
           ON mr.membership_id = cm.id
          AND mr.church_id = cm.church_id
         JOIN church_roles cr
           ON cr.id = mr.role_id
          AND cr.church_id = mr.church_id
         WHERE cm.church_id = $1
           AND cm.membership_status = 'active'
           AND cr.role_name = 'church_admin'
           AND cm.id <> $2`,
        [churchId, membershipId]
      );

      if (otherAdminsResult.rows[0].total === 0) {
        const error = new Error(
          "Cannot suspend the last active Church Admin."
        );
        error.statusCode = 409;
        throw error;
      }
    }

    const updateResult = await client.query(
      `UPDATE church_memberships
       SET membership_status = $1
       WHERE id = $2 AND church_id = $3
       RETURNING id, membership_status, joined_at`,
      [newStatus, membershipId, churchId]
    );

    await client.query("COMMIT");

    return updateResult.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
