import { Router } from "express";
import { requestRefund, getMyRefunds } from "../controllers/refundController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import { patientOnly } from "../middlewares/roleMiddleware.js";
import validate from "../validators/validate.js";
import { requestRefundSchema } from "../validators/refundSchemas.js";

const router = Router();

router.use(authMiddleware, patientOnly);

router.post("/request", validate(requestRefundSchema), requestRefund);
router.get("/my-refunds", getMyRefunds);

export default router;
