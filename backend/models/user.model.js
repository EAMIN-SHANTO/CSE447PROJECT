import mongoose, { Schema } from "mongoose";

const userSchema = new Schema(
  {
    pseudonym: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    emailHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    password: {
      hash: {
        type: String,
        required: true,
      },
      salt: {
        type: String,
        required: true,
      },
      iterations: {
        type: Number,
        required: true,
        default: 120000,
      },
      keyLength: {
        type: Number,
        required: true,
        default: 64,
      },
      digest: {
        type: String,
        required: true,
        default: "sha512",
      },
      changedAt: {
        type: Date,
        default: Date.now,
      },
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
      index: true,
    },
    profileProtectedData: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },
    profileRecordMac: {
      type: String,
      required: true,
    },
    profileEncryptionMeta: {
      algorithm: {
        type: String,
        enum: ["ECC", "RSA"],
        required: true,
      },
      keyId: {
        type: String,
        required: true,
      },
      domain: {
        type: String,
        required: true,
        default: "user-profile",
      },
    },
    trust: {
      campusVerified: {
        type: Boolean,
        default: true,
      },
      successfulTradeCount: {
        type: Number,
        default: 0,
      },
      reportsReceived: {
        type: Number,
        default: 0,
      },
    },
    twoFactor: {
      enabled: {
        type: Boolean,
        default: true,
      },
      method: {
        type: String,
        enum: ["email-otp", "totp"],
        default: "email-otp",
      },
      challengeId: {
        type: String,
        default: null,
      },
      otpHash: {
        type: String,
        default: null,
      },
      otpSalt: {
        type: String,
        default: null,
      },
      otpExpiresAt: {
        type: Date,
        default: null,
      },
      otpAttempts: {
        type: Number,
        default: 0,
      },
      verifiedAt: {
        type: Date,
        default: null,
      },
      totpEnabled: {
        type: Boolean,
        default: false,
      },
      totpSecretEncrypted: {
        iv: {
          type: String,
          default: null,
        },
        tag: {
          type: String,
          default: null,
        },
        ciphertext: {
          type: String,
          default: null,
        },
      },
      totpPendingSecretEncrypted: {
        iv: {
          type: String,
          default: null,
        },
        tag: {
          type: String,
          default: null,
        },
        ciphertext: {
          type: String,
          default: null,
        },
      },
      totpSetupStartedAt: {
        type: Date,
        default: null,
      },
      totpSetupAt: {
        type: Date,
        default: null,
      },
    },
    accountStatus: {
      type: String,
      enum: ["active", "locked"],
      default: "active",
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
      default: null,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
