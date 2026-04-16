import crypto from "crypto";
import mongoose from "mongoose";
import User from "../models/user.model.js";
import { ensureKeySet } from "../lib/crypto/key-manager.js";
import { sealProtectedRecord } from "../lib/crypto/protected-record.js";
import { createPasswordHash, createSalt, hashWithSalt, verifyPassword } from "../lib/auth/password.js";
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
const BRACU_EMAIL_PATTERN = /^[^@\s]+@(g\.bracu\.ac\.bd|bracu\.ac\.bd)$/;

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
});

const safeIp = (req) =>
  req.headers["x-forwarded-for"]?.toString().split(",")[0].trim() || req.socket?.remoteAddress || "";

export const register = async (req, res) => {
  try {
    const { email, password, pseudonym, fullName = "", contactInfo = "" } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "password must be at least 8 characters" });
    }

    const normalizedEmail = normalizeEmail(email);

    if (!BRACU_EMAIL_PATTERN.test(normalizedEmail)) {
      return res.status(400).json({
        message: "Only @g.bracu.ac.bd or @bracu.ac.bd email accounts are allowed",
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
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const emailHash = hashEmail(email);
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

    console.log(`2FA OTP for ${user.pseudonym}: ${otp}`);

    const response = {
      message: "Primary credentials verified. Complete 2FA.",
      challengeId,
      twoFactorMethod: user.twoFactor.method,
    };

    if (process.env.NODE_ENV !== "production") {
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

    if (!email || !challengeId || !otp) {
      return res.status(400).json({ message: "email, challengeId and otp are required" });
    }

    const emailHash = hashEmail(email);
    const user = await User.findOne({ emailHash });

    if (!user) {
      return res.status(401).json({ message: "Invalid 2FA verification request" });
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
  } catch (error) {
    return res.status(500).json({ message: "2FA verification failed" });
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
