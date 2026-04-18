import mongoose, { Schema } from "mongoose";

const messageSchema = new Schema(
  {
    conversation: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
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
        default: "message-data",
      },
    },
  },
  { timestamps: true }
);

messageSchema.index({ conversation: 1, createdAt: -1 });

export default mongoose.model("Message", messageSchema);
