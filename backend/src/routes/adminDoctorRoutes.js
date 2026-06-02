import { Router } from "express";
import {
  activateDoctor,
  createDoctor,
  deactivateDoctor,
  deleteDoctor,
  getPendingDoctors,
  rejectDoctor,
  updateDoctor
} from "../controllers/doctorController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import { adminOnly } from "../middlewares/roleMiddleware.js";
import validate from "../validators/validate.js";
import {
  createDoctorSchema,
  doctorIdSchema,
  updateDoctorSchema
} from "../validators/doctorSchemas.js";

const router = Router();

router.use(authMiddleware, adminOnly);

router.get("/pending", getPendingDoctors);
router.post("/", validate(createDoctorSchema), createDoctor);
router.patch("/:id", validate(updateDoctorSchema), updateDoctor);
router.delete("/:id", validate(doctorIdSchema), deleteDoctor);
router.patch("/:id/approve", validate(doctorIdSchema), activateDoctor);
router.patch("/:id/reject", validate(doctorIdSchema), rejectDoctor);
router.patch("/:id/activate", validate(doctorIdSchema), activateDoctor);
router.patch("/:id/deactivate", validate(doctorIdSchema), deactivateDoctor);

export default router;
