import { Schema } from "mongoose";
import mongoose from "mongoose";

const postSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
    },
    protectedData: {
      type: Schema.Types.Mixed,
      default: {},
      required: true,
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
        default: "post-data",
      },
    },
    category: {
      type: String,
      default: "general",
    },
    marketStatus: {
      type: String,
      enum: ["open", "locked", "completed", "cancelled"],
      default: "open",
      index: true,
    },
    biddingEndsAt: {
      type: Date,
      default: () => new Date(Date.now() + 48 * 60 * 60 * 1000),
      index: true,
    },
    winningBid: {
      type: Schema.Types.ObjectId,
      ref: "Bid",
      default: null,
    },
    isLocked: {
      type: Boolean,
      default: false,
      index: true,
    },
    lockedAt: {
      type: Date,
      default: null,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    visit: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Post", postSchema);