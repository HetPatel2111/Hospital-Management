import { Router } from "express";
import { listAllAppointments, updateAppointmentStatus } from "../controllers/appointmentController.js";
import { getAllPayments } from "../controllers/paymentController.js";
import { getAllRefunds, approveRefund, rejectRefund, processRefund } from "../controllers/refundController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import { adminOnly } from "../middlewares/roleMiddleware.js";
import validate from "../validators/validate.js";
import { listAllAppointmentsSchema, updateStatusSchema } from "../validators/appointmentSchemas.js";
import { listAllPaymentsSchema } from "../validators/paymentSchemas.js";
import {
  listAllRefundsSchema,
  approveRefundSchema,
  rejectRefundSchema,
  refundIdParamSchema
} from "../validators/refundSchemas.js";

const router = Router();

router.use(authMiddleware, adminOnly);

router.get("/appointments", validate(listAllAppointmentsSchema), listAllAppointments);
router.patch("/appointments/:id/status", validate(updateStatusSchema), updateAppointmentStatus);
router.get("/payments", validate(listAllPaymentsSchema), getAllPayments);
router.get("/refunds", validate(listAllRefundsSchema), getAllRefunds);
router.patch("/refunds/:id/approve", validate(approveRefundSchema), approveRefund);
router.patch("/refunds/:id/reject", validate(rejectRefundSchema), rejectRefund);
router.patch("/refunds/:id/process", validate(refundIdParamSchema), processRefund);

export default router;
