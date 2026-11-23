/**
 * Returns a stable lookup key for a phone number.
 *
 * The application contains both local numbers (for example 09...) and
 * international numbers (for example +2519...). Their final nine digits are
 * the subscriber number in both forms. Formatting characters are ignored.
 */
export function getPhoneLookupKey(value) {
  if (typeof value !== "string") {
    return null;
  }

  const digits = value.replace(/[^0-9]/g, "");

  if (digits.length < 7) {
    return null;
  }

  return digits.length > 9 ? digits.slice(-9) : digits;
}

export function phonesMatch(left, right) {
  const leftKey = getPhoneLookupKey(left);
  const rightKey = getPhoneLookupKey(right);

  return leftKey !== null && rightKey !== null && leftKey === rightKey;
}
