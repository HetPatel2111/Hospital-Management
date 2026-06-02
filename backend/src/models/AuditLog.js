import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true
    },
    actorRole: {
      type: String,
      enum: ["patient", "doctor", "admin", "system"],
      required: true,
      index: true
    },
    action: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    resourceType: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    versionKey: false,
    collection: "audit_logs"
  }
);

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

export default AuditLog;
