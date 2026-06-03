import mongoose from "mongoose";
import { z } from "zod";

const objectId = z.string().refine((value) => mongoose.Types.ObjectId.isValid(value), {
  message: "Invalid id"
});

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must use HH:mm format");

const slotSchema = z
  .object({
    startTime: time,
    endTime: time
  })
  .refine((slot) => slot.endTime > slot.startTime, {
    message: "Slot endTime must be after startTime",
    path: ["endTime"]
  });

const weeklyScheduleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  isAvailable: z.boolean().default(false),
  slots: z.array(slotSchema).default([])
});

const availabilitySchema = z.object({
  weeklySchedule: z.array(weeklyScheduleSchema).default([]),
  exceptions: z
    .array(
      z.object({
        date: z.coerce.date(),
        isAvailable: z.boolean().default(false),
        reason: z.string().trim().max(300).optional()
      })
    )
    .default([])
});

const doctorProfileFields = {
  specialization: z.string().trim().min(2).max(100),
  experienceYears: z.number().int().min(0).max(80),
  qualification: z.array(z.string().trim().min(2).max(120)).min(1),
  consultationFee: z.number().min(0),
  bio: z.string().trim().max(1000).optional(),
  availability: availabilitySchema.optional()
};

export const listDoctorsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().max(100).optional(),
    specialization: z.string().trim().max(100).optional(),
    minExperience: z.coerce.number().int().min(0).optional(),
    maxExperience: z.coerce.number().int().min(0).optional(),
    minFee: z.coerce.number().min(0).optional(),
    maxFee: z.coerce.number().min(0).optional(),
    sortBy: z
      .enum(["createdAt", "experienceYears", "consultationFee", "specialization"])
      .default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc")
  })
});

export const doctorIdSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    id: objectId
  }),
  query: z.object({}).optional()
});

export const createDoctorSchema = z.object({
  body: z.object({
    fullName: z.string().trim().min(2).max(100),
    email: z.string().trim().email().toLowerCase(),
    phone: z.string().trim().min(7).max(20).optional(),
    password: z
      .string()
      .min(8)
      .max(72)
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    registrationNumber: z.string().trim().min(2).max(80),
    ...doctorProfileFields,
    status: z.enum(["pending", "approved", "rejected"]).default("approved")
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

export const updateDoctorSchema = z.object({
  body: z
    .object({
      fullName: z.string().trim().min(2).max(100).optional(),
      phone: z.string().trim().min(7).max(20).optional(),
      registrationNumber: z.string().trim().min(2).max(80).optional(),
      specialization: doctorProfileFields.specialization.optional(),
      experienceYears: doctorProfileFields.experienceYears.optional(),
      qualification: doctorProfileFields.qualification.optional(),
      consultationFee: doctorProfileFields.consultationFee.optional(),
      bio: doctorProfileFields.bio,
      availability: availabilitySchema.optional(),
      status: z.enum(["pending", "approved", "rejected"]).optional()
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: "At least one field is required"
    }),
  params: z.object({
    id: objectId
  }),
  query: z.object({}).optional()
});

export const updateMyDoctorProfileSchema = z.object({
  body: z
    .object({
      fullName: z.string().trim().min(2).max(100).optional(),
      phone: z.string().trim().min(7).max(20).optional(),
      specialization: doctorProfileFields.specialization.optional(),
      experienceYears: doctorProfileFields.experienceYears.optional(),
      qualification: doctorProfileFields.qualification.optional(),
      consultationFee: doctorProfileFields.consultationFee.optional(),
      bio: doctorProfileFields.bio,
      availability: availabilitySchema.optional()
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: "At least one field is required"
    }),
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

export const updateAvailabilitySchema = z.object({
  body: z.object({
    availability: availabilitySchema
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

export const listDoctorAppointmentsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    status: z.enum(["pending", "confirmed", "completed", "cancelled", "refunded", "no_show"]).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    sortOrder: z.enum(["asc", "desc"]).default("desc")
  })
});

export const patientIdParamSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    patientId: objectId
  }),
  query: z.object({}).optional()
});

export const availabilityLookupSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    id: objectId
  }),
  query: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format")
  })
});


