import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { generateECCKeyPair, eccDecrypt, eccEncrypt } from "../lib/crypto/ecc.js";
import { hmacSha256Hex } from "../lib/crypto/mac.js";
import { openProtectedRecord, sealProtectedRecord } from "../lib/crypto/protected-record.js";
import { generateRSAKeyPair, rsaDecryptText, rsaEncryptText } from "../lib/crypto/rsa.js";

test("phase7: HMAC correctness matches Node crypto", () => {
  const key = "phase7-hmac-key";
  const message = "CSE447 integrity check";

  const expected = crypto.createHmac("sha256", key).update(message).digest("hex");
  const actual = hmacSha256Hex(key, message);

  assert.equal(actual, expected);
});

test("phase7: RSA encrypt/decrypt roundtrip", async () => {
  const keys = await generateRSAKeyPair({ modulusBits: 512 });
  const plaintext = "Phase7 RSA roundtrip data";

  const cipherPayload = rsaEncryptText(plaintext, keys.publicKey);
  const decrypted = rsaDecryptText(cipherPayload, keys.privateKey);

  assert.equal(decrypted, plaintext);
});

test("phase7: ECC encrypt/decrypt roundtrip", () => {
  const keyPair = generateECCKeyPair();
  const plaintext = "Phase7 ECC roundtrip data";

  const cipherPayload = eccEncrypt(plaintext, keyPair.publicKey);
  const decrypted = eccDecrypt(cipherPayload, keyPair.privateKey);

  assert.equal(decrypted, plaintext);
});

test("phase7: protected record is encrypted-at-rest and decryptable", () => {
  const keyPair = generateECCKeyPair();
  const macKeyHex = crypto.randomBytes(32).toString("hex");

  const source = {
    title: "Laptop for sale",
    desc: "Used for one semester",
    content: "Intel i5, 8GB RAM",
  };

  const sealed = sealProtectedRecord({
    fields: source,
    encryptionKey: { publicKey: keyPair.publicKey },
    keyId: "phase7-test-key",
    macKeyHex,
  });

  const serialized = JSON.stringify(sealed.protectedFields);
  assert.equal(serialized.includes(source.title), false);
  assert.equal(serialized.includes(source.desc), false);
  assert.equal(serialized.includes(source.content), false);

  const opened = openProtectedRecord({
    protectedFields: sealed.protectedFields,
    recordMac: sealed.recordMac,
    decryptionKey: { privateKey: keyPair.privateKey },
    macKeyHex,
  });

  assert.deepEqual(opened, source);
});

test("phase7: tamper detection rejects modified protected record", () => {
  const keyPair = generateECCKeyPair();
  const macKeyHex = crypto.randomBytes(32).toString("hex");

  const sealed = sealProtectedRecord({
    fields: { content: "Original" },
    encryptionKey: { publicKey: keyPair.publicKey },
    keyId: "phase7-test-key",
    macKeyHex,
  });

  const tampered = structuredClone(sealed.protectedFields);
  tampered.content.ciphertext = tampered.content.ciphertext.slice(0, -2) + "aa";

  assert.throws(() => {
    openProtectedRecord({
      protectedFields: tampered,
      recordMac: sealed.recordMac,
      decryptionKey: { privateKey: keyPair.privateKey },
      macKeyHex,
    });
  }, /MAC verification failed/);
});
