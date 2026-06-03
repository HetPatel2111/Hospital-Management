import { Router } from "express";
import { getDoctorOverview } from "../controllers/analyticsController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import { doctorOnly } from "../middlewares/roleMiddleware.js";

const router = Router();

router.use(authMiddleware, doctorOnly);

router.get("/doctor/overview", getDoctorOverview);

export default router;
