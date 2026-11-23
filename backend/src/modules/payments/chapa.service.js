const CHAPA_BASE_URL = "https://api.chapa.co/v1";
const CHAPA_CHECKOUT_HOST = "checkout.chapa.co";

function createHttpError(message, statusCode = 502) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function getPrivateKey() {
  const key = process.env.CHAPA_PRIVATE_KEY?.trim();

  if (!key) {
    throw createHttpError(
      "Online payment is not configured on the server.",
      503
    );
  }

  if (!/^CHASECK(?:_TEST)?-/.test(key)) {
    throw createHttpError(
      "The Chapa server key has an invalid format.",
      503
    );
  }

  return key;
}

function getConfiguredUrl(name, label) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw createHttpError(`${label} is not configured.`, 503);
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(value);
  } catch {
    throw createHttpError(`${label} is invalid.`, 503);
  }

  if (parsedUrl.protocol !== "https:") {
    throw createHttpError(`${label} must use HTTPS.`, 503);
  }

  return parsedUrl.toString();
}

function getProviderMessage(result) {
  if (typeof result?.message === "string") {
    return result.message;
  }

  if (result?.message && typeof result.message === "object") {
    const messages = Object.entries(result.message).flatMap(
      ([field, value]) => {
        const entries = Array.isArray(value) ? value : [value];
        return entries.map((entry) => `${field}: ${entry}`);
      }
    );

    if (messages.length > 0) {
      return messages.join("; ");
    }
  }

  if (typeof result?.error === "string") {
    return result.error;
  }

  return "Chapa payment request failed.";
}

async function chapaRequest(path, options = {}) {
  let response;

  try {
    response = await fetch(`${CHAPA_BASE_URL}${path}`, {
      ...options,
      signal: AbortSignal.timeout(20000),
      headers: {
        Authorization: `Bearer ${getPrivateKey()}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }

    throw createHttpError(
      error.name === "TimeoutError"
        ? "Chapa did not respond in time."
        : "Could not connect to Chapa."
    );
  }

  let result;

  try {
    result = await response.json();
  } catch {
    throw createHttpError("Invalid response received from Chapa.");
  }

  if (!response.ok || result.status !== "success") {
    const providerMessage = getProviderMessage(result);
    const error = createHttpError(
      response.status === 401
        ? "Chapa rejected the server API key. Contact the administrator."
        : providerMessage,
      response.status === 401 ? 503 : 502
    );

    error.providerStatus = response.status;
    error.providerMessage = providerMessage;
    error.providerResult = result;
    throw error;
  }

  return result;
}

function normalizeEthiopianPhone(value) {
  const digits = String(value ?? "").replace(/\D/g, "");

  if (/^0[79]\d{8}$/.test(digits)) {
    return digits;
  }

  if (/^[79]\d{8}$/.test(digits)) {
    return `0${digits}`;
  }

  if (/^251[79]\d{8}$/.test(digits)) {
    return `0${digits.slice(3)}`;
  }

  return null;
}

function normalizeChapaEmail(value) {
  const email = String(value ?? "").trim();
  const match = email.match(/^[^\s@]+@([^\s@]+)$/);

  if (!match) {
    return null;
  }

  const domain = match[1].toLowerCase();
  const reservedDomains = new Set([
    "example.com",
    "example.net",
    "example.org",
    "localhost",
  ]);

  if (
    reservedDomains.has(domain) ||
    domain.endsWith(".test") ||
    domain.endsWith(".invalid") ||
    domain.endsWith(".localhost")
  ) {
    return null;
  }

  return email;
}

function toMinorAmount(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return null;
  }

  return Math.round(amount * 100);
}

export async function initializeChapaCheckout({
  attempt,
  customer,
}) {
  const returnUrl = getConfiguredUrl(
    "CHAPA_RETURN_URL",
    "Chapa return URL"
  );
  const callbackUrl = getConfiguredUrl(
    "CHAPA_CALLBACK_URL",
    "Chapa callback URL"
  );

  const amountMinor = Number(attempt.amount_minor);

  if (!Number.isSafeInteger(amountMinor) || amountMinor < 100) {
    throw createHttpError("The Chapa payment amount is invalid.", 400);
  }

  const customerName = String(customer.full_name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const firstName = customerName.shift() || "Member";
  const lastName = customerName.join(" ") || "Member";
  const customerPhone = normalizeEthiopianPhone(customer.phone);
  const customerEmail = normalizeChapaEmail(customer.email);

  const payload = {
    amount: (amountMinor / 100).toFixed(2),
    currency: "ETB",
    tx_ref: attempt.merchant_reference,
    first_name: firstName,
    last_name: lastName,
    ...(customerPhone ? { phone_number: customerPhone } : {}),
    ...(customerEmail ? { email: customerEmail } : {}),
    callback_url: callbackUrl,
    return_url: returnUrl,
    customization: {
      title: "Contribution",
      description: "Church contribution payment",
    },
    meta: {
      contribution_id: attempt.contribution_id,
      church_id: attempt.church_id,
    },
  };

  const result = await chapaRequest("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const checkoutUrl = result.data?.checkout_url;

  if (!checkoutUrl) {
    throw createHttpError("Chapa did not return a checkout URL.");
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(checkoutUrl);
  } catch {
    throw createHttpError("Chapa returned an invalid checkout URL.");
  }

  if (
    parsedUrl.protocol !== "https:" ||
    parsedUrl.hostname !== CHAPA_CHECKOUT_HOST
  ) {
    throw createHttpError("Chapa returned an invalid checkout URL.");
  }

  return {
    checkoutUrl,
    // Chapa v1 verification uses our tx_ref. Its provider reference is
    // available only after payment verification.
    providerReference: null,
    expiresAt: null,
    providerResponse: {
      status: result.status,
      message: result.message,
    },
  };
}

export async function verifyChapaPayment(merchantReference) {
  let result;

  try {
    result = await chapaRequest(
      `/transaction/verify/${encodeURIComponent(merchantReference)}`,
      { method: "GET" }
    );
  } catch (error) {
    if (
      error.providerStatus === 404 &&
      /payment not paid yet/i.test(error.providerMessage ?? "")
    ) {
      return {
        status: "PENDING",
        amount_minor: null,
        currency: null,
        merchant_reference: merchantReference,
        chapa_reference: null,
        provider_response: error.providerResult,
      };
    }

    throw error;
  }

  const data = result.data;

  if (!data || typeof data !== "object") {
    throw createHttpError("Chapa returned invalid verification data.");
  }

  return {
    status: String(data.status ?? "PENDING").toUpperCase(),
    amount_minor: toMinorAmount(data.amount),
    currency: String(data.currency ?? "").toUpperCase(),
    merchant_reference:
      data.tx_ref ?? data.trx_ref ?? merchantReference,
    chapa_reference:
      data.reference ?? data.chapa_reference ?? null,
    provider_response: data,
  };
}
