import crypto from "crypto";
import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "../models/user.model.js";
import connectDB from "../lib/connectDB.js";
import { ensureKeySet } from "../lib/crypto/key-manager.js";
import { sealProtectedRecord } from "../lib/crypto/protected-record.js";
import { createPasswordHash } from "../lib/auth/password.js";

dotenv.config();

const USER_PROFILE_DOMAIN = "user-profile";
const ALLOWED_EMAIL_PATTERN = /^[^@\s]+@(g\.bracu\.ac\.bd|bracu\.ac\.bd|gmail\.com)$/i;

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
const hashEmail = (email) => crypto.createHash("sha256").update(normalizeEmail(email)).digest("hex");

const parseArg = (name) => {
  const prefix = `--${name}=`;
  const arg = process.argv.find((entry) => entry.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : "";
};

const makePseudonym = (seed) => {
  const suffix = crypto.createHash("sha256").update(seed).digest("hex").slice(0, 8);
  return `admin_${suffix}`;
};

const ensureUniquePseudonym = async (candidateBase) => {
  let candidate = candidateBase;
  let counter = 0;

  // Keep trying with small suffixes until pseudonym is unique.
  while (await User.findOne({ pseudonym: candidate })) {
    counter += 1;
    candidate = `${candidateBase}${counter}`.slice(0, 30);
  }

  return candidate;
};

const run = async () => {
  const email = normalizeEmail(parseArg("email"));
  const password = parseArg("password");
  const pseudonymArg = normalizeEmail(parseArg("pseudonym")).replace(/[^a-z0-9_]/g, "");

  if (!email || !password) {
    console.error("Usage: npm run admin:create -- --email=you@example.com --password=StrongPass123");
    process.exit(1);
  }

  if (!ALLOWED_EMAIL_PATTERN.test(email)) {
    console.error("Invalid email format/domain. Allowed: @g.bracu.ac.bd, @bracu.ac.bd, @gmail.com");
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is missing in backend/.env");
    process.exit(1);
  }

  await connectDB();

  try {
    const emailHash = hashEmail(email);
    const existing = await User.findOne({ emailHash });

    if (existing) {
      existing.role = "admin";
      existing.password = {
        ...createPasswordHash(password),
        changedAt: new Date(),
      };
      existing.accountStatus = "active";
      existing.failedLoginAttempts = 0;
      existing.lockUntil = null;
      existing.twoFactor.enabled = true;
      existing.twoFactor.method = "email-otp";

      await existing.save();

      console.log("Existing user promoted to admin and password updated:");
      console.log(`- userId: ${existing._id}`);
      console.log(`- pseudonym: ${existing.pseudonym}`);
      console.log(`- email: ${email}`);
      return;
    }

    const userId = new mongoose.Types.ObjectId();
    const keySet = await ensureKeySet({
      ownerId: String(userId),
      domain: USER_PROFILE_DOMAIN,
    });

    const sealedProfile = sealProtectedRecord({
      fields: {
        email,
        fullName: "Admin User",
        contactInfo: "",
      },
      encryptionKey: {
        publicKey: keySet.ecc.runtime.publicKey,
      },
      keyId: keySet.ecc.keyId,
      macKeyHex: keySet.ecc.runtime.macKeyHex,
    });

    const pseudonymBase = pseudonymArg || makePseudonym(email);
    const pseudonym = await ensureUniquePseudonym(pseudonymBase);

    const created = await User.create({
      _id: userId,
      pseudonym,
      emailHash,
      password: {
        ...createPasswordHash(password),
        changedAt: new Date(),
      },
      role: "admin",
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
      accountStatus: "active",
      failedLoginAttempts: 0,
      lockUntil: null,
    });

    console.log("New admin account created:");
    console.log(`- userId: ${created._id}`);
    console.log(`- pseudonym: ${created.pseudonym}`);
    console.log(`- email: ${email}`);
  } finally {
    await mongoose.disconnect();
  }
};

run().catch((error) => {
  console.error("Failed to create/promote admin:", error.message);
  process.exit(1);
});
