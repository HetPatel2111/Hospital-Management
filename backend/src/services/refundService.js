import Razorpay from "razorpay";
import Refund from "../models/Refund.js";
import Appointment from "../models/Appointment.js";
import Payment from "../models/Payment.js";
import Patient from "../models/Patient.js";
import Notification from "../models/Notification.js";
import { AUDIT_ACTIONS, createAuditLog } from "./auditService.js";
import AppError from "../utils/AppError.js";

// Lazy initialize Razorpay instance to avoid crashing during offline tests
let razorpayInstance = null;
const getRazorpayInstance = () => {
  if (razorpayInstance) return razorpayInstance;

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new AppError(
      "Razorpay credentials are not configured",
      500,
      "RAZORPAY_CONFIGURATION_ERROR"
    );
  }

  razorpayInstance = new Razorpay({
    key_id: keyId,
    key_secret: keySecret
  });

  return razorpayInstance;
};

/**
 * Patient requests a refund for a cancelled appointment
 */
export const requestRefund = async (patientUserId, appointmentId, refundReason) => {
  if (!refundReason || refundReason.trim().length === 0) {
    throw new AppError("Refund reason is required", 400, "VALIDATION_ERROR");
  }

  const patient = await Patient.findOne({ userId: patientUserId });
  if (!patient) {
    throw new AppError("Patient profile not found", 404, "PATIENT_PROFILE_NOT_FOUND");
  }

  const appointment = await Appointment.findById(appointmentId).populate("paymentId");
  if (!appointment) {
    throw new AppError("Appointment not found", 404, "APPOINTMENT_NOT_FOUND");
  }

  // Permission Check
  if (appointment.patientId.toString() !== patient._id.toString()) {
    throw new AppError("You do not have permission to request a refund for this appointment", 403, "FORBIDDEN");
  }

  // Check Eligibility Conditions
  if (appointment.status === "completed") {
    throw new AppError("Completed appointments are not eligible for a refund", 400, "ELIGIBILITY_ERROR");
  }

  if (appointment.status !== "cancelled") {
    if (appointment.status === "refunded" || appointment.status === "refund_requested" || appointment.status === "refund_processing") {
      throw new AppError(`A refund has already been requested or processed for this appointment. Current status: ${appointment.status}`, 400, "DUPLICATE_REFUND_REQUEST");
    }
    throw new AppError("Refunds can only be requested for cancelled appointments", 400, "ELIGIBILITY_ERROR");
  }

  const payment = appointment.paymentId;
  if (!payment || payment.paymentStatus !== "success") {
    throw new AppError("No successful payment was found associated with this appointment", 400, "PAYMENT_NOT_FOUND");
  }

  // Prevent Duplicate Requests
  const existingRefund = await Refund.findOne({ appointmentId });
  if (existingRefund) {
    throw new AppError("A refund has already been requested for this appointment", 400, "DUPLICATE_REFUND_REQUEST");
  }

  // Calculate Refund percentage & amount based on cancellation date
  const scheduledTime = new Date(appointment.appointmentDate).getTime();
  const cancellationTime = new Date(appointment.cancellation?.cancelledAt || appointment.updatedAt || new Date()).getTime();
  
  // Calculate difference in hours
  const hoursDiff = (scheduledTime - cancellationTime) / (1000 * 60 * 60);

  let refundPercentage = 0;
  let refundAmount = 0;

  if (hoursDiff >= 24) {
    refundPercentage = 100;
    refundAmount = payment.amount;
  } else if (hoursDiff > 0 && hoursDiff < 24) {
    refundPercentage = 50;
    refundAmount = payment.amount * 0.5;
  } else {
    throw new AppError("Appointments cancelled after their scheduled start time are not eligible for a refund", 400, "ELIGIBILITY_ERROR");
  }

  // Create Refund record (permanently storing computed refund values)
  const refund = await Refund.create({
    appointmentId: appointment._id,
    paymentId: payment._id,
    patientId: patient._id,
    amount: payment.amount,
    refundPercentage,
    refundAmount,
    refundReason,
    refundStatus: "requested",
    requestedAt: new Date()
  });

  // Transition appointment lifecycle to refund_requested
  appointment.status = "refund_requested";
  await appointment.save();

  // Update payment record
  payment.refundStatus = "requested";
  await payment.save();

  // Audit Logs
  await createAuditLog({
    actorId: patientUserId,
    actorRole: "patient",
    action: AUDIT_ACTIONS.REFUND_REQUESTED,
    resourceType: "refunds",
    resourceId: refund._id
  });

  return refund;
};

/**
 * Fetch patient's private refund history
 */
export const getMyRefunds = async (patientUserId) => {
  const patient = await Patient.findOne({ userId: patientUserId });
  if (!patient) {
    throw new AppError("Patient profile not found", 404, "PATIENT_PROFILE_NOT_FOUND");
  }

  const refunds = await Refund.find({ patientId: patient._id })
    .populate({
      path: "appointmentId",
      populate: {
        path: "doctorId",
        select: "specialization qualification userId",
        populate: { path: "userId", select: "name" }
      }
    })
    .populate("paymentId")
    .sort({ createdAt: -1 });

  return refunds;
};

/**
 * Retrieve administrative refunds listing with pagination & filters
 */
export const getAllRefunds = async (query = {}) => {
  const { page = 1, limit = 10, status, patientId } = query;

  const filter = {};
  if (status) filter.refundStatus = status;
  if (patientId) filter.patientId = patientId;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const limitNum = parseInt(limit);

  const refunds = await Refund.find(filter)
    .populate({
      path: "appointmentId",
      populate: {
        path: "doctorId",
        select: "specialization qualification userId",
        populate: { path: "userId", select: "name email phone" }
      }
    })
    .populate({
      path: "patientId",
      populate: {
        path: "userId",
        select: "name email phone"
      }
    })
    .populate("paymentId")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  const total = await Refund.countDocuments(filter);

  return {
    refunds,
    pagination: {
      total,
      page: parseInt(page),
      limit: limitNum,
      pages: Math.ceil(total / limitNum)
    }
  };
};

/**
 * Admin approves refund request
 */
export const approveRefund = async (adminUserId, refundId, adminRemarks) => {
  const refund = await Refund.findById(refundId);
  if (!refund) {
    throw new AppError("Refund request not found", 404, "REFUND_NOT_FOUND");
  }

  if (refund.refundStatus !== "requested") {
    throw new AppError(`Refund request cannot be approved from status: ${refund.refundStatus}`, 400, "INVALID_STATUS");
  }

  refund.refundStatus = "approved";
  refund.approvedBy = adminUserId;
  refund.adminRemarks = adminRemarks || "Approved by administrator";
  refund.decisionAt = new Date();
  await refund.save();

  // Audit Logs
  await createAuditLog({
    actorId: adminUserId,
    actorRole: "admin",
    action: AUDIT_ACTIONS.REFUND_APPROVED,
    resourceType: "refunds",
    resourceId: refund._id
  });

  return refund;
};

/**
 * Admin rejects refund request
 */
export const rejectRefund = async (adminUserId, refundId, adminRemarks) => {
  if (!adminRemarks || adminRemarks.trim().length === 0) {
    throw new AppError("Admin remarks are required when rejecting a refund", 400, "VALIDATION_ERROR");
  }

  const refund = await Refund.findById(refundId).populate("appointmentId").populate("paymentId");
  if (!refund) {
    throw new AppError("Refund request not found", 404, "REFUND_NOT_FOUND");
  }

  if (refund.refundStatus !== "requested") {
    throw new AppError(`Refund request cannot be rejected from status: ${refund.refundStatus}`, 400, "INVALID_STATUS");
  }

  refund.refundStatus = "rejected";
  refund.rejectedBy = adminUserId;
  refund.adminRemarks = adminRemarks;
  refund.decisionAt = new Date();
  await refund.save();

  // Revert appointment status back to cancelled
  if (refund.appointmentId) {
    refund.appointmentId.status = "cancelled";
    await refund.appointmentId.save();
  }

  // Revert payment refund status
  if (refund.paymentId) {
    refund.paymentId.refundStatus = "none";
    await refund.paymentId.save();
  }

  // Audit Logs
  await createAuditLog({
    actorId: adminUserId,
    actorRole: "admin",
    action: AUDIT_ACTIONS.REFUND_REJECTED,
    resourceType: "refunds",
    resourceId: refund._id
  });

  return refund;
};

/**
 * Admin processes the approved refund (calls Razorpay API)
 */
export const processRefund = async (adminUserId, refundId) => {
  const refund = await Refund.findById(refundId)
    .populate("appointmentId")
    .populate("paymentId");

  if (!refund) {
    throw new AppError("Refund request not found", 404, "REFUND_NOT_FOUND");
  }

  // Prevent duplicate processing attempts
  if (refund.refundStatus === "refunded" || refund.refundStatus === "processing") {
    throw new AppError("This refund has already been processed or is currently in progress", 400, "DUPLICATE_PROCESSING_ATTEMPT");
  }

  if (refund.refundStatus !== "approved") {
    throw new AppError(`Only approved refunds can be processed. Current status: ${refund.refundStatus}`, 400, "INVALID_STATUS");
  }

  // Update status to processing and save immediately to avoid race condition double clicks
  refund.refundStatus = "processing";
  await refund.save();

  // Transition appointment to refund_processing
  if (refund.appointmentId) {
    refund.appointmentId.status = "refund_processing";
    await refund.appointmentId.save();
  }

  const payment = refund.paymentId;
  const razorpay = getRazorpayInstance();
  const refundAmountInPaisa = Math.round(refund.refundAmount * 100);

  let gatewayRefund;
  try {
    gatewayRefund = await razorpay.payments.refund(payment.razorpayPaymentId, {
      amount: refundAmountInPaisa,
      notes: {
        refundId: refund._id.toString(),
        appointmentId: refund.appointmentId?._id.toString()
      }
    });
  } catch (error) {
    // If Razorpay API fails, revert the state to approved to allow retry
    refund.refundStatus = "approved";
    await refund.save();

    if (refund.appointmentId) {
      refund.appointmentId.status = "refund_requested";
      await refund.appointmentId.save();
    }

    throw new AppError(
      `Razorpay refund generation failed: ${error.message}`,
      500,
      "RAZORPAY_REFUND_ERROR"
    );
  }

  // Successful Refund Execution
  refund.refundStatus = "refunded";
  refund.processedAt = new Date();
  refund.gatewayRefundId = gatewayRefund.id;
  refund.gatewayResponse = gatewayRefund;
  await refund.save();

  // Update Payment record
  payment.refundStatus = "refunded";
  payment.paymentStatus = "refunded";
  await payment.save();

  // Update Appointment status to refunded
  if (refund.appointmentId) {
    refund.appointmentId.status = "refunded";
    await refund.appointmentId.save();
  }

  // Notify Patient
  await Notification.create({
    userId: payment.patientId, // patientId is referenced, wait, patient is Patient model, notify userId of user.
    // Let's resolve userId for notification
    userId: refund.appointmentId?.patientId?.userId || payment.patientId?.userId || payment.patientId,
    type: "refund",
    title: "Refund Processed Successfully",
    message: `Your refund of ₹${refund.refundAmount} (Order ID: ${payment.razorpayOrderId}) has been processed and credited to your account.`
  });

  // Audit Logs
  await createAuditLog({
    actorId: adminUserId,
    actorRole: "admin",
    action: AUDIT_ACTIONS.REFUND_COMPLETED,
    resourceType: "refunds",
    resourceId: refund._id
  });

  return refund;
};
