import mongoose, { Schema } from "mongoose";

const encryptedBlobSchema = new Schema(
  {
    wrapperKeyId: {
      type: String,
      required: true,
    },
    cipherPayload: {
      type: Schema.Types.Mixed,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const keyMetadataSchema = new Schema(
  {
    ownerId: {
      type: String,
      required: true,
      index: true,
    },
    domain: {
      type: String,
      required: true,
      index: true,
    },
    algorithm: {
      type: String,
      enum: ["RSA", "ECC"],
      required: true,
      index: true,
    },
    keyId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    version: {
      type: Number,
      required: true,
      default: 1,
    },
    status: {
      type: String,
      enum: ["active", "rotated", "revoked"],
      default: "active",
      index: true,
    },
    publicKey: {
      type: Schema.Types.Mixed,
      required: true,
    },
    privateKeyBackup: {
      type: encryptedBlobSchema,
      required: true,
    },
    macKeyBackup: {
      type: encryptedBlobSchema,
      required: true,
    },
    distribution: {
      scope: {
        type: String,
        default: "server-internal",
      },
      channels: {
        type: [String],
        default: [],
      },
      note: {
        type: String,
        default: "",
      },
    },
    rotationReason: {
      type: String,
      default: "initial",
    },
    rotatedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

keyMetadataSchema.index({ ownerId: 1, domain: 1, algorithm: 1, status: 1 });

export default mongoose.model("KeyMetadata", keyMetadataSchema);
