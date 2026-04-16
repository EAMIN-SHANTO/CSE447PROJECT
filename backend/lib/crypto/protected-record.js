import { eccEncrypt, eccDecrypt } from "./ecc.js";
import { hmacSha256Hex, verifyHmacSha256Hex } from "./mac.js";

const sortObject = (value) => {
  if (Array.isArray(value)) {
    return value.map(sortObject);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.keys(value)
    .sort()
    .reduce((acc, key) => {
      acc[key] = sortObject(value[key]);
      return acc;
    }, {});
};

const canonicalize = (value) => JSON.stringify(sortObject(value));

const signFieldPayload = (fieldName, payload, macKeyHex) =>
  hmacSha256Hex(macKeyHex, `${fieldName}:${canonicalize(payload)}`);

export const sealProtectedRecord = ({ fields, encryptionKey, keyId, macKeyHex }) => {
  const protectedFields = {};

  Object.entries(fields).forEach(([fieldName, rawValue]) => {
    if (rawValue === null || rawValue === undefined || rawValue === "") {
      return;
    }

    const encryptionPayload = eccEncrypt(String(rawValue), encryptionKey.publicKey);
    const basePayload = {
      algorithm: "ECC",
      keyId,
      curve: encryptionPayload.curve,
      nonce: encryptionPayload.nonce,
      ephemeralPublicKey: encryptionPayload.ephemeralPublicKey,
      ciphertext: encryptionPayload.ciphertext,
    };

    protectedFields[fieldName] = {
      ...basePayload,
      mac: signFieldPayload(fieldName, basePayload, macKeyHex),
    };
  });

  const recordMac = hmacSha256Hex(macKeyHex, canonicalize(protectedFields));

  return {
    protectedFields,
    recordMac,
  };
};

export const openProtectedRecord = ({ protectedFields, recordMac, decryptionKey, macKeyHex }) => {
  const expectedRecordMac = hmacSha256Hex(macKeyHex, canonicalize(protectedFields));

  if (!verifyHmacSha256Hex(macKeyHex, canonicalize(protectedFields), recordMac) || expectedRecordMac !== recordMac) {
    throw new Error("Protected record MAC verification failed");
  }

  const output = {};

  Object.entries(protectedFields).forEach(([fieldName, payload]) => {
    const { mac, ...basePayload } = payload;

    if (!verifyHmacSha256Hex(macKeyHex, `${fieldName}:${canonicalize(basePayload)}`, mac)) {
      throw new Error(`Protected field MAC verification failed for ${fieldName}`);
    }

    output[fieldName] = eccDecrypt(basePayload, decryptionKey.privateKey);
  });

  return output;
};
