import crypto from "crypto";
import mongoose from "mongoose";
import User from "../models/user.model.js";
import { ensureKeySet } from "../lib/crypto/key-manager.js";
import { sealProtectedRecord } from "../lib/crypto/protected-record.js";
import { createPasswordHash, createSalt, hashWithSalt, verifyPassword } from "../lib/auth/password.js";
import { sendEmailOtp, shouldExposeDevOtp } from "../lib/auth/otp-email.js";
import {
  decryptTotpSecret,
  encryptTotpSecret,
  generateTotpSetup,
  verifyTotpCode,
} from "../lib/auth/totp.js";
import {
  clearRefreshCookie,
  getRefreshTokenFromRequest,
  issueSessionTokens,
  revokeSessionByRefreshToken,
  rotateRefreshToken,
  setRefreshCookie,
} from "../lib/auth/session.js";

const USER_PROFILE_DOMAIN = "user-profile";
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_MINUTES = 10;
const OTP_TTL_SECONDS = Number(process.env.TWO_FACTOR_OTP_TTL_SECONDS || 300);
const SIGNUP_OTP_TTL_SECONDS = Number(process.env.SIGNUP_OTP_TTL_SECONDS || OTP_TTL_SECONDS);
const SIGNUP_OTP_MAX_ATTEMPTS = 5;
const SHOULD_REQUIRE_SIGNUP_OTP =
  process.env.REQUIRE_SIGNUP_OTP !== "false" && process.env.NODE_ENV !== "test";
const BRACU_EMAIL_PATTERN = /^[^@\s]+@(g\.bracu\.ac\.bd|bracu\.ac\.bd|gmail\.com)$/;
const signupOtpChallenges = new Map();

const normalizeLoginOtpMethod = (method) => {
  const value = String(method || "email").trim().toLowerCase();

  if (["authenticator", "totp", "google-authenticator", "google"].includes(value)) {
    return "authenticator";
  }

  return "email";
};

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const hashEmail = (email) => crypto.createHash("sha256").update(normalizeEmail(email)).digest("hex");

const makePseudonym = (seed) => {
  const suffix = crypto.createHash("sha256").update(seed).digest("hex").slice(0, 6);
  return `student_${suffix}`;
};

const userSummary = (user) => ({
  id: user._id,
  pseudonym: user.pseudonym,
  role: user.role,
  twoFactorEnabled: user.twoFactor?.enabled,
  totpEnabled: Boolean(user.twoFactor?.totpEnabled),
});

const safeIp = (req) =>
  req.headers["x-forwarded-for"]?.toString().split(",")[0].trim() || req.socket?.remoteAddress || "";

const issueLoginSuccessResponse = async ({ req, res, user }) => {
  user.twoFactor.challengeId = null;
  user.twoFactor.otpHash = null;
  user.twoFactor.otpSalt = null;
  user.twoFactor.otpExpiresAt = null;
  user.twoFactor.otpAttempts = 0;
  user.twoFactor.verifiedAt = new Date();
  user.lastLoginAt = new Date();

  await user.save();

  const tokens = await issueSessionTokens({
    user,
    userAgent: req.headers["user-agent"] || "",
    ipAddress: safeIp(req),
  });

  setRefreshCookie(res, tokens.refreshToken);

  return res.status(200).json({
    message: "2FA verified",
    accessToken: tokens.accessToken,
    user: userSummary(user),
  });
};

const clearExpiredSignupChallenges = () => {
  const now = Date.now();

  for (const [challengeId, challenge] of signupOtpChallenges.entries()) {
    if (!challenge.expiresAt || challenge.expiresAt.getTime() <= now) {
      signupOtpChallenges.delete(challengeId);
    }
  }
};

const createSignupOtpChallenge = ({ normalizedEmail, otp }) => {
  clearExpiredSignupChallenges();

  const challengeId = crypto.randomBytes(12).toString("hex");
  const salt = createSalt();
  const otpHash = hashWithSalt({ value: otp, salt });

  signupOtpChallenges.set(challengeId, {
    emailHash: hashEmail(normalizedEmail),
    otpHash,
    otpSalt: salt,
    otpAttempts: 0,
    expiresAt: new Date(Date.now() + SIGNUP_OTP_TTL_SECONDS * 1000),
  });

  return challengeId;
};

const verifySignupOtpChallenge = ({ normalizedEmail, challengeId, otp }) => {
  clearExpiredSignupChallenges();

  const challenge = signupOtpChallenges.get(challengeId);

  if (!challenge) {
    return {
      valid: false,
      status: 401,
      message: "Signup OTP challenge expired or invalid",
    };
  }

  if (challenge.emailHash !== hashEmail(normalizedEmail)) {
    return {
      valid: false,
      status: 401,
      message: "Signup OTP challenge does not match this email",
    };
  }

  if (challenge.otpAttempts >= SIGNUP_OTP_MAX_ATTEMPTS) {
    signupOtpChallenges.delete(challengeId);
    return {
      valid: false,
      status: 429,
      message: "Too many invalid OTP attempts",
    };
  }

  const computed = hashWithSalt({ value: String(otp), salt: challenge.otpSalt });
  const expectedBuffer = Buffer.from(challenge.otpHash, "hex");
  const actualBuffer = Buffer.from(computed, "hex");

  const isValid =
    expectedBuffer.length === actualBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, actualBuffer);

  if (!isValid) {
    challenge.otpAttempts += 1;
    signupOtpChallenges.set(challengeId, challenge);

    return {
      valid: false,
      status: 401,
      message: "Invalid signup OTP",
    };
  }

  signupOtpChallenges.delete(challengeId);

  return {
    valid: true,
  };
};

export const requestSignupOtp = async (req, res) => {
  try {
    const normalizedEmail = normalizeEmail(req.body?.email);

    if (!normalizedEmail) {
      return res.status(400).json({ message: "email is required" });
    }

    if (!BRACU_EMAIL_PATTERN.test(normalizedEmail)) {
      return res.status(400).json({
        message: "Only @g.bracu.ac.bd, @bracu.ac.bd, or @gmail.com email accounts are allowed",
      });
    }

    const existingByEmail = await User.findOne({ emailHash: hashEmail(normalizedEmail) });

    if (existingByEmail) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpChallengeId = createSignupOtpChallenge({ normalizedEmail, otp });

    const delivery = await sendEmailOtp({
      to: normalizedEmail,
      otp,
      pseudonym: normalizedEmail.split("@")[0],
      ttlSeconds: SIGNUP_OTP_TTL_SECONDS,
      purpose: "signup",
    });

    const exposeDevOtp = shouldExposeDevOtp();

    if (!delivery.delivered && !exposeDevOtp) {
      return res.status(503).json({
        message: "OTP delivery is unavailable. Contact support or configure SMTP.",
      });
    }

    const response = {
      message: "Signup OTP sent. Verify OTP to complete registration.",
      otpChallengeId,
      otpDelivery: delivery.delivered ? "email" : "dev-fallback",
    };

    if (exposeDevOtp) {
      response.devOtp = otp;
    }

    return res.status(200).json(response);
  } catch {
    return res.status(500).json({ message: "Failed to send signup OTP" });
  }
};

export const register = async (req, res) => {
  try {
    const { email, password, pseudonym, fullName = "", contactInfo = "", otpChallengeId, otp } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "password must be at least 8 characters" });
    }

    const normalizedEmail = normalizeEmail(email);

    if (SHOULD_REQUIRE_SIGNUP_OTP) {
      if (!otpChallengeId || !otp) {
        return res.status(400).json({
          message: "otpChallengeId and otp are required for signup verification",
        });
      }

      const otpResult = verifySignupOtpChallenge({
        normalizedEmail,
        challengeId: String(otpChallengeId),
        otp: String(otp),
      });

      if (!otpResult.valid) {
        return res.status(otpResult.status).json({ message: otpResult.message });
      }
    }

    if (!BRACU_EMAIL_PATTERN.test(normalizedEmail)) {
      return res.status(400).json({
        message: "Only @g.bracu.ac.bd, @bracu.ac.bd, or @gmail.com email accounts are allowed",
      });
    }

    const emailHash = hashEmail(normalizedEmail);
    const existingByEmail = await User.findOne({ emailHash });

    if (existingByEmail) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const finalPseudonym = pseudonym ? String(pseudonym).trim().toLowerCase() : makePseudonym(normalizedEmail);

    const existingByPseudonym = await User.findOne({ pseudonym: finalPseudonym });
    if (existingByPseudonym) {
      return res.status(409).json({ message: "Pseudonym already in use" });
    }

    const userId = new mongoose.Types.ObjectId();

    const keySet = await ensureKeySet({
      ownerId: String(userId),
      domain: USER_PROFILE_DOMAIN,
    });

    const sealedProfile = sealProtectedRecord({
      fields: {
        email: normalizedEmail,
        fullName: String(fullName),
        contactInfo: String(contactInfo),
      },
      encryptionKey: {
        publicKey: keySet.ecc.runtime.publicKey,
      },
      keyId: keySet.ecc.keyId,
      macKeyHex: keySet.ecc.runtime.macKeyHex,
    });

    const passwordPayload = createPasswordHash(password);

    const user = await User.create({
      _id: userId,
      pseudonym: finalPseudonym,
      emailHash,
      password: {
        ...passwordPayload,
        changedAt: new Date(),
      },
      role: "user",
      profileProtectedData: sealedProfile.protectedFields,
      profileRecordMac: sealedProfile.recordMac,
      profileEncryptionMeta: {
        algorithm: "ECC",
        keyId: keySet.ecc.keyId,
        domain: USER_PROFILE_DOMAIN,
      },
      trust: {
        campusVerified: true,
        successfulTradeCount: 0,
        reportsReceived: 0,
        ratingCount: 0,
        ratingTotal: 0,
        ratingAverage: 5,
      },
      twoFactor: {
        enabled: true,
        method: "email-otp",
      },
    });

    return res.status(201).json({
      message: "Registration successful",
      user: userSummary(user),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to register" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password, otpMethod } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const emailHash = hashEmail(normalizedEmail);
    const user = await User.findOne({ emailHash });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (user.lockUntil && user.lockUntil.getTime() > Date.now()) {
      return res.status(423).json({ message: "Account temporarily locked due to failed attempts" });
    }

    const validPassword = verifyPassword(password, user.password);

    if (!validPassword) {
      user.failedLoginAttempts += 1;

      if (user.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
        user.failedLoginAttempts = 0;
      }

      await user.save();
      return res.status(401).json({ message: "Invalid credentials" });
    }

    user.failedLoginAttempts = 0;
    user.lockUntil = null;

    const selectedOtpMethod = normalizeLoginOtpMethod(otpMethod);

    if (selectedOtpMethod === "authenticator") {
      if (!user.twoFactor?.totpEnabled || !user.twoFactor?.totpSecretEncrypted?.ciphertext) {
        return res.status(400).json({
          message: "Authenticator is not enabled for this account. Choose email OTP or enable authenticator in Profile.",
        });
      }

      user.twoFactor.challengeId = null;
      user.twoFactor.otpSalt = null;
      user.twoFactor.otpHash = null;
      user.twoFactor.otpExpiresAt = null;
      user.twoFactor.otpAttempts = 0;

      await user.save();

      return res.status(200).json({
        message: "Primary credentials verified. Complete 2FA with authenticator code.",
        challengeId: null,
        twoFactorMethod: "totp",
        totpEnabled: true,
        otpDelivery: "authenticator",
      });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpSalt = createSalt();
    const otpHash = hashWithSalt({ value: otp, salt: otpSalt });
    const challengeId = crypto.randomBytes(12).toString("hex");

    user.twoFactor.challengeId = challengeId;
    user.twoFactor.otpSalt = otpSalt;
    user.twoFactor.otpHash = otpHash;
    user.twoFactor.otpExpiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000);
    user.twoFactor.otpAttempts = 0;

    await user.save();

    const delivery = await sendEmailOtp({
      to: normalizedEmail,
      otp,
      pseudonym: user.pseudonym,
      ttlSeconds: OTP_TTL_SECONDS,
    });

    const exposeDevOtp = shouldExposeDevOtp();

    if (!delivery.delivered && !exposeDevOtp) {
      return res.status(503).json({
        message: "OTP delivery is unavailable. Contact support or configure SMTP.",
      });
    }

    const response = {
      message: "Primary credentials verified. Complete 2FA.",
      challengeId,
      twoFactorMethod: user.twoFactor.method,
      totpEnabled: Boolean(user.twoFactor?.totpEnabled),
      otpDelivery: delivery.delivered ? "email" : "dev-fallback",
    };

    if (exposeDevOtp) {
      response.devOtp = otp;
    }

    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({ message: "Login failed" });
  }
};

export const verifySecondFactor = async (req, res) => {
  try {
    const { email, challengeId, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "email and otp are required" });
    }

    const emailHash = hashEmail(normalizeEmail(email));
    const user = await User.findOne({ emailHash });

    if (!user) {
      return res.status(401).json({ message: "Invalid 2FA verification request" });
    }

    // If authenticator is enabled, TOTP code can be used without depending on email challenge availability.
    if (user.twoFactor?.totpEnabled && user.twoFactor?.totpSecretEncrypted?.ciphertext) {
      const activeSecret = decryptTotpSecret(user.twoFactor.totpSecretEncrypted);
      const isTotpValid = verifyTotpCode({ token: otp, secretBase32: activeSecret });

      if (isTotpValid) {
        return issueLoginSuccessResponse({ req, res, user });
      }
    }

    if (!challengeId) {
      return res.status(401).json({
        message: "Invalid OTP. Provide a valid email challengeId or use authenticator code.",
      });
    }

    if (
      !user.twoFactor.challengeId ||
      user.twoFactor.challengeId !== challengeId ||
      !user.twoFactor.otpExpiresAt ||
      user.twoFactor.otpExpiresAt.getTime() <= Date.now()
    ) {
      return res.status(401).json({ message: "2FA challenge expired or invalid" });
    }

    if (user.twoFactor.otpAttempts >= 5) {
      return res.status(429).json({ message: "Too many invalid OTP attempts" });
    }

    const computed = hashWithSalt({ value: String(otp), salt: user.twoFactor.otpSalt });
    const expectedBuffer = Buffer.from(user.twoFactor.otpHash, "hex");
    const actualBuffer = Buffer.from(computed, "hex");

    if (
      expectedBuffer.length !== actualBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, actualBuffer)
    ) {
      user.twoFactor.otpAttempts += 1;
      await user.save();
      return res.status(401).json({ message: "Invalid OTP" });
    }

    return issueLoginSuccessResponse({ req, res, user });
  } catch (error) {
    return res.status(500).json({ message: "2FA verification failed" });
  }
};

export const setupTotp = async (req, res) => {
  try {
    const user = await User.findById(req.auth?.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const setup = await generateTotpSetup({
      accountLabel: user.pseudonym,
    });

    user.twoFactor.totpPendingSecretEncrypted = encryptTotpSecret(setup.secretBase32);
    user.twoFactor.totpSetupStartedAt = new Date();
    await user.save();

    return res.status(200).json({
      message: "Scan QR in Google Authenticator and verify with a 6-digit code.",
      qrCodeDataUrl: setup.qrCodeDataUrl,
      manualKey: setup.secretBase32,
      issuer: setup.issuer,
    });
  } catch {
    return res.status(500).json({ message: "Failed to initiate authenticator setup" });
  }
};

export const verifyTotpSetup = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ message: "code is required" });
    }

    const user = await User.findById(req.auth?.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.twoFactor?.totpPendingSecretEncrypted?.ciphertext) {
      return res.status(400).json({ message: "No pending authenticator setup found" });
    }

    const pendingSecret = decryptTotpSecret(user.twoFactor.totpPendingSecretEncrypted);
    const valid = verifyTotpCode({ token: code, secretBase32: pendingSecret });

    if (!valid) {
      return res.status(401).json({ message: "Invalid authenticator code" });
    }

    const promotedSecret = {
      iv: user.twoFactor.totpPendingSecretEncrypted.iv,
      tag: user.twoFactor.totpPendingSecretEncrypted.tag,
      ciphertext: user.twoFactor.totpPendingSecretEncrypted.ciphertext,
    };

    user.twoFactor.totpSecretEncrypted = promotedSecret;
    user.twoFactor.totpPendingSecretEncrypted = null;
    user.twoFactor.totpEnabled = true;
    user.twoFactor.totpSetupAt = new Date();
    user.twoFactor.method = "email-otp";
    await user.save();

    return res.status(200).json({
      message: "Authenticator enabled successfully",
      twoFactor: {
        totpEnabled: true,
      },
    });
  } catch {
    return res.status(500).json({ message: "Failed to verify authenticator setup" });
  }
};

export const disableTotp = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ message: "code is required" });
    }

    const user = await User.findById(req.auth?.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.twoFactor?.totpEnabled || !user.twoFactor?.totpSecretEncrypted?.ciphertext) {
      return res.status(400).json({ message: "Authenticator is not enabled" });
    }

    const activeSecret = decryptTotpSecret(user.twoFactor.totpSecretEncrypted);
    const valid = verifyTotpCode({ token: code, secretBase32: activeSecret });

    if (!valid) {
      return res.status(401).json({ message: "Invalid authenticator code" });
    }

    user.twoFactor.totpEnabled = false;
    user.twoFactor.totpSecretEncrypted = null;
    user.twoFactor.totpPendingSecretEncrypted = null;
    user.twoFactor.totpSetupStartedAt = null;
    user.twoFactor.totpSetupAt = null;
    await user.save();

    return res.status(200).json({ message: "Authenticator disabled" });
  } catch {
    return res.status(500).json({ message: "Failed to disable authenticator" });
  }
};

export const refreshSession = async (req, res) => {
  try {
    const refreshToken = getRefreshTokenFromRequest(req);

    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token missing" });
    }

    const rotated = await rotateRefreshToken({
      refreshToken,
      userAgent: req.headers["user-agent"] || "",
      ipAddress: safeIp(req),
    });

    setRefreshCookie(res, rotated.refreshToken);

    return res.status(200).json({
      message: "Session refreshed",
      accessToken: rotated.accessToken,
    });
  } catch (error) {
    return res.status(401).json({ message: "Invalid refresh token" });
  }
};

export const logout = async (req, res) => {
  try {
    const refreshToken = getRefreshTokenFromRequest(req);

    if (refreshToken) {
      await revokeSessionByRefreshToken(refreshToken);
    }

    clearRefreshCookie(res);
    return res.status(200).json({ message: "Logged out" });
  } catch (error) {
    clearRefreshCookie(res);
    return res.status(200).json({ message: "Logged out" });
  }
};
