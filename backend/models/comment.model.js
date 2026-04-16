import mongoose, { Schema } from "mongoose";

const commentSchema = new Schema(
  {
    post: {
      type: Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      index: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    parentComment: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
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
        default: "comment-data",
      },
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

commentSchema.index({ post: 1, createdAt: -1 });

export default mongoose.model("Comment", commentSchema);
