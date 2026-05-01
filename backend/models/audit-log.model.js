import mongoose, { Schema } from "mongoose";

const auditLogSchema = new Schema(
  {
    action: {
      type: String,
      required: true,
      enum: ["CREATE_POST", "UPDATE_POST", "DELETE_POST", "CONFIRM_TRADE", "RESOLVE_DISPUTE", "ROTATE_KEYS"],
    },
    actor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    target: {
      type: Schema.Types.ObjectId,
      required: false, // ID of the post, bid, etc.
    },
    details: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

export default AuditLog;
