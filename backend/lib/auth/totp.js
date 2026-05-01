import crypto from "crypto";
import speakeasy from "speakeasy";
import qrcode from "qrcode";
import { ensureKeySet } from "../crypto/key-manager.js";
import { eccEncrypt, eccDecrypt } from "../crypto/ecc.js";

const APP_ISSUER = process.env.TOTP_ISSUER || "CSE447 Marketplace";

const normalizeOtp = (token) => String(token || "").replace(/\D+/g, "").trim();
const normalizeBase32Secret = (secret) => String(secret || "").replace(/\s+/g, "").toUpperCase();

export const generateTotpSetup = async ({ accountLabel }) => {
  const secret = speakeasy.generateSecret({
    name: `${APP_ISSUER}:${accountLabel}`,
    issuer: APP_ISSUER,
    length: 20,
  });

  const qrCodeDataUrl = await qrcode.toDataURL(secret.otpauth_url);

  return {
    secretBase32: secret.base32,
    otpauthUrl: secret.otpauth_url,
    qrCodeDataUrl,
    issuer: APP_ISSUER,
  };
};

export const encryptTotpSecret = async (secretBase32, userId) => {
  const keySet = await ensureKeySet({ ownerId: String(userId), domain: "totp-secrets" });
  return eccEncrypt(String(secretBase32), keySet.ecc.runtime.publicKey);
};

export const decryptTotpSecret = async (encryptedPayload, userId) => {
  if (!encryptedPayload || !encryptedPayload.ciphertext) {
    return "";
  }

  const keySet = await ensureKeySet({ ownerId: String(userId), domain: "totp-secrets" });
  return eccDecrypt(encryptedPayload, keySet.ecc.runtime.privateKey);
};

export const verifyTotpCode = ({ token, secretBase32 }) => {
  const normalizedToken = normalizeOtp(token);
  const normalizedSecret = normalizeBase32Secret(secretBase32);

  if (normalizedToken.length !== 6 || !normalizedSecret) {
    return false;
  }

  const verification = speakeasy.totp.verifyDelta({
    secret: normalizedSecret,
    encoding: "base32",
    token: normalizedToken,
    window: 2,
  });

  return Boolean(verification);
};
