import { z } from "zod";

const name = z.string().trim().min(2).max(100);
const email = z.string().trim().email().toLowerCase();
const phone = z.string().trim().min(7).max(20).optional();
const password = z
  .string()
  .min(8)
  .max(72)
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export const registerSchema = z.object({
  body: z.object({
    name,
    email,
    phone,
    password,
    role: z.enum(["patient", "doctor", "admin"]).default("patient")
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
