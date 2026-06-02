import { Router } from "express";
import {
  forgotPassword,
  login,
  logout,
  me,
  register,
  resetPassword
} from "../controllers/authController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import { authRateLimiter } from "../middlewares/rateLimiter.js";
import validate from "../validators/validate.js";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema
} from "../validators/authSchemas.js";

const router = Router();

router.post("/register", authRateLimiter, validate(registerSchema), register);
router.post("/login", authRateLimiter, validate(loginSchema), login);
router.post("/logout", authMiddleware, logout);
router.post("/forgot-password", authRateLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", authRateLimiter, validate(resetPasswordSchema), resetPassword);
router.get("/me", authMiddleware, me);

export default router;
