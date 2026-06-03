import { z } from "zod";

const paginationQuery = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10)
};

const text = (max = 120) => z.string().trim().max(max);
const phone = z.string().trim().min(7).max(20);

const addressSchema = z.object({
  line1: text().optional(),
  line2: text().optional(),
  city: text().optional(),
  state: text().optional(),
  country: text().optional(),
  postalCode: text(20).optional()
});

const emergencyContactSchema = z.object({
  name: text().optional(),
  phone: phone.optional(),
  relationship: text().optional()
});

const insuranceDetailsSchema = z.object({
  provider: text().optional(),
  policyNumber: text().optional(),
  validUntil: z.coerce.date().optional()
});

export const updatePatientProfileSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(2).max(100).optional(),
      phone: phone.optional(),
      dateOfBirth: z.coerce
        .date()
        .max(new Date(), "Date of birth cannot be in the future")
        .optional(),
      gender: z.enum(["male", "female", "other", "undisclosed"]).optional(),
      bloodGroup: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"]).optional(),
      address: addressSchema.optional(),
      emergencyContact: emergencyContactSchema.optional(),
      medicalHistory: z.array(text(200)).optional(),
      allergies: z.array(text(120)).optional(),
      currentMedications: z.array(text(120)).optional(),
      insuranceDetails: insuranceDetailsSchema.optional()
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: "At least one field is required"
    }),
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

export const uploadProfilePictureSchema = z.object({
  body: z.object({
    profilePictureUrl: z.string().trim().url().max(1000)
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

export const listPatientNotificationsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    ...paginationQuery,
    status: z.enum(["unread", "read"]).optional(),
    type: z.enum(["appointment", "payment", "refund", "prescription", "system"]).optional()
  })
});

export const listPatientAppointmentsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    ...paginationQuery,
    sortOrder: z.enum(["asc", "desc"]).default("desc")
  })
});
