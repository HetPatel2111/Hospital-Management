import { z } from "zod";
import mongoose from "mongoose";

const objectId = z.string().refine((value) => mongoose.Types.ObjectId.isValid(value), {
  message: "Invalid ID format"
});

export const createOrderSchema = z.object({
  body: z.object({
    appointmentId: objectId
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

export const verifyPaymentSchema = z.object({
  body: z.object({
    appointmentId: objectId,
    razorpayOrderId: z.string().trim().min(1, "Razorpay Order ID is required"),
    razorpayPaymentId: z.string().trim().min(1, "Razorpay Payment ID is required"),
    razorpaySignature: z.string().trim().min(1, "Razorpay Signature is required"),
    paymentMethod: z.string().trim().optional(),
    gatewayResponse: z.any().optional()
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

export const paymentIdParamSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    id: objectId
  }),
  query: z.object({}).optional()
});

export const listAllPaymentsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    status: z.enum(["pending", "success", "failed", "refunded"]).optional(),
    refundStatus: z.enum(["none", "requested", "processing", "refunded"]).optional(),
    patientId: objectId.optional(),
    doctorId: objectId.optional()
  }).optional()
});
