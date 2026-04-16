import crypto from "crypto";
import speakeasy from "speakeasy";
import qrcode from "qrcode";

const APP_ISSUER = process.env.TOTP_ISSUER || "CSE447 Marketplace";

const getEncryptionMaterial = () =>
  process.env.TOTP_ENCRYPTION_KEY ||
  process.env.ACCESS_TOKEN_SECRET ||
  process.env.REFRESH_TOKEN_SECRET ||
  "dev-totp-encryption-key-change-me";

const deriveKey = () => crypto.createHash("sha256").update(getEncryptionMaterial()).digest();

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

export const encryptTotpSecret = (secretBase32) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", deriveKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(secretBase32), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    iv: iv.toString("hex"),
    tag: tag.toString("hex"),
    ciphertext: encrypted.toString("hex"),
  };
};

export const decryptTotpSecret = (encryptedPayload) => {
  if (
    !encryptedPayload ||
    !encryptedPayload.iv ||
    !encryptedPayload.tag ||
    !encryptedPayload.ciphertext
  ) {
    return "";
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    deriveKey(),
    Buffer.from(encryptedPayload.iv, "hex")
  );

  decipher.setAuthTag(Buffer.from(encryptedPayload.tag, "hex"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedPayload.ciphertext, "hex")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
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
