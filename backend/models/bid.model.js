import mongoose, { Schema } from "mongoose";

const bidSchema = new Schema(
  {
    post: {
      type: Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      index: true,
    },
    seller: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    bidder: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "cancelled", "completed", "disputed"],
      default: "pending",
      index: true,
    },
    protectedData: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },
    recordMac: {
      type: String,
      required: true,
    },
    encryptionMeta: {
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
        default: "bid-data",
      },
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    transaction: {
      winnerReference: {
        bidderId: {
          type: Schema.Types.ObjectId,
          ref: "User",
          default: null,
        },
        bidderPseudonym: {
          type: String,
          default: "",
        },
      },
      exchangeCodeHash: {
        type: String,
        default: null,
      },
      exchangeCodeSalt: {
        type: String,
        default: null,
      },
      exchangeCodeExpiresAt: {
        type: Date,
        default: null,
      },
      exchangeCodeUsedAt: {
        type: Date,
        default: null,
      },
      meetupProtectedData: {
        type: Schema.Types.Mixed,
        default: {},
      },
      meetupRecordMac: {
        type: String,
        default: null,
      },
      meetupEncryptionMeta: {
        algorithm: {
          type: String,
          enum: ["ECC", "RSA"],
          default: null,
        },
        keyId: {
          type: String,
          default: null,
        },
        domain: {
          type: String,
          default: "transaction-package",
        },
      },
      confirmations: {
        seller: {
          status: {
            type: String,
            enum: ["pending", "completed", "failed"],
            default: "pending",
          },
          at: {
            type: Date,
            default: null,
          },
          note: {
            type: String,
            default: "",
          },
        },
        buyer: {
          status: {
            type: String,
            enum: ["pending", "completed", "failed"],
            default: "pending",
          },
          at: {
            type: Date,
            default: null,
          },
          note: {
            type: String,
            default: "",
          },
        },
      },
      disputeStatus: {
        type: String,
        enum: ["none", "open", "resolved"],
        default: "none",
      },
      disputeId: {
        type: Schema.Types.ObjectId,
        ref: "TradeDispute",
        default: null,
      },
    },
  },
  { timestamps: true }
);

bidSchema.index({ post: 1, bidder: 1, status: 1 });

export default mongoose.model("Bid", bidSchema);
