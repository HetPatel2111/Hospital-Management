import { Router } from "express";
import {
  getDashboard,
  getMyProfile,
  listAppointmentHistory,
  listCancelledAppointments,
  listCompletedAppointments,
  listNotifications,
  listUpcomingAppointments,
  updateMyProfile,
  uploadProfilePicture
} from "../controllers/patientController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import { patientOnly } from "../middlewares/roleMiddleware.js";
import validate from "../validators/validate.js";
import {
  listPatientAppointmentsSchema,
  listPatientNotificationsSchema,
  updatePatientProfileSchema,
  uploadProfilePictureSchema
} from "../validators/patientSchemas.js";

const router = Router();

router.use(authMiddleware, patientOnly);

router.get("/me", getMyProfile);
router.patch("/me", validate(updatePatientProfileSchema), updateMyProfile);
router.patch("/me/profile-picture", validate(uploadProfilePictureSchema), uploadProfilePicture);
router.get("/me/dashboard", getDashboard);
router.get("/me/notifications", validate(listPatientNotificationsSchema), listNotifications);
router.get("/me/appointments", validate(listPatientAppointmentsSchema), listAppointmentHistory);
router.get("/me/appointments/upcoming", validate(listPatientAppointmentsSchema), listUpcomingAppointments);
router.get("/me/appointments/completed", validate(listPatientAppointmentsSchema), listCompletedAppointments);
router.get("/me/appointments/cancelled", validate(listPatientAppointmentsSchema), listCancelledAppointments);

export default router;
