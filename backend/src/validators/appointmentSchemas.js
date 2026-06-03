import mongoose from "mongoose";
import { z } from "zod";

const objectId = z.string().refine((value) => mongoose.Types.ObjectId.isValid(value), {
  message: "Invalid id"
});

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must use HH:mm format");

const todayOrFutureDate = z.coerce.date().refine((date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date >= today;
}, {
  message: "Appointment date cannot be in the past"
});

export const appointmentIdSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    id: objectId
  }),
  query: z.object({}).optional()
});

export const createAppointmentSchema = z.object({
  body: z
    .object({
      doctorId: objectId,
      appointmentDate: todayOrFutureDate,
      startTime: time,
      endTime: time,
      reason: z.string().trim().max(500).optional().default("")
    })
    .refine((data) => data.endTime > data.startTime, {
      message: "Slot endTime must be after startTime",
      path: ["endTime"]
    }),
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

export const rescheduleAppointmentSchema = z.object({
  body: z
    .object({
      appointmentDate: todayOrFutureDate,
      startTime: time,
      endTime: time
    })
    .refine((data) => data.endTime > data.startTime, {
      message: "Slot endTime must be after startTime",
      path: ["endTime"]
    }),
  params: z.object({
    id: objectId
  }),
  query: z.object({}).optional()
});

export const cancelAppointmentSchema = z.object({
  body: z.object({
    reason: z.string().trim().max(500).optional().default("")
  }),
  params: z.object({
    id: objectId
  }),
  query: z.object({}).optional()
});

export const updateStatusSchema = z.object({
  body: z.object({
    status: z.enum(["pending", "confirmed", "completed", "cancelled", "refunded"])
  }),
  params: z.object({
    id: objectId
  }),
  query: z.object({}).optional()
});

export const listAllAppointmentsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    status: z.enum(["pending", "confirmed", "completed", "cancelled", "refunded", "no_show"]).optional(),
    doctorId: objectId.optional(),
    patientId: objectId.optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    sortOrder: z.enum(["asc", "desc"]).default("desc")
  })
});
