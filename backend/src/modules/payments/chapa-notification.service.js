import crypto from "node:crypto";
import { pool } from "../../config/database.js";
import { verifyChapaPayment } from "./chapa.service.js";

function verifyWebhookSignature(rawBody, signature) {
  const secret = process.env.CHAPA_WEBHOOK_SECRET;

  if (!secret || !rawBody || !signature) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest();

  let received;

  try {
    received = Buffer.from(signature, "hex");
  } catch {
    return false;
  }

  return (
    received.length === expected.length &&
    crypto.timingSafeEqual(received, expected)
  );
}

export function authenticateChapaWebhook(req) {
  return verifyWebhookSignature(
    req.rawBody,
    req.get("x-chapa-signature") || req.get("chapa-signature")
  );
}

export async function verifyAndUpdatePayment(reference) {
  if (!reference || typeof reference !== "string") {
    throw new Error("A valid payment reference is required.");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const attemptResult = await client.query(
      `SELECT
          opa.id,
          opa.church_id,
          opa.contribution_id,
          opa.merchant_reference,
          opa.provider_reference,
          opa.amount_minor,
          opa.currency,
          opa.status AS attempt_status,
          c.payment_status
       FROM online_payment_attempts opa
       JOIN contributions c
         ON c.id = opa.contribution_id
        AND c.church_id = opa.church_id
       WHERE opa.provider = 'Chapa'
         AND (
           opa.merchant_reference = $1
           OR opa.provider_reference = $1
         )
       FOR UPDATE OF opa, c`,
      [reference]
    );

    if (!attemptResult.rowCount) {
      await client.query("ROLLBACK");
      return { found: false };
    }

    const attempt = attemptResult.rows[0];

    // A previously confirmed attempt must never be downgraded.
    if (attempt.attempt_status === "succeeded") {
      await client.query("COMMIT");
      return { found: true, status: "succeeded" };
    }

    await client.query("COMMIT");

    // Call Chapa outside the database transaction.
    const verification = await verifyChapaPayment(
      attempt.merchant_reference
    );

    const referenceMatches =
      verification.merchant_reference === attempt.merchant_reference;

    const finalStatus = verification.status;

    const chapaReferenceMatches =
      !attempt.provider_reference ||
      verification.chapa_reference === attempt.provider_reference;

    const amountMatches =
      (finalStatus !== "SUCCESS" && verification.amount_minor == null) ||
      Number(verification.amount_minor) === Number(attempt.amount_minor);

    const currencyMatches =
      (finalStatus !== "SUCCESS" && !verification.currency) ||
      verification.currency === attempt.currency;

    if (
      !referenceMatches ||
      !chapaReferenceMatches ||
      !amountMatches ||
      !currencyMatches
    ) {
      throw new Error("Verified payment details do not match the stored attempt.");
    }

    const updateClient = await pool.connect();

    try {
      await updateClient.query("BEGIN");

      const locked = await updateClient.query(
        `SELECT status
         FROM online_payment_attempts
         WHERE id = $1
         FOR UPDATE`,
        [attempt.id]
      );

      if (!locked.rowCount) {
        throw new Error("Payment attempt no longer exists.");
      }

      if (locked.rows[0].status === "succeeded") {
        await updateClient.query("COMMIT");
        return { found: true, status: "succeeded" };
      }

      if (finalStatus === "SUCCESS") {
        await updateClient.query(
          `UPDATE online_payment_attempts
           SET status = 'succeeded',
               provider_reference = $2,
               provider_response = $3::jsonb,
               verified_at = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [
            attempt.id,
            verification.chapa_reference || attempt.provider_reference,
            JSON.stringify(
              verification.provider_response ?? verification
            ),
          ]
        );

        await updateClient.query(
          `UPDATE contributions
           SET payment_status = 'confirmed',
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1
             AND church_id = $2
             AND payment_status = 'pending'`,
          [attempt.contribution_id, attempt.church_id]
        );
      } else if (
        ["FAILED", "CANCELLED", "BLOCKED", "INCOMPLETE"].includes(finalStatus)
      ) {
        await updateClient.query(
          `UPDATE online_payment_attempts
           SET status = 'failed',
               provider_response = $2::jsonb,
               failure_reason = $3,
               verified_at = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [
            attempt.id,
            JSON.stringify(
              verification.provider_response ?? verification
            ),
            `Chapa payment status: ${finalStatus}`,
          ]
        );

        await updateClient.query(
          `UPDATE contributions
           SET payment_status = 'rejected',
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1
             AND church_id = $2
             AND payment_status = 'pending'`,
          [attempt.contribution_id, attempt.church_id]
        );
      } else {
        await updateClient.query(
          `UPDATE online_payment_attempts
           SET status = 'pending',
               provider_response = $2::jsonb,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [
            attempt.id,
            JSON.stringify(
              verification.provider_response ?? verification
            ),
          ]
        );
      }

      await updateClient.query("COMMIT");

      return {
        found: true,
        status:
          finalStatus === "SUCCESS"
            ? "succeeded"
            : finalStatus === "PENDING"
              ? "pending"
              : "failed",
      };
    } catch (error) {
      await updateClient.query("ROLLBACK");
      throw error;
    } finally {
      updateClient.release();
    }
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // The transaction may already have been committed.
    }
    throw error;
  } finally {
    client.release();
  }
}
