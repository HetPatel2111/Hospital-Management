import Appointment from "../models/Appointment.js";
import Doctor from "../models/Doctor.js";
import Patient from "../models/Patient.js";
import Notification from "../models/Notification.js";
import AppError from "../utils/AppError.js";
import { AUDIT_ACTIONS, createAuditLog } from "./auditService.js";

const toAppointmentResponse = (appointment) => {
  const plain = appointment.toObject ? appointment.toObject({ virtuals: true }) : appointment;
  const doctor = plain.doctorId;
  const patient = plain.patientId;

  return {
    id: plain._id,
    appointmentDate: plain.appointmentDate,
    startTime: plain.startTime,
    endTime: plain.endTime,
    status: plain.status,
    reason: plain.reason,
    notes: plain.notes,
    cancellation: plain.cancellation,
    paymentId: plain.paymentId,
    doctor: doctor
      ? {
          id: doctor._id,
          fullName: doctor.userId?.name || doctor.fullName,
          email: doctor.userId?.email,
          phone: doctor.userId?.phone,
          specialization: doctor.specialization,
          qualification: doctor.qualification,
          experienceYears: doctor.experienceYears,
          consultationFee: doctor.consultationFee,
          status: doctor.status
        }
      : null,
    patient: patient
      ? {
          id: patient._id,
          fullName: patient.userId?.name,
          email: patient.userId?.email,
          phone: patient.userId?.phone,
          dateOfBirth: patient.dateOfBirth,
          gender: patient.gender,
          bloodGroup: patient.bloodGroup,
          address: patient.address,
          emergencyContact: patient.emergencyContact,
          medicalHistory: patient.medicalHistory,
          allergies: patient.allergies,
          currentMedications: patient.currentMedications,
          insuranceDetails: patient.insuranceDetails
        }
      : null,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt
  };
};

const checkDoctorAvailability = (doctor, date, startTime, endTime) => {
  const appointmentDay = new Date(date).getUTCDay(); // 0 is Sunday, 6 is Saturday
  const appointmentDateStr = new Date(date).toISOString().split("T")[0];

  // 1. Check exceptions
  const dayExceptions = doctor.availability?.exceptions?.filter((e) => {
    const exceptionDateStr = new Date(e.date).toISOString().split("T")[0];
    return exceptionDateStr === appointmentDateStr;
  }) || [];

  // Check full day block exception
  const fullDayException = dayExceptions.find(
    (e) => !e.isAvailable && !e.startTime && !e.endTime
  );
  if (fullDayException) {
    throw new AppError(
      `Doctor is not available on this date: ${fullDayException.reason || "Slot blocked"}`,
      400,
      "DOCTOR_UNAVAILABLE_EXCEPTION"
    );
  }

  // Check slot-specific block exception
  const slotException = dayExceptions.find((e) => {
    if (!e.isAvailable && e.startTime && e.endTime) {
      return startTime < e.endTime && endTime > e.startTime;
    }
    return false;
  });
  if (slotException) {
    throw new AppError(
      `Doctor is not available during requested hours: ${slotException.reason || "Slot blocked"}`,
      400,
      "DOCTOR_UNAVAILABLE_EXCEPTION"
    );
  }

  // 2. Check weekly schedule
  const daySchedule = doctor.availability?.weeklySchedule?.find(
    (d) => d.dayOfWeek === appointmentDay
  );

  if (!daySchedule || !daySchedule.isAvailable) {
    throw new AppError("Doctor is not available on this day of the week", 400, "DOCTOR_UNAVAILABLE_WEEKDAY");
  }

  // 3. Check slots
  const slotFits = daySchedule.slots?.some(
    (slot) => startTime >= slot.startTime && endTime <= slot.endTime
  );

  if (!slotFits) {
    throw new AppError("Requested slot is outside the doctor's available hours", 400, "DOCTOR_UNAVAILABLE_HOURS");
  }
};

const checkDoubleBooking = async (doctorId, date, startTime, endTime, excludeAppointmentId = null) => {
  const query = {
    doctorId,
    appointmentDate: new Date(date),
    status: { $in: ["pending_payment", "pending", "confirmed"] },
    startTime: { $lt: endTime },
    endTime: { $gt: startTime }
  };

  if (excludeAppointmentId) {
    query._id = { $ne: excludeAppointmentId };
  }

  const overlapExists = await Appointment.exists(query);
  if (overlapExists) {
    throw new AppError("Doctor is already booked for an overlapping slot", 409, "DOUBLE_BOOKING");
  }
};

export const createAppointment = async (patientUserId, payload) => {
  const patient = await Patient.findOne({ userId: patientUserId });
  if (!patient) {
    throw new AppError("Patient profile not found", 404, "PATIENT_PROFILE_NOT_FOUND");
  }

  const doctor = await Doctor.findById(payload.doctorId).populate("userId");
  if (!doctor || doctor.status !== "approved") {
    throw new AppError("Doctor not found or not approved", 404, "DOCTOR_NOT_FOUND");
  }

  const bookingsCount = await Appointment.countDocuments({
    doctorId: doctor._id,
    appointmentDate: new Date(payload.appointmentDate),
    status: { $in: ["pending_payment", "pending", "confirmed", "completed"] }
  });

  if (bookingsCount >= 15) {
    throw new AppError("Doctor has reached the maximum booking limit of 15 patients for this date", 400, "MAX_BOOKING_LIMIT_REACHED");
  }

  checkDoctorAvailability(doctor, payload.appointmentDate, payload.startTime, payload.endTime);
  await checkDoubleBooking(doctor._id, payload.appointmentDate, payload.startTime, payload.endTime);

  const appointment = await Appointment.create({
    patientId: patient._id,
    doctorId: doctor._id,
    appointmentDate: new Date(payload.appointmentDate),
    startTime: payload.startTime,
    endTime: payload.endTime,
    reason: payload.reason,
    status: "pending_payment"
  });

  if (doctor.userId?._id) {
    await Notification.create({
      userId: doctor.userId._id,
      type: "appointment",
      title: "New Appointment Request",
      message: `You have received a new appointment request for ${new Date(payload.appointmentDate).toDateString()} at ${payload.startTime}.`
    });
  }

  await createAuditLog({
    actorId: patientUserId,
    actorRole: "patient",
    action: AUDIT_ACTIONS.APPOINTMENT_CREATE,
    resourceType: "appointments",
    resourceId: appointment._id
  });

  const populated = await Appointment.findById(appointment._id)
    .populate({ path: "doctorId", populate: { path: "userId" } })
    .populate({ path: "patientId", populate: { path: "userId" } });

  return {
    appointment: toAppointmentResponse(populated)
  };
};

export const cancelAppointment = async (appointmentId, actor, reason) => {
  const appointment = await Appointment.findById(appointmentId)
    .populate({ path: "doctorId", populate: { path: "userId" } })
    .populate({ path: "patientId", populate: { path: "userId" } });

  if (!appointment) {
    throw new AppError("Appointment not found", 404, "APPOINTMENT_NOT_FOUND");
  }

  const patientUserId = appointment.patientId?.userId?._id?.toString();
  const doctorUserId = appointment.doctorId?.userId?._id?.toString();

  // Authorize: actor is the patient, the doctor, or an admin
  const isPatient = actor.role === "patient" && actor._id.toString() === patientUserId;
  const isDoctor = actor.role === "doctor" && actor._id.toString() === doctorUserId;
  const isAdmin = actor.role === "admin";

  if (!isPatient && !isDoctor && !isAdmin) {
    throw new AppError("You do not have permission to cancel this appointment", 403, "FORBIDDEN");
  }

  if (["completed", "cancelled", "refunded"].includes(appointment.status)) {
    throw new AppError(`Cannot cancel appointment with status ${appointment.status}`, 400, "INVALID_STATUS");
  }

  appointment.status = "cancelled";
  appointment.cancellation = {
    cancelledBy: actor._id,
    cancelledAt: new Date(),
    reason: reason || "Cancelled by user"
  };
  await appointment.save();

  // Notifications
  const notifyUserIds = [];
  if (actor.role !== "patient" && patientUserId) notifyUserIds.push(patientUserId);
  if (actor.role !== "doctor" && doctorUserId) notifyUserIds.push(doctorUserId);

  for (const uid of notifyUserIds) {
    await Notification.create({
      userId: uid,
      type: "appointment",
      title: "Appointment Cancelled",
      message: `Appointment on ${appointment.appointmentDate.toDateString()} has been cancelled.`
    });
  }

  await createAuditLog({
    actorId: actor._id,
    actorRole: actor.role,
    action: AUDIT_ACTIONS.APPOINTMENT_CANCEL,
    resourceType: "appointments",
    resourceId: appointment._id
  });

  return {
    appointment: toAppointmentResponse(appointment)
  };
};

export const rescheduleAppointment = async (appointmentId, actor, payload) => {
  const appointment = await Appointment.findById(appointmentId)
    .populate({ path: "doctorId", populate: { path: "userId" } })
    .populate({ path: "patientId", populate: { path: "userId" } });

  if (!appointment) {
    throw new AppError("Appointment not found", 404, "APPOINTMENT_NOT_FOUND");
  }

  const patientUserId = appointment.patientId?.userId?._id?.toString();
  const doctorUserId = appointment.doctorId?.userId?._id?.toString();

  const isPatient = actor.role === "patient" && actor._id.toString() === patientUserId;
  const isDoctor = actor.role === "doctor" && actor._id.toString() === doctorUserId;
  const isAdmin = actor.role === "admin";

  if (!isPatient && !isDoctor && !isAdmin) {
    throw new AppError("You do not have permission to reschedule this appointment", 403, "FORBIDDEN");
  }

  if (!["pending_payment", "pending", "confirmed"].includes(appointment.status)) {
    throw new AppError("Only pending or confirmed appointments can be rescheduled", 400, "INVALID_STATUS");
  }

  const doctor = appointment.doctorId;
  const bookingsCount = await Appointment.countDocuments({
    doctorId: doctor._id,
    appointmentDate: new Date(payload.appointmentDate),
    status: { $in: ["pending_payment", "pending", "confirmed", "completed"] },
    _id: { $ne: appointment._id }
  });

  if (bookingsCount >= 15) {
    throw new AppError("Doctor has reached the maximum booking limit of 15 patients for this date", 400, "MAX_BOOKING_LIMIT_REACHED");
  }

  checkDoctorAvailability(doctor, payload.appointmentDate, payload.startTime, payload.endTime);
  await checkDoubleBooking(doctor._id, payload.appointmentDate, payload.startTime, payload.endTime, appointment._id);

  appointment.appointmentDate = new Date(payload.appointmentDate);
  appointment.startTime = payload.startTime;
  appointment.endTime = payload.endTime;
  await appointment.save();

  const notifyUserIds = [];
  if (actor.role !== "patient" && patientUserId) notifyUserIds.push(patientUserId);
  if (actor.role !== "doctor" && doctorUserId) notifyUserIds.push(doctorUserId);

  for (const uid of notifyUserIds) {
    await Notification.create({
      userId: uid,
      type: "appointment",
      title: "Appointment Rescheduled",
      message: `Appointment has been rescheduled to ${new Date(payload.appointmentDate).toDateString()} at ${payload.startTime}.`
    });
  }

  await createAuditLog({
    actorId: actor._id,
    actorRole: actor.role,
    action: AUDIT_ACTIONS.APPOINTMENT_RESCHEDULE,
    resourceType: "appointments",
    resourceId: appointment._id
  });

  return {
    appointment: toAppointmentResponse(appointment)
  };
};

export const confirmAppointment = async (appointmentId, actor) => {
  const appointment = await Appointment.findById(appointmentId)
    .populate({ path: "doctorId", populate: { path: "userId" } })
    .populate({ path: "patientId", populate: { path: "userId" } });

  if (!appointment) {
    throw new AppError("Appointment not found", 404, "APPOINTMENT_NOT_FOUND");
  }

  const doctorUserId = appointment.doctorId?.userId?._id?.toString();
  const isDoctor = actor.role === "doctor" && actor._id.toString() === doctorUserId;
  const isAdmin = actor.role === "admin";

  if (!isDoctor && !isAdmin) {
    throw new AppError("You do not have permission to confirm this appointment", 403, "FORBIDDEN");
  }

  if (appointment.status !== "pending") {
    throw new AppError("Only pending appointments can be confirmed", 400, "INVALID_STATUS");
  }

  appointment.status = "confirmed";
  await appointment.save();

  const patientUserId = appointment.patientId?.userId?._id;
  if (patientUserId) {
    await Notification.create({
      userId: patientUserId,
      type: "appointment",
      title: "Appointment Confirmed",
      message: `Your appointment with Dr. ${appointment.doctorId?.userId?.name || "doctor"} has been confirmed.`
    });
  }

  await createAuditLog({
    actorId: actor._id,
    actorRole: actor.role,
    action: AUDIT_ACTIONS.APPOINTMENT_CONFIRM,
    resourceType: "appointments",
    resourceId: appointment._id
  });

  return {
    appointment: toAppointmentResponse(appointment)
  };
};

export const completeAppointment = async (appointmentId, actor) => {
  const doctor = await Doctor.findOne({ userId: actor._id });
  if (!doctor) {
    throw new AppError("Doctor profile not found", 404, "DOCTOR_PROFILE_NOT_FOUND");
  }

  const appointment = await Appointment.findById(appointmentId)
    .populate({ path: "doctorId", populate: { path: "userId" } })
    .populate({ path: "patientId", populate: { path: "userId" } });

  if (!appointment) {
    throw new AppError("Appointment not found", 404, "APPOINTMENT_NOT_FOUND");
  }

  if (appointment.doctorId._id.toString() !== doctor._id.toString()) {
    throw new AppError("You do not have permission to modify this appointment", 403, "FORBIDDEN");
  }

  if (appointment.status !== "confirmed") {
    throw new AppError("Only confirmed appointments can be completed", 400, "INVALID_STATUS");
  }

  appointment.status = "completed";
  await appointment.save();

  const patientUserId = appointment.patientId?.userId?._id || appointment.patientId?.userId;
  if (patientUserId) {
    await Notification.create({
      userId: patientUserId,
      type: "appointment",
      title: "Appointment Completed",
      message: `Your appointment with Dr. ${actor.name} has been marked as completed.`
    });
  }

  await createAuditLog({
    actorId: actor._id,
    actorRole: actor.role,
    action: AUDIT_ACTIONS.APPOINTMENT_COMPLETE,
    resourceType: "appointments",
    resourceId: appointment._id
  });

  return {
    appointment: toAppointmentResponse(appointment)
  };
};

export const listAllAppointments = async (query) => {
  const filters = {};

  if (query.status) {
    filters.status = query.status;
  }
  if (query.doctorId) {
    filters.doctorId = query.doctorId;
  }
  if (query.patientId) {
    filters.patientId = query.patientId;
  }
  if (query.startDate || query.endDate) {
    filters.appointmentDate = {};
    if (query.startDate) filters.appointmentDate.$gte = new Date(query.startDate);
    if (query.endDate) filters.appointmentDate.$lte = new Date(query.endDate);
  }

  const skip = (query.page - 1) * query.limit;
  const sort = { appointmentDate: query.sortOrder === "asc" ? 1 : -1, startTime: 1 };

  const [appointments, total] = await Promise.all([
    Appointment.find(filters)
      .populate({ path: "doctorId", populate: { path: "userId", select: "name email phone" } })
      .populate({ path: "patientId", populate: { path: "userId", select: "name email phone" } })
      .sort(sort)
      .skip(skip)
      .limit(query.limit),
    Appointment.countDocuments(filters)
  ]);

  return {
    appointments: appointments.map(toAppointmentResponse),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit)
    }
  };
};

export const updateAppointmentStatus = async (appointmentId, status, actor) => {
  if (actor.role !== "admin") {
    throw new AppError("Admin access is required", 403, "ADMIN_ACCESS_REQUIRED");
  }

  const appointment = await Appointment.findById(appointmentId)
    .populate({ path: "doctorId", populate: { path: "userId" } })
    .populate({ path: "patientId", populate: { path: "userId" } });

  if (!appointment) {
    throw new AppError("Appointment not found", 404, "APPOINTMENT_NOT_FOUND");
  }

  appointment.status = status;
  await appointment.save();

  const patientUserId = appointment.patientId?.userId?._id;
  if (patientUserId) {
    await Notification.create({
      userId: patientUserId,
      type: "appointment",
      title: "Appointment Status Updated",
      message: `Your appointment status has been updated to ${status} by administrator.`
    });
  }

  await createAuditLog({
    actorId: actor._id,
    actorRole: actor.role,
    action: AUDIT_ACTIONS.APPOINTMENT_STATUS_UPDATE,
    resourceType: "appointments",
    resourceId: appointment._id
  });

  return {
    appointment: toAppointmentResponse(appointment)
  };
};

export const getAppointmentById = async (appointmentId, actor) => {
  const appointment = await Appointment.findById(appointmentId)
    .populate({ path: "doctorId", populate: { path: "userId" } })
    .populate({ path: "patientId", populate: { path: "userId" } });

  if (!appointment) {
    throw new AppError("Appointment not found", 404, "APPOINTMENT_NOT_FOUND");
  }

  const patientUserId = appointment.patientId?.userId?._id?.toString();
  const doctorUserId = appointment.doctorId?.userId?._id?.toString();

  const isPatient = actor.role === "patient" && actor._id.toString() === patientUserId;
  const isDoctor = actor.role === "doctor" && actor._id.toString() === doctorUserId;
  const isAdmin = actor.role === "admin";

  if (!isPatient && !isDoctor && !isAdmin) {
    throw new AppError("You do not have permission to view this appointment", 403, "FORBIDDEN");
  }

  await createAuditLog({
    actorId: actor._id,
    actorRole: actor.role,
    action: AUDIT_ACTIONS.APPOINTMENT_VIEW,
    resourceType: "appointments",
    resourceId: appointment._id
  });

  return {
    appointment: toAppointmentResponse(appointment)
  };
};
