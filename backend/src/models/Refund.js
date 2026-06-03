import mongoose from "mongoose";

const refundSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
      index: true
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      required: true,
      index: true
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
      index: true
    },
    amount: {
      type: Number,
      required: true
    },
    refundPercentage: {
      type: Number,
      required: true
    },
    refundAmount: {
      type: Number,
      required: true
    },
    refundReason: {
      type: String,
      required: true,
      trim: true
    },
    refundStatus: {
      type: String,
      enum: ["requested", "approved", "rejected", "processing", "refunded"],
      default: "requested",
      required: true,
      index: true
    },
    requestedAt: {
      type: Date,
      default: Date.now,
      required: true
    },
    processedAt: {
      type: Date
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true
    },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true
    },
    adminRemarks: {
      type: String,
      trim: true,
      default: ""
    },
    decisionAt: {
      type: Date
    },
    gatewayRefundId: {
      type: String,
      index: true
    },
    gatewayResponse: {
      type: mongoose.Schema.Types.Mixed
    }
  },
  {
    timestamps: true,
    collection: "refunds"
  }
);

refundSchema.index({ createdAt: -1 });

const Refund = mongoose.model("Refund", refundSchema);
export default Refund;
