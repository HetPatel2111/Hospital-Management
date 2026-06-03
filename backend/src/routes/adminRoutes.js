import { Router } from "express";
import { listAllAppointments, updateAppointmentStatus } from "../controllers/appointmentController.js";
import { getAllPayments } from "../controllers/paymentController.js";
import { getAllRefunds, approveRefund, rejectRefund, processRefund } from "../controllers/refundController.js";
import {
  getOverviewKPIs,
  getAppointmentAnalytics,
  getRevenueAnalytics,
  getRefundAnalytics,
  getDoctorAnalytics,
  listPatients,
  suspendPatient,
  reactivatePatient,
  listDoctorsAdmin
} from "../controllers/adminController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import { adminOnly } from "../middlewares/roleMiddleware.js";
import validate from "../validators/validate.js";
import { listAllAppointmentsSchema, updateStatusSchema } from "../validators/appointmentSchemas.js";
import { listAllPaymentsSchema } from "../validators/paymentSchemas.js";
import { listDoctorsSchema } from "../validators/doctorSchemas.js";
import { listPatientsSchema, patientIdParamSchema } from "../validators/adminSchemas.js";
import {
  listAllRefundsSchema,
  approveRefundSchema,
  rejectRefundSchema,
  refundIdParamSchema
} from "../validators/refundSchemas.js";

const router = Router();

router.use(authMiddleware, adminOnly);

// Dashboard & Analytics
router.get("/dashboard/overview", getOverviewKPIs);
router.get("/dashboard/appointments", getAppointmentAnalytics);
router.get("/dashboard/revenue", getRevenueAnalytics);
router.get("/dashboard/refunds", getRefundAnalytics);
router.get("/dashboard/doctors", getDoctorAnalytics);

// Patient Management
router.get("/patients", validate(listPatientsSchema), listPatients);
router.patch("/patients/:id/suspend", validate(patientIdParamSchema), suspendPatient);
router.patch("/patients/:id/activate", validate(patientIdParamSchema), reactivatePatient);

// Doctor Management
router.get("/doctors", validate(listDoctorsSchema), listDoctorsAdmin);

// Appointments Monitoring
router.get("/appointments", validate(listAllAppointmentsSchema), listAllAppointments);
router.patch("/appointments/:id/status", validate(updateStatusSchema), updateAppointmentStatus);

// Payments & Refunds
router.get("/payments", validate(listAllPaymentsSchema), getAllPayments);
router.get("/refunds", validate(listAllRefundsSchema), getAllRefunds);
router.patch("/refunds/:id/approve", validate(approveRefundSchema), approveRefund);
router.patch("/refunds/:id/reject", validate(rejectRefundSchema), rejectRefund);
router.patch("/refunds/:id/process", validate(refundIdParamSchema), processRefund);

export default router;
