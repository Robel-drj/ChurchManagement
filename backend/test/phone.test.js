import assert from "node:assert/strict";
import test from "node:test";

import {
  getPhoneLookupKey,
  phonesMatch,
} from "../src/utils/phone.js";

test("normalizes Ethiopian local and international phone forms", () => {
  assert.equal(
    getPhoneLookupKey("+251 912-345-678"),
    "912345678"
  );
  assert.equal(getPhoneLookupKey("0912345678"), "912345678");
  assert.equal(
    phonesMatch("+251912345678", "0912345678"),
    true
  );
});

test("does not match different subscriber numbers", () => {
  assert.equal(
    phonesMatch("+251912345678", "0912345679"),
    false
  );
});

test("rejects values too short to be account phone identifiers", () => {
  assert.equal(getPhoneLookupKey("12345"), null);
});
