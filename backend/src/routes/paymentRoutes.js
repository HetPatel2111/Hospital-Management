import { Router } from "express";
import {
  createOrder,
  verifyPayment,
  getPaymentById,
  getMyPayments
} from "../controllers/paymentController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import roleMiddleware, { patientOnly } from "../middlewares/roleMiddleware.js";
import validate from "../validators/validate.js";
import {
  createOrderSchema,
  verifyPaymentSchema,
  paymentIdParamSchema
} from "../validators/paymentSchemas.js";

const router = Router();

router.use(authMiddleware);

router.post("/create-order", patientOnly, validate(createOrderSchema), createOrder);
router.post("/verify", patientOnly, validate(verifyPaymentSchema), verifyPayment);
router.get("/my-payments", patientOnly, getMyPayments);
router.get("/:id", roleMiddleware("patient", "doctor", "admin"), validate(paymentIdParamSchema), getPaymentById);

export default router;
