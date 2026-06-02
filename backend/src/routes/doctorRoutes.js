import { Router } from "express";
import {
  getDoctorById,
  getMyDoctorProfile,
  listDoctors,
  updateMyAvailability,
  updateMyDoctorProfile
} from "../controllers/doctorController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import roleMiddleware, { doctorOnly } from "../middlewares/roleMiddleware.js";
import validate from "../validators/validate.js";
import {
  doctorIdSchema,
  listDoctorsSchema,
  updateAvailabilitySchema,
  updateMyDoctorProfileSchema
} from "../validators/doctorSchemas.js";

const router = Router();

router.get("/", authMiddleware, roleMiddleware("patient", "doctor", "admin"), validate(listDoctorsSchema), listDoctors);
router.get("/me", authMiddleware, doctorOnly, getMyDoctorProfile);
router.patch("/me", authMiddleware, doctorOnly, validate(updateMyDoctorProfileSchema), updateMyDoctorProfile);
router.patch("/me/availability", authMiddleware, doctorOnly, validate(updateAvailabilitySchema), updateMyAvailability);
router.get("/:id", authMiddleware, roleMiddleware("patient", "doctor", "admin"), validate(doctorIdSchema), getDoctorById);

export default router;
