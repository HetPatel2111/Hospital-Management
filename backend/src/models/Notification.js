import mongoose from "mongoose";

const deliverySchema = new mongoose.Schema(
  {
    email: {
      type: String,
      enum: ["not_sent", "sent", "failed"],
      default: "not_sent"
    },
    sms: {
      type: String,
      enum: ["not_sent", "sent", "failed"],
      default: "not_sent"
    },
    push: {
      type: String,
      enum: ["not_sent", "sent", "failed"],
      default: "not_sent"
    }
  },
  { _id: false }
);

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ["appointment", "payment", "refund", "prescription", "system"],
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ["unread", "read"],
      default: "unread",
      index: true
    },
    delivery: {
      type: deliverySchema,
      default: () => ({})
    },
    metadata: {
      type: Object,
      default: {}
    }
  },
  {
    timestamps: true,
    collection: "notifications"
  }
);

notificationSchema.index({ userId: 1, status: 1 });
notificationSchema.index({ userId: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
