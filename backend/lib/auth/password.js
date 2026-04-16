import crypto from "crypto";

const DEFAULT_ITERATIONS = 120000;
const DEFAULT_KEY_LENGTH = 64;
const DEFAULT_DIGEST = "sha512";

export const createSalt = (bytes = 16) => crypto.randomBytes(bytes).toString("hex");

export const hashWithSalt = ({
  value,
  salt,
  iterations = DEFAULT_ITERATIONS,
  keyLength = DEFAULT_KEY_LENGTH,
  digest = DEFAULT_DIGEST,
}) =>
  crypto
    .pbkdf2Sync(value, salt, iterations, keyLength, digest)
    .toString("hex");

export const createPasswordHash = (password) => {
  const salt = createSalt();
  const iterations = DEFAULT_ITERATIONS;
  const keyLength = DEFAULT_KEY_LENGTH;
  const digest = DEFAULT_DIGEST;
  const hash = hashWithSalt({ value: password, salt, iterations, keyLength, digest });

  return {
    hash,
    salt,
    iterations,
    keyLength,
    digest,
  };
};

export const verifyPassword = (password, passwordPayload) => {
  const computed = hashWithSalt({
    value: password,
    salt: passwordPayload.salt,
    iterations: passwordPayload.iterations,
    keyLength: passwordPayload.keyLength,
    digest: passwordPayload.digest,
  });

  const expected = Buffer.from(passwordPayload.hash, "hex");
  const actual = Buffer.from(computed, "hex");

  if (expected.length !== actual.length) {
    return false;
  }

  return crypto.timingSafeEqual(expected, actual);
};
