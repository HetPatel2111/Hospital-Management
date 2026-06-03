import mongoose from "mongoose";
import { z } from "zod";

const objectId = z.string().refine((value) => mongoose.Types.ObjectId.isValid(value), {
  message: "Invalid id"
});

const medicineSchema = z.object({
  name: z.string().trim().min(1, "Medicine name is required").max(100),
  dosage: z.string().trim().min(1, "Dosage is required").max(50),
  frequency: z.string().trim().min(1, "Frequency is required").max(50),
  duration: z.string().trim().min(1, "Duration is required").max(50),
  instructions: z.string().trim().max(300).optional().default("")
});

export const createPrescriptionSchema = z.object({
  body: z.object({
    appointmentId: objectId,
    diagnosis: z.string().trim().min(1, "Diagnosis is required").max(500),
    medicines: z.array(medicineSchema).default([]),
    instructions: z.string().trim().max(1000).optional().default(""),
    followUpDate: z.coerce.date().optional().refine((date) => {
      if (!date) return true;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date >= today;
    }, {
      message: "Follow-up date cannot be in the past"
    })
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional()
});
