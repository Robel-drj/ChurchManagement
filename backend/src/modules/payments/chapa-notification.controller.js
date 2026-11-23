import {
  authenticateChapaWebhook,
  verifyAndUpdatePayment,
} from "./chapa-notification.service.js";

export async function chapaWebhook(req, res, next) {
  try {
    if (!authenticateChapaWebhook(req)) {
      return res.status(401).json({
        success: false,
        message: "Invalid Chapa webhook signature.",
      });
    }

    const event = req.body;
    const reference =
      event?.tx_ref ||
      event?.trx_ref ||
      event?.merchant_reference ||
      event?.reference ||
      event?.ref_id ||
      event?.chapa_reference;

    if (typeof reference !== "string" || !reference.trim()) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment webhook payload.",
      });
    }

    // A webhook is only a notification. Verify the transaction with Chapa.
    const result = await verifyAndUpdatePayment(reference.trim());

    if (!result.found) {
      return res.status(404).json({
        success: false,
        message: "Payment attempt not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Webhook processed.",
      paymentStatus: result.status,
    });
  } catch (error) {
    next(error);
  }
}

export async function chapaCallback(req, res, next) {
  try {
    const reference =
      req.query.tx_ref ||
      req.query.trx_ref ||
      req.query.merchant_reference ||
      req.query.reference ||
      req.query.ref_id ||
      req.query.chapa_reference ||
      req.body?.tx_ref ||
      req.body?.trx_ref ||
      req.body?.merchant_reference ||
      req.body?.reference ||
      req.body?.ref_id ||
      req.body?.chapa_reference;

    if (!reference || typeof reference !== "string") {
      return res.status(400).send("Payment reference is missing.");
    }

    const result = await verifyAndUpdatePayment(reference.trim());

    if (!result.found) {
      return res.status(404).send("Payment attempt was not found.");
    }

    return res.redirect(
      `/api/payments/chapa/return?status=${encodeURIComponent(result.status)}`
    );
  } catch (error) {
    next(error);
  }
}

export function chapaReturn(req, res) {
  const status =
    typeof req.query.status === "string"
      ? req.query.status
      : "processing";

  const safeStatus = ["succeeded", "pending", "failed"].includes(status)
    ? status
    : "processing";

  const messages = {
    succeeded: "Your payment has been verified successfully.",
    pending: "Your payment is still being processed. Please check your payment history.",
    failed: "Your payment was not completed. Please check your payment history.",
    processing: "We received your return from checkout. Please check your payment history for the verified status.",
  };

  const message = messages[safeStatus];

  res
    .status(200)
    .type("html")
    .send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Church payment</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 560px; margin: 60px auto; padding: 24px; line-height: 1.6; }
    main { border: 1px solid #ddd; border-radius: 12px; padding: 28px; }
  </style>
</head>
<body>
  <main>
    <h2>Payment update</h2>
    <p>${message}</p>
    <p>You can return to the Church app and refresh your payment history.</p>
  </main>
</body>
</html>`);
}
