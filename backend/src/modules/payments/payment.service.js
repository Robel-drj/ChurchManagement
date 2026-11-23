
import { randomBytes } from "node:crypto";
import { pool } from "../../config/database.js";

import {
  initializeChapaCheckout,
  verifyChapaPayment,
} from "./chapa.service.js";

function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function createMerchantReference() {
  return `CH${randomBytes(9).toString("hex")}`;
}

function extractAttempt(row) {
  return {
    id: row.attempt_id,
    church_id: row.church_id,
    contribution_id: row.contribution_id,
    merchant_reference: row.merchant_reference,
    provider_reference: row.provider_reference,
    idempotency_key: row.idempotency_key,
    checkout_url: row.checkout_url,
    amount_minor: row.amount_minor,
    currency: row.currency,
    status: row.attempt_status,
    expires_at: row.expires_at,
  };
}

async function getAttemptByIdempotencyKey(
  churchId,
  userId,
  idempotencyKey
) {
  const result = await pool.query(
    `SELECT
       opa.id AS attempt_id,
       opa.church_id,
       opa.contribution_id,
       opa.merchant_reference,
       opa.provider_reference,
       opa.idempotency_key,
       opa.checkout_url,
       opa.amount_minor,
       opa.currency,
       opa.status AS attempt_status,
       opa.expires_at,
       co.payment_status,
       u.full_name,
       u.phone,
       u.email,
       c.church_name
     FROM online_payment_attempts opa
     JOIN contributions co
       ON co.id = opa.contribution_id
      AND co.church_id = opa.church_id
     JOIN church_memberships cm
       ON cm.id = co.membership_id
      AND cm.church_id = co.church_id
     JOIN users u ON u.id = cm.user_id
     JOIN churches c ON c.id = opa.church_id
     WHERE opa.church_id = $1
       AND u.id = $2
       AND opa.idempotency_key = $3`,
    [churchId, userId, idempotencyKey]
  );

  return result.rows[0] || null;
}

export async function initializeOnlineContribution(
  churchId,
  userId,
  input
) {
  // Reuse an existing attempt when the client retries
  // the same operation.
  let row = await getAttemptByIdempotencyKey(
    churchId,
    userId,
    input.idempotency_key
  );

  if (row?.checkout_url) {
    return {
      contribution_id: row.contribution_id,
      checkout_url: row.checkout_url,
      merchant_reference: row.merchant_reference,
      status: row.attempt_status,
    };
  }

  let attempt;

  if (!row) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const churchResult = await client.query(
        `SELECT id, church_name
         FROM churches
         WHERE id = $1
           AND status = 'active'
         FOR SHARE`,
        [churchId]
      );

      if (!churchResult.rowCount) {
        throw createHttpError(
          "Church not found or not active.",
          403
        );
      }

      const memberResult = await client.query(
        `SELECT
           cm.id AS membership_id,
           u.id AS user_id,
           u.full_name,
           u.phone,
           u.email,
           c.church_name
         FROM church_memberships cm
         JOIN users u ON u.id = cm.user_id
         JOIN churches c ON c.id = cm.church_id
         WHERE cm.user_id = $1
           AND cm.church_id = $2
           AND cm.membership_status = 'active'
           AND u.account_status = 'active'
         FOR SHARE OF cm`,
        [userId, churchId]
      );

      const member = memberResult.rows[0];

      if (!member) {
        throw createHttpError(
          "Your active membership was not found in this church.",
          403
        );
      }

      const categoryResult = await client.query(
        `SELECT id
         FROM contribution_categories
         WHERE id = $1
           AND church_id = $2
           AND is_active = TRUE`,
        [input.category_id, churchId]
      );

      if (!categoryResult.rowCount) {
        throw createHttpError(
          "The selected contribution category is unavailable.",
          404
        );
      }

      const methodResult = await client.query(
        `SELECT id
         FROM payment_methods
         WHERE church_id = $1
           AND provider = 'Chapa'
           AND method_name = 'Chapa Online'
           AND is_active = TRUE
         LIMIT 1`,
        [churchId]
      );

      const method = methodResult.rows[0];

      if (!method) {
        throw createHttpError(
          "Chapa Online is not enabled for this church.",
          409
        );
      }

      const amountMinor = Math.round(input.amount * 100);

      if (
        !Number.isSafeInteger(amountMinor) ||
        amountMinor < 100
      ) {
        throw createHttpError(
          "The contribution amount is invalid."
        );
      }

      const merchantReference = createMerchantReference();

      const contributionResult = await client.query(
        `INSERT INTO contributions (
           church_id,
           membership_id,
           category_id,
           payment_method_id,
           amount,
           payment_status,
           transaction_reference,
           received_by,
           notes
         )
         VALUES ($1, $2, $3, $4, $5, 'pending', $6, NULL, $7)
         RETURNING id`,
        [
          churchId,
          member.membership_id,
          input.category_id,
          method.id,
          input.amount.toFixed(2),
          merchantReference,
          input.notes ?? null,
        ]
      );

      const contribution = contributionResult.rows[0];

      const attemptResult = await client.query(
        `INSERT INTO online_payment_attempts (
           church_id,
           contribution_id,
           provider,
           merchant_reference,
           idempotency_key,
           amount_minor,
           currency,
           status
         )
         VALUES ($1, $2, 'Chapa', $3, $4, $5, 'ETB', 'initiating')
         RETURNING
           id AS attempt_id,
           church_id,
           contribution_id,
           merchant_reference,
           provider_reference,
           idempotency_key,
           checkout_url,
           amount_minor,
           currency,
           status AS attempt_status,
           expires_at`,
        [
          churchId,
          contribution.id,
          merchantReference,
          input.idempotency_key,
          amountMinor,
        ]
      );

      attempt = {
        ...attemptResult.rows[0],
        full_name: member.full_name,
        phone: member.phone,
        email: member.email,
        church_name: member.church_name,
      };

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");

      if (error.code === "23505") {
        throw createHttpError(
          "This payment request already exists. Retry using the same idempotency key.",
          409
        );
      }

      throw error;
    } finally {
      client.release();
    }
  } else {
    attempt = row;
  }

  // Never call Chapa while a database transaction is open.
  // Chapa receives the same idempotency key on every retry.
  if (attempt.attempt_status === "succeeded") {
    return {
      contribution_id: attempt.contribution_id,
      checkout_url: null,
      merchant_reference: attempt.merchant_reference,
      status: "succeeded",
    };
  }

  if (attempt.checkout_url) {
    return {
      contribution_id: attempt.contribution_id,
      checkout_url: attempt.checkout_url,
      merchant_reference: attempt.merchant_reference,
      status: attempt.attempt_status,
    };
  }

  const checkout = await initializeChapaCheckout({
    attempt: extractAttempt(attempt),
    customer: {
      full_name: attempt.full_name,
      phone: attempt.phone,
      email: attempt.email,
    },
  });

  await pool.query(
    `UPDATE online_payment_attempts
     SET checkout_url = $1,
         provider_reference = $2,
         expires_at = $3,
         provider_response = $4::jsonb,
         status = 'pending',
         failure_reason = NULL,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $5
       AND church_id = $6`,
    [
      checkout.checkoutUrl,
      checkout.providerReference,
      checkout.expiresAt,
      JSON.stringify(checkout.providerResponse),
      attempt.attempt_id,
      churchId,
    ]
  );

  return {
    contribution_id: attempt.contribution_id,
    checkout_url: checkout.checkoutUrl,
    merchant_reference: attempt.merchant_reference,
    status: "pending",
  };
}

async function confirmAttempt(attempt, verification) {
  const valid =
    verification?.status === "SUCCESS" &&
    Number(verification.amount_minor) === Number(attempt.amount_minor) &&
    verification.currency === attempt.currency &&
    verification.merchant_reference === attempt.merchant_reference;

  if (!valid) {
    throw createHttpError(
      "Chapa verification did not match this contribution.",
      409
    );
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `UPDATE online_payment_attempts
       SET status = 'succeeded',
           verified_at = CURRENT_TIMESTAMP,
           provider_reference = COALESCE($1, provider_reference),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
         AND status <> 'succeeded'`,
      [verification.chapa_reference || null, attempt.id]
    );

    await client.query(
      `UPDATE contributions
       SET payment_status = 'confirmed',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
         AND church_id = $2
         AND payment_status = 'pending'`,
      [attempt.contribution_id, attempt.church_id]
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function verifyMyContribution(
  churchId,
  userId,
  contributionId
) {
  const result = await pool.query(
    `SELECT
       opa.id,
       opa.church_id,
       opa.contribution_id,
       opa.merchant_reference,
       opa.provider_reference,
       opa.amount_minor,
       opa.currency,
       opa.status AS attempt_status,
       co.payment_status
     FROM online_payment_attempts opa
     JOIN contributions co
       ON co.id = opa.contribution_id
      AND co.church_id = opa.church_id
     JOIN church_memberships cm
       ON cm.id = co.membership_id
      AND cm.church_id = co.church_id
     WHERE opa.church_id = $1
       AND opa.contribution_id = $2
       AND cm.user_id = $3`,
    [churchId, contributionId, userId]
  );

  const attempt = result.rows[0];

  if (!attempt) {
    throw createHttpError("Contribution not found.", 404);
  }

  if (attempt.attempt_status === "succeeded") {
    return {
      contribution_id: contributionId,
      payment_status: "confirmed",
      attempt_status: "succeeded",
    };
  }

  const verification = await verifyChapaPayment(
    attempt.merchant_reference
  );

  if (verification?.status === "SUCCESS") {
    await confirmAttempt(attempt, verification);

    return {
      contribution_id: contributionId,
      payment_status: "confirmed",
      attempt_status: "succeeded",
    };
  }

  const providerStatus = String(
    verification?.status || "PENDING"
  ).toUpperCase();

  if (
    ["FAILED", "CANCELLED", "INCOMPLETE", "BLOCKED"].includes(
      providerStatus
    )
  ) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      await client.query(
        `UPDATE online_payment_attempts
         SET status = 'failed',
             provider_response = $1::jsonb,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
           AND status <> 'succeeded'`,
        [
          JSON.stringify({ status: providerStatus }),
          attempt.id,
        ]
      );

      await client.query(
        `UPDATE contributions
         SET payment_status = 'rejected',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
           AND church_id = $2
           AND payment_status = 'pending'`,
        [contributionId, churchId]
      );

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    return {
      contribution_id: contributionId,
      payment_status: "rejected",
      attempt_status: "failed",
    };
  }

  return {
    contribution_id: contributionId,
    payment_status: attempt.payment_status,
    attempt_status: "pending",
  };
}

export async function listMyContributions(churchId, userId) {
  const result = await pool.query(
    `SELECT
       co.id AS contribution_id,
       co.amount,
       co.payment_status,
       co.transaction_reference,
       co.contribution_date,
       cc.name AS category_name,
       pm.method_name AS payment_method,
       opa.status AS online_payment_status,
       opa.merchant_reference,
       opa.provider_reference
     FROM contributions co
     JOIN church_memberships cm
       ON cm.id = co.membership_id
      AND cm.church_id = co.church_id
     JOIN contribution_categories cc
       ON cc.id = co.category_id
      AND cc.church_id = co.church_id
     JOIN payment_methods pm
       ON pm.id = co.payment_method_id
      AND pm.church_id = co.church_id
     LEFT JOIN online_payment_attempts opa
       ON opa.contribution_id = co.id
      AND opa.church_id = co.church_id
     WHERE co.church_id = $1
       AND cm.user_id = $2
     ORDER BY co.created_at DESC`,
    [churchId, userId]
  );

  return result.rows;
}
