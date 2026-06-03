import Appointment from "../models/Appointment.js";
import Doctor from "../models/Doctor.js";
import AppError from "../utils/AppError.js";
import { AUDIT_ACTIONS, createAuditLog } from "./auditService.js";

export const getDoctorOverview = async (userId) => {
  const doctor = await Doctor.findOne({ userId });
  if (!doctor) {
    throw new AppError("Doctor profile not found", 404, "DOCTOR_PROFILE_NOT_FOUND");
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const [totalAppointments, upcomingAppointments, completedAppointments, uniquePatientsList] = await Promise.all([
    Appointment.countDocuments({ doctorId: doctor._id }),
    Appointment.countDocuments({
      doctorId: doctor._id,
      status: { $in: ["pending", "confirmed"] },
      appointmentDate: { $gte: now }
    }),
    Appointment.countDocuments({ doctorId: doctor._id, status: "completed" }),
    Appointment.distinct("patientId", { doctorId: doctor._id })
  ]);

  const upcomingAppointmentsList = await Appointment.find({
    doctorId: doctor._id,
    status: { $in: ["pending", "confirmed"] },
    appointmentDate: { $gte: now }
  })
    .populate({
      path: "patientId",
      populate: {
        path: "userId",
        select: "name email phone"
      }
    })
    .sort({ appointmentDate: 1, startTime: 1 })
    .limit(5);

  const formatRecentAppointment = (app) => ({
    id: app._id,
    appointmentDate: app.appointmentDate,
    startTime: app.startTime,
    endTime: app.endTime,
    status: app.status,
    reason: app.reason,
    patientName: app.patientId?.userId?.name || null,
    patientPhone: app.patientId?.userId?.phone || null
  });

  await createAuditLog({
    actorId: userId,
    actorRole: "doctor",
    action: AUDIT_ACTIONS.DOCTOR_DASHBOARD_VIEW,
    resourceType: "doctors",
    resourceId: doctor._id
  });

  return {
    overview: {
      totalAppointments,
      upcomingAppointments,
      completedAppointments,
      uniquePatients: uniquePatientsList.length,
      revenue: 0, // Delayed until Payment Module exists per USER requirements
      recentAppointments: upcomingAppointmentsList.map(formatRecentAppointment)
    }
  };
};
