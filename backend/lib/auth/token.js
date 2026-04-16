import crypto from "crypto";
import { hmacSha256Hex } from "../crypto/mac.js";

const toBase64Url = (input) =>
  Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

const fromBase64Url = (input) => {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const remainder = padded.length % 4;
  const fixed = remainder === 0 ? padded : `${padded}${"=".repeat(4 - remainder)}`;
  return Buffer.from(fixed, "base64").toString("utf8");
};

const stableJson = (value) => JSON.stringify(value);

const signRaw = (raw, secret) => {
  const signatureHex = hmacSha256Hex(secret, raw);
  return toBase64Url(Buffer.from(signatureHex, "hex"));
};

export const issueToken = ({ payload, secret, expiresInSeconds }) => {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
    jti: crypto.randomBytes(16).toString("hex"),
  };

  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  const encodedHeader = toBase64Url(stableJson(header));
  const encodedPayload = toBase64Url(stableJson(fullPayload));
  const raw = `${encodedHeader}.${encodedPayload}`;
  const signature = signRaw(raw, secret);

  return `${raw}.${signature}`;
};

export const verifyToken = ({ token, secret }) => {
  if (!token || typeof token !== "string") {
    throw new Error("Token missing");
  }

  const parts = token.split(".");

  if (parts.length !== 3) {
    throw new Error("Invalid token format");
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const raw = `${encodedHeader}.${encodedPayload}`;
  const expectedSig = signRaw(raw, secret);

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSig);

  if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    throw new Error("Invalid token signature");
  }

  const payload = JSON.parse(fromBase64Url(encodedPayload));
  const now = Math.floor(Date.now() / 1000);

  if (payload.exp && now >= payload.exp) {
    throw new Error("Token expired");
  }

  return payload;
};
