
import { randomBytes, createHash } from "node:crypto";
import { pool } from "../../config/database.js";
import bcrypt from "bcrypt";
import { writeAudit } from "../../utils/audit.js";
import {
  getPhoneLookupKey,
  phonesMatch,
} from "../../utils/phone.js";
import {
  PLATFORM_ADMIN_ROLE,
  PLATFORM_ADMIN_ROLE_CONFLICT_MESSAGE,
  userHasPlatformAdminRole,
} from "../../utils/platformAccess.js";

function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

async function invitedContactBelongsToPlatformAdmin(
  queryable,
  email,
  phone
) {
  const phoneLookupKey = getPhoneLookupKey(phone);
  const result = await queryable.query(
    `SELECT 1
     FROM users u
     JOIN user_platform_roles upr ON upr.user_id = u.id
     JOIN platform_roles pr ON pr.id = upr.role_id
     WHERE pr.role_name = $4
       AND (
         ($1::text IS NOT NULL AND LOWER(u.email) = $1)
         OR (
           $2::text IS NOT NULL
           AND (
             u.phone = $2
             OR (
               $3::text IS NOT NULL
               AND RIGHT(
                 REGEXP_REPLACE(u.phone, '[^0-9]', '', 'g'),
                 9
               ) = $3
             )
           )
         )
       )
     LIMIT 1`,
    [email, phone, phoneLookupKey, PLATFORM_ADMIN_ROLE]
  );

  return result.rowCount > 0;
}

export async function createChurchAdminInvitation({
  churchId,
  invitedEmail,
  invitedPhone,
  invitedBy,
  ipAddress = null,
}) {
  const email = invitedEmail?.trim().toLowerCase() || null;
  const phone = invitedPhone?.trim() || null;

  if (!email && !phone) {
    throw createHttpError(
      "An email address or phone number is required."
    );
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const churchResult = await client.query(
      `SELECT id, church_name, status
       FROM churches
       WHERE id = $1`,
      [churchId]
    );

    const church = churchResult.rows[0];

    if (!church) {
      throw createHttpError("Church not found.", 404);
    }

    if (church.status === "suspended") {
      throw createHttpError(
        "You cannot invite a Church Admin for a suspended church.",
        409
      );
    }

    if (
      await invitedContactBelongsToPlatformAdmin(
        client,
        email,
        phone
      )
    ) {
      throw createHttpError(
        PLATFORM_ADMIN_ROLE_CONFLICT_MESSAGE,
        409
      );
    }

    const roleResult = await client.query(
      `SELECT id
       FROM church_roles
       WHERE church_id = $1
         AND role_name = 'church_admin'
       LIMIT 1`,
      [churchId]
    );

    const churchAdminRole = roleResult.rows[0];

    if (!churchAdminRole) {
      throw createHttpError(
        "The church_admin role has not been configured for this church.",
        409
      );
    }

    await client.query(
      `UPDATE church_admin_invitations
       SET status = 'expired'
       WHERE church_id = $1
         AND status = 'pending'
         AND expires_at <= CURRENT_TIMESTAMP`,
      [churchId]
    );

    const duplicateResult = await client.query(
      `SELECT id
       FROM church_admin_invitations
       WHERE church_id = $1
         AND status = 'pending'
         AND expires_at > CURRENT_TIMESTAMP
         AND (
           ($2::varchar IS NOT NULL AND LOWER(invited_email) = $2)
           OR
           ($3::varchar IS NOT NULL AND invited_phone = $3)
         )
       LIMIT 1`,
      [churchId, email, phone]
    );

    if (duplicateResult.rowCount > 0) {
      throw createHttpError(
        "A pending invitation already exists for this email or phone number.",
        409
      );
    }

    // Generate a secure token. Only its hash is stored.
    const invitationToken = randomBytes(32).toString("hex");
    const tokenHash = hashToken(invitationToken);

    const invitationResult = await client.query(
      `INSERT INTO church_admin_invitations (
         church_id,
         role_id,
         invited_email,
         invited_phone,
         token_hash,
         invited_by,
         status,
         expires_at
       )
       VALUES (
         $1, $2, $3, $4, $5, $6, 'pending',
         CURRENT_TIMESTAMP + INTERVAL '7 days'
       )
       RETURNING id, church_id, invited_email, invited_phone,
                 status, expires_at, created_at`,
      [
        churchId,
        churchAdminRole.id,
        email,
        phone,
        tokenHash,
        invitedBy,
      ]
    );

    const invitation = invitationResult.rows[0];

    await writeAudit(client, {
      churchId,
      userId: invitedBy,
      action: "invitation.created",
      entityType: "church_admin_invitation",
      entityId: invitation.id,
      details: {
        role: "church_admin",
        invitedByEmail: Boolean(email),
        invitedByPhone: Boolean(phone),
      },
      ipAddress,
    });

    await client.query("COMMIT");

    return {
      churchName: church.church_name,
      invitation,
      invitationToken,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getChurchAdminInvitationDetails(invitationToken) {
  const tokenHash = hashToken(invitationToken);

  const invitationResult = await pool.query(
    `SELECT
       i.id,
       i.invited_email,
       i.invited_phone,
       i.status,
       i.expires_at,
       c.id AS church_id,
       c.church_name,
       c.status AS church_status,
       cr.role_name
     FROM church_admin_invitations i
     JOIN churches c ON c.id = i.church_id
     JOIN church_roles cr
       ON cr.id = i.role_id
      AND cr.church_id = i.church_id
     WHERE i.token_hash = $1
     LIMIT 1`,
    [tokenHash]
  );

  const invitation = invitationResult.rows[0];

  if (!invitation) {
    throw createHttpError("Invalid invitation token.", 404);
  }

  if (invitation.status !== "pending") {
    throw createHttpError(
      `This invitation is ${invitation.status}.`,
      409
    );
  }

  if (new Date(invitation.expires_at) <= new Date()) {
    await pool.query(
      `UPDATE church_admin_invitations
       SET status = 'expired'
       WHERE id = $1
         AND status = 'pending'`,
      [invitation.id]
    );

    throw createHttpError("This invitation has expired.", 410);
  }

  if (invitation.church_status === "suspended") {
    throw createHttpError(
      "This church is currently suspended.",
      409
    );
  }

  if (invitation.role_name !== "church_admin") {
    throw createHttpError(
      "This invitation is not for a Church Admin role.",
      403
    );
  }

  const invitedPhoneLookupKey = getPhoneLookupKey(
    invitation.invited_phone
  );
  const existingUserResult = await pool.query(
    `SELECT id, email, phone, account_status
     FROM users
     WHERE (
       $1::varchar IS NOT NULL
       AND LOWER(email) = $1
     )
     OR (
       $2::varchar IS NOT NULL
       AND (
         phone = $2
         OR (
           $3::text IS NOT NULL
           AND RIGHT(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), 9) = $3
         )
       )
     )`,
    [
      invitation.invited_email,
      invitation.invited_phone,
      invitedPhoneLookupKey,
    ]
  );

  if (existingUserResult.rows.length > 1) {
    throw createHttpError(
      "The invited email and phone belong to different accounts. Contact the platform administrator.",
      409
    );
  }

  const existingUser = existingUserResult.rows[0];

  if (existingUser) {
    if (await userHasPlatformAdminRole(pool, existingUser.id)) {
      throw createHttpError(
        PLATFORM_ADMIN_ROLE_CONFLICT_MESSAGE,
        409
      );
    }

    if (
      invitation.invited_email &&
      existingUser.email?.toLowerCase() !==
        invitation.invited_email.toLowerCase()
    ) {
      throw createHttpError(
        "The account email does not match the invitation.",
        409
      );
    }

    if (
      invitation.invited_phone &&
      !phonesMatch(existingUser.phone, invitation.invited_phone)
    ) {
      throw createHttpError(
        "The account phone does not match the invitation.",
        409
      );
    }

    if (existingUser.account_status !== "active") {
      throw createHttpError(
        "This account is disabled. Contact the platform administrator.",
        403
      );
    }
  }

  return {
    church: {
      id: invitation.church_id,
      name: invitation.church_name,
    },
    invitedEmail: invitation.invited_email,
    invitedPhone: invitation.invited_phone,
    expiresAt: invitation.expires_at,
    accountExists: Boolean(existingUser),
  };
}

export async function listChurchAdminInvitations(churchId) {
  await pool.query(
    `UPDATE church_admin_invitations
     SET status = 'expired'
     WHERE church_id = $1
       AND status = 'pending'
       AND expires_at <= CURRENT_TIMESTAMP`,
    [churchId]
  );

  const result = await pool.query(
    `SELECT
       i.id,
       i.church_id,
       c.church_name,
       i.invited_email,
       i.invited_phone,
       i.status,
       i.expires_at,
       i.accepted_at,
       i.created_at,
       u.full_name AS invited_by_name,
       cr.role_name
     FROM church_admin_invitations i
     JOIN churches c ON c.id = i.church_id
     JOIN users u ON u.id = i.invited_by
     JOIN church_roles cr
       ON cr.id = i.role_id
      AND cr.church_id = i.church_id
     WHERE i.church_id = $1
     ORDER BY i.created_at DESC`,
    [churchId]
  );

  return result.rows;
}

export async function regenerateChurchAdminInvitation({
  churchId,
  invitationId,
}) {
  const client = await pool.connect();
  let transactionFinished = false;

  try {
    await client.query("BEGIN");

    const invitationResult = await client.query(
      `SELECT
         i.id,
         i.status,
         i.expires_at,
         c.church_name,
         c.status AS church_status
       FROM church_admin_invitations i
       JOIN churches c ON c.id = i.church_id
       WHERE i.id = $1
         AND i.church_id = $2
       FOR UPDATE OF i`,
      [invitationId, churchId]
    );

    const invitation = invitationResult.rows[0];

    if (!invitation) {
      throw createHttpError("Invitation not found.", 404);
    }

    if (invitation.status !== "pending") {
      throw createHttpError(
        `This invitation is ${invitation.status} and cannot be regenerated.`,
        409
      );
    }

    if (new Date(invitation.expires_at) <= new Date()) {
      await client.query(
        `UPDATE church_admin_invitations
         SET status = 'expired'
         WHERE id = $1`,
        [invitation.id]
      );

      await client.query("COMMIT");
      transactionFinished = true;

      throw createHttpError(
        "This invitation has expired. Create a new invitation instead.",
        410
      );
    }

    if (invitation.church_status === "suspended") {
      throw createHttpError(
        "You cannot regenerate an invitation for a suspended church.",
        409
      );
    }

    const invitationToken = randomBytes(32).toString("hex");
    const tokenHash = hashToken(invitationToken);

    const updatedResult = await client.query(
      `UPDATE church_admin_invitations
       SET token_hash = $1,
           expires_at = CURRENT_TIMESTAMP + INTERVAL '7 days'
       WHERE id = $2
       RETURNING id, church_id, invited_email, invited_phone,
                 status, expires_at, created_at`,
      [tokenHash, invitation.id]
    );

    await client.query("COMMIT");
    transactionFinished = true;

    return {
      churchName: invitation.church_name,
      invitation: updatedResult.rows[0],
      invitationToken,
    };
  } catch (error) {
    if (!transactionFinished) {
      await client.query("ROLLBACK");
    }

    throw error;
  } finally {
    client.release();
  }
}

export async function revokeChurchAdminInvitation({
  churchId,
  invitationId,
  revokedBy,
  ipAddress = null,
}) {
  const client = await pool.connect();
  let transactionFinished = false;

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `UPDATE church_admin_invitations
       SET status = CASE
         WHEN expires_at <= CURRENT_TIMESTAMP THEN 'expired'
         ELSE 'revoked'
       END
       WHERE id = $1
         AND church_id = $2
         AND status = 'pending'
       RETURNING id, church_id, status`,
      [invitationId, churchId]
    );

    if (result.rowCount === 0) {
      throw createHttpError(
        "Pending invitation not found. It may already be accepted, expired, or revoked.",
        404
      );
    }

    const invitation = result.rows[0];

    if (invitation.status === "expired") {
      await client.query("COMMIT");
      transactionFinished = true;

      throw createHttpError(
        "This invitation has already expired.",
        409
      );
    }

    await writeAudit(client, {
      churchId,
      userId: revokedBy,
      action: "invitation.revoked",
      entityType: "church_admin_invitation",
      entityId: invitation.id,
      details: {
        status: invitation.status,
      },
      ipAddress,
    });

    await client.query("COMMIT");
    transactionFinished = true;

    return invitation;
  } catch (error) {
    if (!transactionFinished) {
      await client.query("ROLLBACK");
    }

    throw error;
  } finally {
    client.release();
  }
}
export async function acceptChurchAdminInvitation({
  invitationToken,
  fullName,
  email,
  phone,
  password,
}) {
  const tokenHash = hashToken(invitationToken);

  const normalizedEmail = email?.trim().toLowerCase() || null;
  const normalizedPhone = phone?.trim() || null;
  const normalizedName = fullName?.trim() || null;

  const client = await pool.connect();
  let transactionFinished = false;

  try {
    await client.query("BEGIN");

    // 1. Find and lock the invitation.
    const invitationResult = await client.query(
      `SELECT
         i.id,
         i.church_id,
         i.role_id,
         i.invited_email,
         i.invited_phone,
         i.status,
         i.expires_at,
         i.invited_by,
         c.church_name,
         c.status AS church_status,
         cr.role_name
       FROM church_admin_invitations i
       JOIN churches c ON c.id = i.church_id
       JOIN church_roles cr
         ON cr.id = i.role_id
        AND cr.church_id = i.church_id
       WHERE i.token_hash = $1
       FOR UPDATE OF i`,
      [tokenHash]
    );

    const invitation = invitationResult.rows[0];

    if (!invitation) {
      throw createHttpError("Invalid invitation token.", 404);
    }

    if (invitation.status !== "pending") {
      throw createHttpError(
        `This invitation is ${invitation.status}.`,
        409
      );
    }

    // 2. Expire an outdated invitation.
    if (new Date(invitation.expires_at) <= new Date()) {
      await client.query(
        `UPDATE church_admin_invitations
         SET status = 'expired'
         WHERE id = $1`,
        [invitation.id]
      );

      await client.query("COMMIT");
      transactionFinished = true;

      throw createHttpError("This invitation has expired.", 410);
    }

    if (invitation.church_status === "suspended") {
      throw createHttpError(
        "This church is currently suspended.",
        409
      );
    }

    if (invitation.role_name !== "church_admin") {
      throw createHttpError(
        "This invitation is not for a Church Admin role.",
        403
      );
    }

    // 3. Find an existing account using the invited contact details.
    const invitedPhoneLookupKey = getPhoneLookupKey(
      invitation.invited_phone
    );
    const existingUserResult = await client.query(
      `SELECT id, full_name, email, phone,
              password_hash, account_status
       FROM users
       WHERE (
         $1::varchar IS NOT NULL
         AND LOWER(email) = $1
       )
        OR (
          $2::varchar IS NOT NULL
          AND (
            phone = $2
            OR (
              $3::text IS NOT NULL
              AND RIGHT(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), 9) = $3
            )
          )
        )
       FOR UPDATE`,
      [
        invitation.invited_email,
        invitation.invited_phone,
        invitedPhoneLookupKey,
      ]
    );

    if (existingUserResult.rows.length > 1) {
      throw createHttpError(
        "The invited email and phone belong to different accounts. Contact the platform administrator.",
        409
      );
    }

    let user;

    if (existingUserResult.rows.length === 1) {
      // 4A. Existing account: verify its password.
      user = existingUserResult.rows[0];

      if (await userHasPlatformAdminRole(client, user.id)) {
        throw createHttpError(
          PLATFORM_ADMIN_ROLE_CONFLICT_MESSAGE,
          409
        );
      }

      if (user.account_status !== "active") {
        throw createHttpError(
          "This account is disabled. Contact the platform administrator.",
          403
        );
      }

      if (
        invitation.invited_email &&
        user.email?.toLowerCase() !== invitation.invited_email.toLowerCase()
      ) {
        throw createHttpError(
          "The account email does not match the invitation.",
          403
        );
      }

      if (
        invitation.invited_phone &&
        !phonesMatch(user.phone, invitation.invited_phone)
      ) {
        throw createHttpError(
          "The account phone does not match the invitation.",
          403
        );
      }

      if (!password) {
        throw createHttpError(
          "Your existing account password is required.",
          400
        );
      }

      const passwordMatches = await bcrypt.compare(
        password,
        user.password_hash
      );

      if (!passwordMatches) {
        throw createHttpError(
          "Incorrect account password.",
          401
        );
      }
    } else {
      // 4B. New account: require the invited contact details.
      if (!normalizedName || normalizedName.length < 2) {
        throw createHttpError(
          "Full name must contain at least 2 characters."
        );
      }

      if (!normalizedPhone) {
        throw createHttpError(
          "Phone number is required."
        );
      }

      if (invitation.invited_email) {
        if (
          normalizedEmail !== invitation.invited_email.toLowerCase()
        ) {
          throw createHttpError(
            "The email address must match the invitation.",
            403
          );
        }
      }

      if (invitation.invited_phone) {
        if (!phonesMatch(normalizedPhone, invitation.invited_phone)) {
          throw createHttpError(
            "The phone number must match the invitation.",
            403
          );
        }
      }

      if (!password || password.length < 8) {
        throw createHttpError(
          "Password must contain at least 8 characters."
        );
      }

      if (password.length > 72) {
        throw createHttpError(
          "Password must contain no more than 72 characters."
        );
      }

      const rounds = Number(process.env.BCRYPT_ROUNDS) || 12;
      const passwordHash = await bcrypt.hash(password, rounds);

      const newUserResult = await client.query(
        `INSERT INTO users (
           full_name,
           email,
           phone,
           password_hash,
           account_status
         )
         VALUES ($1, $2, $3, $4, 'active')
         RETURNING id, full_name, email, phone, account_status`,
        [
          normalizedName,
          normalizedEmail,
          normalizedPhone,
          passwordHash,
        ]
      );

      user = newUserResult.rows[0];
    }

    // 5. Create the church membership.
    const membershipResult = await client.query(
      `INSERT INTO church_memberships (
         user_id,
         church_id
       )
       VALUES ($1, $2)
       ON CONFLICT (user_id, church_id) DO NOTHING
       RETURNING id, membership_status`,
      [user.id, invitation.church_id]
    );

    let membership = membershipResult.rows[0];

    // If membership already exists, reuse it only if active.
    if (!membership) {
      const existingMembershipResult = await client.query(
        `SELECT id, membership_status
         FROM church_memberships
         WHERE user_id = $1
           AND church_id = $2
         FOR UPDATE`,
        [user.id, invitation.church_id]
      );

      membership = existingMembershipResult.rows[0];

      if (!membership) {
        throw createHttpError(
          "Could not create or retrieve church membership.",
          500
        );
      }

      if (membership.membership_status !== "active") {
        throw createHttpError(
          "Your existing church membership is not active. Contact the church administrator.",
          409
        );
      }
    }

    // 6. Assign church_admin to this membership only.
    await client.query(
      `INSERT INTO membership_roles (
         membership_id,
         church_id,
         role_id,
         assigned_by
       )
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (membership_id, role_id) DO NOTHING`,
      [
        membership.id,
        invitation.church_id,
        invitation.role_id,
        invitation.invited_by,
      ]
    );

    // 7. Accept the invitation.
    const acceptedResult = await client.query(
      `UPDATE church_admin_invitations
       SET status = 'accepted',
           accepted_at = CURRENT_TIMESTAMP
       WHERE id = $1
         AND status = 'pending'
       RETURNING id`,
      [invitation.id]
    );

    if (acceptedResult.rowCount !== 1) {
      throw createHttpError(
        "This invitation could not be accepted.",
        409
      );
    }

    await client.query("COMMIT");
    transactionFinished = true;

    return {
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        phone: user.phone,
      },
      church: {
        id: invitation.church_id,
        name: invitation.church_name,
      },
      membershipId: membership.id,
      role: "church_admin",
      loginIdentifier: user.email || user.phone,
    };
  } catch (error) {
    if (!transactionFinished) {
      await client.query("ROLLBACK");
    }

    // Convert database uniqueness errors into a useful response.
    if (error.code === "23505") {
      throw createHttpError(
        "This email or phone number is already registered.",
        409
      );
    }

    throw error;
  } finally {
    client.release();
  }
}

