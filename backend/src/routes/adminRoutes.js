import { Router } from "express";
import { listAllAppointments, updateAppointmentStatus } from "../controllers/appointmentController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import { adminOnly } from "../middlewares/roleMiddleware.js";
import validate from "../validators/validate.js";
import { listAllAppointmentsSchema, updateStatusSchema } from "../validators/appointmentSchemas.js";

const router = Router();

router.use(authMiddleware, adminOnly);

router.get("/appointments", validate(listAllAppointmentsSchema), listAllAppointments);
router.patch("/appointments/:id/status", validate(updateStatusSchema), updateAppointmentStatus);

export default router;
