import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
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
    currency: {
      type: String,
      required: true,
      default: "INR"
    },
    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    razorpayPaymentId: {
      type: String,
      sparse: true,
      index: true
    },
    razorpaySignature: {
      type: String
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "success", "failed", "refunded"],
      default: "pending",
      required: true,
      index: true
    },
    paymentMethod: {
      type: String
    },
    paidAt: {
      type: Date
    },
    refundStatus: {
      type: String,
      enum: ["none", "requested", "processing", "refunded"],
      default: "none",
      required: true,
      index: true
    },
    gatewayResponse: {
      type: mongoose.Schema.Types.Mixed
    }
  },
  {
    timestamps: true,
    collection: "payments"
  }
);

paymentSchema.index({ createdAt: -1 });

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;
