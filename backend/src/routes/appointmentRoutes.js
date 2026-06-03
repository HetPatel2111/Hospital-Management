import { Router } from "express";
import {
  createAppointment,
  cancelAppointment,
  rescheduleAppointment,
  confirmAppointment,
  completeAppointment,
  listAllAppointments,
  updateAppointmentStatus,
  getAppointmentById
} from "../controllers/appointmentController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import roleMiddleware, { patientOnly, doctorOnly, adminOnly } from "../middlewares/roleMiddleware.js";
import validate from "../validators/validate.js";
import {
  appointmentIdSchema,
  createAppointmentSchema,
  rescheduleAppointmentSchema,
  cancelAppointmentSchema,
  updateStatusSchema,
  listAllAppointmentsSchema
} from "../validators/appointmentSchemas.js";

const router = Router();

router.use(authMiddleware);

router.post("/", patientOnly, validate(createAppointmentSchema), createAppointment);
router.get("/", adminOnly, validate(listAllAppointmentsSchema), listAllAppointments);

router.get("/:id", roleMiddleware("patient", "doctor", "admin"), validate(appointmentIdSchema), getAppointmentById);
router.patch("/:id/cancel", roleMiddleware("patient", "doctor", "admin"), validate(cancelAppointmentSchema), cancelAppointment);
router.patch("/:id/reschedule", roleMiddleware("patient", "doctor", "admin"), validate(rescheduleAppointmentSchema), rescheduleAppointment);
router.patch("/:id/confirm", roleMiddleware("doctor", "admin"), validate(appointmentIdSchema), confirmAppointment);
router.patch("/:id/complete", doctorOnly, validate(appointmentIdSchema), completeAppointment);
router.patch("/:id/status", adminOnly, validate(updateStatusSchema), updateAppointmentStatus);

export default router;
