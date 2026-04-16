import mongoose, { Schema } from "mongoose";

const tradeDisputeSchema = new Schema(
  {
    bid: {
      type: Schema.Types.ObjectId,
      ref: "Bid",
      required: true,
      index: true,
    },
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
    buyer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    openedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reason: {
      type: String,
      default: "Confirmation mismatch",
    },
    status: {
      type: String,
      enum: ["open", "resolved", "dismissed"],
      default: "open",
      index: true,
    },
    resolutionNote: {
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

tradeDisputeSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model("TradeDispute", tradeDisputeSchema);
