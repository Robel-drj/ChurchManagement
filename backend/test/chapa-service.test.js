import assert from "node:assert/strict";
import test from "node:test";

import {
  initializeChapaCheckout,
  verifyChapaPayment,
} from "../src/modules/payments/chapa.service.js";

const originalFetch = global.fetch;
const originalEnvironment = {
  CHAPA_PRIVATE_KEY: process.env.CHAPA_PRIVATE_KEY,
  CHAPA_RETURN_URL: process.env.CHAPA_RETURN_URL,
  CHAPA_CALLBACK_URL: process.env.CHAPA_CALLBACK_URL,
};

process.env.CHAPA_PRIVATE_KEY = "CHASECK_TEST-test-key";
process.env.CHAPA_RETURN_URL =
  "https://example.com/api/payments/chapa/return";
process.env.CHAPA_CALLBACK_URL =
  "https://example.com/api/payments/chapa/callback";

test.after(() => {
  global.fetch = originalFetch;

  for (const [name, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
});

test("Chapa checkout uses the documented v1 transaction API", async () => {
  let request;

  global.fetch = async (url, options) => {
    request = { url, options };

    return {
      ok: true,
      status: 200,
      async json() {
        return {
          status: "success",
          message: "Hosted Link",
          data: {
            checkout_url:
              "https://checkout.chapa.co/checkout/payment/test-reference",
          },
        };
      },
    };
  };

  const checkout = await initializeChapaCheckout({
    attempt: {
      amount_minor: 1234,
      merchant_reference: "CHURCH-TEST-1",
      contribution_id: "contribution-id",
      church_id: "church-id",
    },
    customer: {
      full_name: "Abebe Bekele",
      phone: "+251 91 234 5678",
      email: "abebe@example.com",
    },
  });

  assert.equal(
    request.url,
    "https://api.chapa.co/v1/transaction/initialize"
  );
  assert.equal(request.options.method, "POST");

  const payload = JSON.parse(request.options.body);

  assert.equal(payload.amount, "12.34");
  assert.equal(payload.currency, "ETB");
  assert.equal(payload.tx_ref, "CHURCH-TEST-1");
  assert.equal(payload.phone_number, "0912345678");
  assert.ok(payload.customization.title.length <= 16);
  assert.equal(
    payload.callback_url,
    "https://example.com/api/payments/chapa/callback"
  );
  assert.equal(
    payload.return_url,
    "https://example.com/api/payments/chapa/return"
  );
  assert.equal(
    checkout.checkoutUrl,
    "https://checkout.chapa.co/checkout/payment/test-reference"
  );
  assert.equal(checkout.providerReference, null);
});

test("Chapa verification normalizes v1 values for stored payments", async () => {
  let requestedUrl;

  global.fetch = async (url) => {
    requestedUrl = url;

    return {
      ok: true,
      status: 200,
      async json() {
        return {
          status: "success",
          data: {
            status: "success",
            amount: "12.34",
            currency: "ETB",
            tx_ref: "CHURCH-TEST-1",
            reference: "provider-reference",
          },
        };
      },
    };
  };

  const verification = await verifyChapaPayment("CHURCH-TEST-1");

  assert.equal(
    requestedUrl,
    "https://api.chapa.co/v1/transaction/verify/CHURCH-TEST-1"
  );
  assert.deepEqual(
    {
      status: verification.status,
      amountMinor: verification.amount_minor,
      currency: verification.currency,
      merchantReference: verification.merchant_reference,
      chapaReference: verification.chapa_reference,
    },
    {
      status: "SUCCESS",
      amountMinor: 1234,
      currency: "ETB",
      merchantReference: "CHURCH-TEST-1",
      chapaReference: "provider-reference",
    }
  );
});

test("unpaid Chapa transactions remain pending", async () => {
  global.fetch = async () => ({
    ok: false,
    status: 404,
    async json() {
      return {
        status: null,
        message: "Payment not paid yet",
        data: null,
      };
    },
  });

  const verification = await verifyChapaPayment("CHURCH-TEST-2");

  assert.equal(verification.status, "PENDING");
  assert.equal(verification.merchant_reference, "CHURCH-TEST-2");
});
