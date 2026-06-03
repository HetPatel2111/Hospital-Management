import crypto from "crypto";
import Razorpay from "razorpay";
import Appointment from "../models/Appointment.js";
import Patient from "../models/Patient.js";
import Payment from "../models/Payment.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { AUDIT_ACTIONS, createAuditLog } from "./auditService.js";
import AppError from "../utils/AppError.js";

// Lazy initialize Razorpay instance to avoid crashing during tests if secrets are missing
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

export const createOrder = async (patientUserId, appointmentId) => {
  const patient = await Patient.findOne({ userId: patientUserId });
  if (!patient) {
    throw new AppError("Patient profile not found", 404, "PATIENT_PROFILE_NOT_FOUND");
  }

  const appointment = await Appointment.findById(appointmentId).populate({
    path: "doctorId",
    populate: { path: "userId" }
  });

  if (!appointment) {
    throw new AppError("Appointment not found", 404, "APPOINTMENT_NOT_FOUND");
  }

  if (appointment.patientId.toString() !== patient._id.toString()) {
    throw new AppError("You do not have permission to pay for this appointment", 403, "FORBIDDEN");
  }

  if (appointment.status !== "pending_payment") {
    throw new AppError(
      `Payment is not required. Current status: ${appointment.status}`,
      400,
      "INVALID_APPOINTMENT_STATUS"
    );
  }

  const doctor = appointment.doctorId;
  if (!doctor) {
    throw new AppError("Doctor profile associated with appointment not found", 404, "DOCTOR_NOT_FOUND");
  }

  const amount = doctor.consultationFee;
  if (!amount || amount <= 0) {
    throw new AppError("Consultation fee is not valid", 400, "INVALID_FEE_AMOUNT");
  }

  const razorpay = getRazorpayInstance();
  const options = {
    amount: Math.round(amount * 100), // convert to paisa
    currency: "INR",
    receipt: appointment._id.toString()
  };

  let order;
  try {
    order = await razorpay.orders.create(options);
  } catch (error) {
    throw new AppError(
      `Failed to create Razorpay order: ${error.message}`,
      500,
      "RAZORPAY_ORDER_ERROR"
    );
  }

  // Create payment record
  const payment = await Payment.create({
    appointmentId: appointment._id,
    patientId: patient._id,
    amount,
    currency: "INR",
    razorpayOrderId: order.id,
    paymentStatus: "pending"
  });

  await createAuditLog({
    actorId: patientUserId,
    actorRole: "patient",
    action: AUDIT_ACTIONS.PAYMENT_CREATED,
    resourceType: "payments",
    resourceId: payment._id
  });

  return {
    keyId: process.env.RAZORPAY_KEY_ID,
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    paymentId: payment._id
  };
};

export const verifyPayment = async (patientUserId, { appointmentId, razorpayOrderId, razorpayPaymentId, razorpaySignature, paymentMethod, gatewayResponse }) => {
  const patient = await Patient.findOne({ userId: patientUserId });
  if (!patient) {
    throw new AppError("Patient profile not found", 404, "PATIENT_PROFILE_NOT_FOUND");
  }

  const payment = await Payment.findOne({ razorpayOrderId }).populate("appointmentId");
  if (!payment) {
    throw new AppError("Payment record associated with order ID not found", 404, "PAYMENT_NOT_FOUND");
  }

  // Prevent duplicate verification attempts
  if (payment.paymentStatus === "success") {
    throw new AppError("This payment has already been verified and processed", 400, "DUPLICATE_VERIFICATION");
  }

  const appointment = await Appointment.findById(appointmentId).populate({
    path: "doctorId",
    populate: { path: "userId" }
  });

  if (!appointment) {
    throw new AppError("Appointment not found", 404, "APPOINTMENT_NOT_FOUND");
  }

  // Compute HMAC SHA256 Signature to verify authenticity
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    throw new AppError("Razorpay key secret is not configured", 500, "SERVER_CONFIGURATION_ERROR");
  }

  const body = razorpayOrderId + "|" + razorpayPaymentId;
  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(body.toString())
    .digest("hex");

  const isSignatureValid = expectedSignature === razorpaySignature;

  if (!isSignatureValid) {
    payment.paymentStatus = "failed";
    await payment.save();

    await createAuditLog({
      actorId: patientUserId,
      actorRole: "patient",
      action: AUDIT_ACTIONS.PAYMENT_FAILED,
      resourceType: "payments",
      resourceId: payment._id
    });

    throw new AppError("Payment signature verification failed", 400, "INVALID_SIGNATURE");
  }

  // Capture success states
  payment.razorpayPaymentId = razorpayPaymentId;
  payment.razorpaySignature = razorpaySignature;
  payment.paymentStatus = "success";
  payment.paidAt = new Date();
  payment.paymentMethod = paymentMethod || "razorpay";
  payment.gatewayResponse = gatewayResponse || { razorpayOrderId, razorpayPaymentId, razorpaySignature };
  payment.refundStatus = "none";
  await payment.save();

  // Set appointment status to payment_completed, then confirmed
  appointment.status = "payment_completed";
  await appointment.save();

  appointment.status = "confirmed";
  appointment.paymentId = payment._id;
  await appointment.save();

  // Notify doctor
  if (appointment.doctorId?.userId?._id) {
    await Notification.create({
      userId: appointment.doctorId.userId._id,
      type: "appointment",
      title: "Appointment Paid & Confirmed",
      message: `Appointment for ${new Date(appointment.appointmentDate).toDateString()} at ${appointment.startTime} has been paid and confirmed.`
    });
  }

  // Notify patient
  await Notification.create({
    userId: patientUserId,
    type: "appointment",
    title: "Payment Successful",
    message: `Your payment of $${payment.amount} for your appointment on ${new Date(appointment.appointmentDate).toDateString()} was successful.`
  });

  await createAuditLog({
    actorId: patientUserId,
    actorRole: "patient",
    action: AUDIT_ACTIONS.PAYMENT_SUCCESS,
    resourceType: "payments",
    resourceId: payment._id
  });

  return {
    success: true,
    paymentStatus: "success",
    appointmentStatus: "confirmed"
  };
};

export const getPaymentById = async (userId, role, paymentId) => {
  const payment = await Payment.findById(paymentId)
    .populate({
      path: "appointmentId",
      populate: { path: "doctorId", populate: { path: "userId" } }
    })
    .populate({
      path: "patientId",
      populate: { path: "userId" }
    });

  if (!payment) {
    throw new AppError("Payment record not found", 404, "PAYMENT_NOT_FOUND");
  }

  // Access check: Admins can see anything. Users must be the patient or doctor in this consult
  if (role === "admin") {
    return payment;
  }

  if (role === "patient") {
    if (payment.patientId?.userId?._id?.toString() !== userId.toString()) {
      throw new AppError("You do not have permission to view this payment", 403, "FORBIDDEN");
    }
    return payment;
  }

  if (role === "doctor") {
    const doctorUserId = payment.appointmentId?.doctorId?.userId?._id?.toString();
    if (doctorUserId !== userId.toString()) {
      throw new AppError("You do not have permission to view this payment", 403, "FORBIDDEN");
    }
    return payment;
  }

  throw new AppError("Unauthorized role", 403, "FORBIDDEN");
};

export const getMyPayments = async (patientUserId) => {
  const patient = await Patient.findOne({ userId: patientUserId });
  if (!patient) {
    throw new AppError("Patient profile not found", 404, "PATIENT_PROFILE_NOT_FOUND");
  }

  const payments = await Payment.find({ patientId: patient._id })
    .populate({
      path: "appointmentId",
      populate: {
        path: "doctorId",
        select: "specialization qualification userId",
        populate: { path: "userId", select: "name" }
      }
    })
    .sort({ createdAt: -1 });

  return payments;
};

export const getAllPayments = async (query = {}) => {
  const { page = 1, limit = 10, status, refundStatus, patientId, doctorId } = query;
  
  const filter = {};
  if (status) filter.paymentStatus = status;
  if (refundStatus) filter.refundStatus = refundStatus;
  if (patientId) filter.patientId = patientId;
  
  if (doctorId) {
    const appointments = await Appointment.find({ doctorId }).select("_id");
    filter.appointmentId = { $in: appointments.map((a) => a._id) };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const limitNum = parseInt(limit);

  const payments = await Payment.find(filter)
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
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  const total = await Payment.countDocuments(filter);

  return {
    payments,
    pagination: {
      total,
      page: parseInt(page),
      limit: limitNum,
      pages: Math.ceil(total / limitNum)
    }
  };
};
