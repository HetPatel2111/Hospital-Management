import { z } from "zod";
import mongoose from "mongoose";

const objectId = z.string().refine((value) => mongoose.Types.ObjectId.isValid(value), {
  message: "Invalid ID format"
});

export const requestRefundSchema = z.object({
  body: z.object({
    appointmentId: objectId,
    refundReason: z.string().trim().min(5, "Refund reason must be at least 5 characters long")
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

export const refundIdParamSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    id: objectId
  }),
  query: z.object({}).optional()
});

export const approveRefundSchema = z.object({
  body: z.object({
    adminRemarks: z.string().trim().optional()
  }),
  params: z.object({
    id: objectId
  }),
  query: z.object({}).optional()
});

export const rejectRefundSchema = z.object({
  body: z.object({
    adminRemarks: z.string().trim().min(5, "Rejection remarks must be at least 5 characters long")
  }),
  params: z.object({
    id: objectId
  }),
  query: z.object({}).optional()
});

export const listAllRefundsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    status: z.enum(["requested", "approved", "rejected", "processing", "refunded"]).optional(),
    patientId: objectId.optional()
  }).optional()
});
