import { Router } from "express";
import {
  getDoctorById,
  getMyDoctorProfile,
  listDoctors,
  updateMyAvailability,
  updateMyDoctorProfile,
  getMyAppointments,
  getMyPatientById,
  createPrescription,
  getMyAvailability,
  getDoctorAvailabilityForDate
} from "../controllers/doctorController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import roleMiddleware, { doctorOnly } from "../middlewares/roleMiddleware.js";
import validate from "../validators/validate.js";
import {
  doctorIdSchema,
  listDoctorsSchema,
  updateAvailabilitySchema,
  updateMyDoctorProfileSchema,
  listDoctorAppointmentsSchema,
  patientIdParamSchema,
  availabilityLookupSchema
} from "../validators/doctorSchemas.js";
import { createPrescriptionSchema } from "../validators/prescriptionSchemas.js";

const router = Router();

router.get("/", authMiddleware, roleMiddleware("patient", "doctor", "admin"), validate(listDoctorsSchema), listDoctors);
router.get("/me", authMiddleware, doctorOnly, getMyDoctorProfile);
router.patch("/me", authMiddleware, doctorOnly, validate(updateMyDoctorProfileSchema), updateMyDoctorProfile);

// Availability routes
router.get("/me/availability", authMiddleware, doctorOnly, getMyAvailability);
router.put("/me/availability", authMiddleware, doctorOnly, validate(updateAvailabilitySchema), updateMyAvailability);
router.patch("/me/availability", authMiddleware, doctorOnly, validate(updateAvailabilitySchema), updateMyAvailability);

// Appointment & Patient self-service routes
router.get("/me/appointments", authMiddleware, doctorOnly, validate(listDoctorAppointmentsSchema), getMyAppointments);
router.get("/me/patients/:patientId", authMiddleware, doctorOnly, validate(patientIdParamSchema), getMyPatientById);
router.post("/me/prescriptions", authMiddleware, doctorOnly, validate(createPrescriptionSchema), createPrescription);

router.get("/:id/availability-lookup", authMiddleware, roleMiddleware("patient", "doctor", "admin"), validate(availabilityLookupSchema), getDoctorAvailabilityForDate);
router.get("/:id", authMiddleware, roleMiddleware("patient", "doctor", "admin"), validate(doctorIdSchema), getDoctorById);

export default router;

