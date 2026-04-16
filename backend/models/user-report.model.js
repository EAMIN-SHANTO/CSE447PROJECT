import mongoose, { Schema } from "mongoose";

const userReportSchema = new Schema(
  {
    reporter: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    reportedUser: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    post: {
      type: Schema.Types.ObjectId,
      ref: "Post",
      default: null,
    },
    bid: {
      type: Schema.Types.ObjectId,
      ref: "Bid",
      default: null,
    },
    reason: {
      type: String,
      required: true,
      minlength: 5,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: ["open", "reviewed", "resolved", "dismissed"],
      default: "open",
      index: true,
    },
    adminNote: {
      type: String,
      default: "",
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

userReportSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model("UserReport", userReportSchema);
