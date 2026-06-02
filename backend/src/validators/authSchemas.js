import { z } from "zod";

const name = z.string().trim().min(2).max(100);
const email = z.string().trim().email().toLowerCase();
const phone = z.string().trim().min(7).max(20).optional();
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must use HH:mm format");
const password = z
  .string()
  .min(8)
  .max(72)
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

const slotSchema = z
  .object({
    startTime: time,
    endTime: time
  })
  .refine((slot) => slot.endTime > slot.startTime, {
    message: "Slot endTime must be after startTime",
    path: ["endTime"]
  });

const availabilitySchema = z.object({
  weeklySchedule: z
    .array(
      z.object({
        dayOfWeek: z.number().int().min(0).max(6),
        isAvailable: z.boolean().default(false),
        slots: z.array(slotSchema).default([])
      })
    )
    .default([]),
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

export const registerSchema = z.object({
  body: z
    .object({
      name,
      email,
      phone,
      password,
      role: z.enum(["patient", "doctor"]).default("patient"),
      specialization: z.string().trim().min(2).max(100).optional(),
      qualification: z.array(z.string().trim().min(2).max(120)).min(1).optional(),
      experienceYears: z.number().int().min(0).max(80).optional(),
      registrationNumber: z.string().trim().min(2).max(80).optional(),
      consultationFee: z.number().min(0).optional(),
      availability: availabilitySchema.optional(),
      bio: z.string().trim().max(1000).optional()
    })
    .superRefine((body, ctx) => {
      if (body.role !== "doctor") {
        return;
      }

      [
        "specialization",
        "qualification",
        "experienceYears",
        "registrationNumber",
        "consultationFee"
      ].forEach((field) => {
        if (body[field] === undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [field],
            message: `${field} is required for doctor registration`
          });
        }
      });
    }),
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

export const loginSchema = z.object({
  body: z.object({
    email,
    password: z.string().min(1)
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

export const resetPasswordSchema = z.object({
  body: z.object({
    resetToken: z.string().min(1),
    password
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1)
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

export const logoutSchema = refreshTokenSchema;
