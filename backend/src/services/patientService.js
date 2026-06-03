import Appointment from "../models/Appointment.js";
import Notification from "../models/Notification.js";
import Patient from "../models/Patient.js";
import User from "../models/User.js";
import { AUDIT_ACTIONS, createAuditLog } from "./auditService.js";
import AppError from "../utils/AppError.js";

const patientPopulate = {
  path: "userId",
  select: "name email phone role status"
};

const appointmentPopulate = {
  path: "doctorId",
  select: "specialization qualification experienceYears consultationFee status userId",
  populate: {
    path: "userId",
    select: "name email phone"
  }
};

const getActor = (user) => ({
  actorId: user?._id || null,
  actorRole: user?.role || "system"
});

const auditPatientAction = async (user, action, resourceType = "patients", resourceId = null) => {
  await createAuditLog({
    ...getActor(user),
    action,
    resourceType,
    resourceId
  });
};

const toPatientResponse = (patient) => {
  const plain = patient.toObject ? patient.toObject() : patient;

  return {
    id: plain._id,
    userId: plain.userId?._id || plain.userId,
    name: plain.userId?.name,
    email: plain.userId?.email,
    phone: plain.userId?.phone,
    role: plain.userId?.role,
    userStatus: plain.userId?.status,
    profilePictureUrl: plain.profilePictureUrl,
    dateOfBirth: plain.dateOfBirth,
    gender: plain.gender,
    bloodGroup: plain.bloodGroup,
    address: plain.address,
    emergencyContact: plain.emergencyContact,
    medicalHistory: plain.medicalHistory,
    allergies: plain.allergies,
    currentMedications: plain.currentMedications,
    insuranceDetails: plain.insuranceDetails,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt
  };
};

const toAppointmentResponse = (appointment) => {
  const plain = appointment.toObject ? appointment.toObject() : appointment;
  const doctor = plain.doctorId;

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
          fullName: doctor.userId?.name,
          email: doctor.userId?.email,
          phone: doctor.userId?.phone,
          specialization: doctor.specialization,
          qualification: doctor.qualification,
          experienceYears: doctor.experienceYears,
          consultationFee: doctor.consultationFee,
          status: doctor.status
        }
      : null,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt
  };
};

const getOrCreatePatientProfile = async (user) => {
  let patient = await Patient.findOne({ userId: user._id }).populate(patientPopulate);

  if (!patient) {
    patient = await Patient.create({ userId: user._id });
    patient = await Patient.findById(patient._id).populate(patientPopulate);
  }

  return patient;
};

const getPagination = (query) => ({
  skip: (query.page - 1) * query.limit,
  page: query.page,
  limit: query.limit
});

const paginate = (query, total) => ({
  page: query.page,
  limit: query.limit,
  total,
  totalPages: Math.ceil(total / query.limit)
});

export const getMyProfile = async (user) => {
  const patient = await getOrCreatePatientProfile(user);

  await auditPatientAction(user, AUDIT_ACTIONS.PATIENT_PROFILE_VIEW, "patients", patient._id);

  return {
    patient: toPatientResponse(patient)
  };
};

export const updateMyProfile = async (user, payload) => {
  const patient = await getOrCreatePatientProfile(user);
  const userUpdates = {};

  if (payload.name !== undefined) userUpdates.name = payload.name;
  if (payload.phone !== undefined) userUpdates.phone = payload.phone;

  if (Object.keys(userUpdates).length > 0) {
    await User.findByIdAndUpdate(user._id, userUpdates, { runValidators: true });
  }

  const patientUpdates = {};
  [
    "dateOfBirth",
    "gender",
    "bloodGroup",
    "address",
    "emergencyContact",
    "medicalHistory",
    "allergies",
    "currentMedications",
    "insuranceDetails"
  ].forEach((field) => {
    if (payload[field] !== undefined) {
      patientUpdates[field] = payload[field];
    }
  });

  const updatedPatient = await Patient.findByIdAndUpdate(patient._id, patientUpdates, {
    new: true,
    runValidators: true
  }).populate(patientPopulate);

  await auditPatientAction(user, AUDIT_ACTIONS.PATIENT_PROFILE_UPDATE, "patients", updatedPatient._id);

  return {
    patient: toPatientResponse(updatedPatient)
  };
};

export const uploadProfilePicture = async (user, profilePictureUrl) => {
  const patient = await getOrCreatePatientProfile(user);
  const updatedPatient = await Patient.findByIdAndUpdate(
    patient._id,
    { profilePictureUrl },
    { new: true, runValidators: true }
  ).populate(patientPopulate);

  await auditPatientAction(
    user,
    AUDIT_ACTIONS.PATIENT_PROFILE_PICTURE_UPLOAD,
    "patients",
    updatedPatient._id
  );

  return {
    patient: toPatientResponse(updatedPatient)
  };
};

export const getDashboard = async (user) => {
  const patient = await getOrCreatePatientProfile(user);
  const now = new Date();

  const [
    totalAppointments,
    upcomingAppointments,
    completedAppointments,
    cancelledAppointments,
    unreadNotifications
  ] = await Promise.all([
    Appointment.countDocuments({ patientId: patient._id }),
    Appointment.countDocuments({
      patientId: patient._id,
      status: { $in: ["pending", "confirmed"] },
      appointmentDate: { $gte: now }
    }),
    Appointment.countDocuments({ patientId: patient._id, status: "completed" }),
    Appointment.countDocuments({ patientId: patient._id, status: "cancelled" }),
    Notification.countDocuments({ userId: user._id, status: "unread" })
  ]);

  await auditPatientAction(user, AUDIT_ACTIONS.PATIENT_DASHBOARD_VIEW, "patients", patient._id);

  return {
    dashboard: {
      profileCompletion: calculateProfileCompletion(patient),
      totalAppointments,
      upcomingAppointments,
      completedAppointments,
      cancelledAppointments,
      unreadNotifications
    }
  };
};

export const listNotifications = async (user, query) => {
  const filters = { userId: user._id };
  const { skip } = getPagination(query);

  if (query.status) filters.status = query.status;
  if (query.type) filters.type = query.type;

  const [notifications, total] = await Promise.all([
    Notification.find(filters).sort({ createdAt: -1 }).skip(skip).limit(query.limit),
    Notification.countDocuments(filters)
  ]);

  await auditPatientAction(user, AUDIT_ACTIONS.PATIENT_NOTIFICATIONS_VIEW, "notifications", user._id);

  return {
    notifications,
    pagination: paginate(query, total)
  };
};

const appointmentFilterByList = (patientId, listType) => {
  const now = new Date();
  const filters = { patientId };

  if (listType === "upcoming") {
    filters.status = { $in: ["pending", "confirmed"] };
    filters.appointmentDate = { $gte: now };
  }

  if (listType === "completed") {
    filters.status = "completed";
  }

  if (listType === "cancelled") {
    filters.status = "cancelled";
  }

  return filters;
};

export const listAppointments = async (user, query, listType = "history") => {
  const patient = await getOrCreatePatientProfile(user);
  const filters = appointmentFilterByList(patient._id, listType);
  const { skip } = getPagination(query);
  const sort = { appointmentDate: query.sortOrder === "asc" ? 1 : -1, startTime: 1 };

  const [appointments, total] = await Promise.all([
    Appointment.find(filters)
      .populate(appointmentPopulate)
      .sort(sort)
      .skip(skip)
      .limit(query.limit),
    Appointment.countDocuments(filters)
  ]);

  await auditPatientAction(user, AUDIT_ACTIONS.PATIENT_APPOINTMENTS_VIEW, "appointments", patient._id);

  return {
    appointments: appointments.map(toAppointmentResponse),
    pagination: paginate(query, total)
  };
};

const calculateProfileCompletion = (patient) => {
  const checks = [
    patient.userId?.name,
    patient.userId?.email,
    patient.userId?.phone,
    patient.profilePictureUrl,
    patient.dateOfBirth,
    patient.gender && patient.gender !== "undisclosed",
    patient.bloodGroup && patient.bloodGroup !== "unknown",
    patient.address?.city,
    patient.emergencyContact?.phone
  ];

  const completed = checks.filter(Boolean).length;
  return Math.round((completed / checks.length) * 100);
};

export const ensurePatient = (user) => {
  if (user.role !== "patient") {
    throw new AppError("Patient access is required", 403, "PATIENT_ACCESS_REQUIRED");
  }
};
