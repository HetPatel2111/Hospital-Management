import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import Doctor from "../models/Doctor.js";
import User from "../models/User.js";
import Appointment from "../models/Appointment.js";
import Patient from "../models/Patient.js";
import Prescription from "../models/Prescription.js";
import Notification from "../models/Notification.js";
import { AUDIT_ACTIONS, createAuditLog } from "./auditService.js";
import AppError from "../utils/AppError.js";

const SALT_ROUNDS = 12;

const doctorPopulate = {
  path: "userId",
  select: "name email phone role status"
};

const toDoctorResponse = (doctor) => {
  const plain = doctor.toObject ? doctor.toObject({ virtuals: true }) : doctor;

  return {
    id: plain._id,
    userId: plain.userId?._id || plain.userId,
    fullName: plain.userId?.name || plain.fullName,
    email: plain.userId?.email,
    phone: plain.userId?.phone,
    specialization: plain.specialization,
    experienceYears: plain.experienceYears,
    qualification: plain.qualification,
    consultationFee: plain.consultationFee,
    profileImage: null,
    bio: plain.bio,
    rating: plain.rating || 0,
    availabilityStatus: plain.availabilityStatus,
    availability: plain.availability,
    registrationNumber: plain.registrationNumber,
    status: plain.status,
    userStatus: plain.userId?.status,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt
  };
};

const mapSearchToSpecializations = (searchStr) => {
  if (!searchStr) return [];
  const normalized = searchStr.toLowerCase().trim();
  const matchedSpecs = [];
  
  const keywordMappings = {
    "Cardiology": ["cardiology", "cardilogistic", "heart", "chest pain", "cardiac"],
    "Dermatology": ["dermatology", "dermatologist", "skin", "acne", "rash"],
    "Pediatrics": ["pediatrics", "pediatrician", "child", "kid", "baby"],
    "Orthopedics": ["orthopedics", "orthopedic", "bone", "fracture", "joint"],
    "General Medicine": ["general medicine", "cold", "fever", "cough", "headache", "flu", "general"],
    "Neurology": ["neurology", "neurologist", "brain", "nerve"],
    "Oncology": ["oncology", "oncologist", "cancer", "tumor"],
    "Gynecology": ["gynecology", "gynecologist", "women", "pregnancy", "female"],
    "Psychiatry": ["psychiatry", "psychiatrist", "mental", "depression", "anxiety"],
    "Radiology": ["radiology", "radiologist", "xray", "scan"]
  };

  for (const [spec, keywords] of Object.entries(keywordMappings)) {
    if (keywords.some(kw => normalized.includes(kw) || kw.includes(normalized))) {
      matchedSpecs.push(spec);
    }
  }
  return matchedSpecs;
};

const buildDoctorFilters = async (query, includeOnlyApproved = true) => {
  const filters = {};

  if (includeOnlyApproved) {
    filters.status = "approved";
  }

  if (query.specialization) {
    filters.specialization = { $regex: query.specialization, $options: "i" };
  }

  if (query.minExperience !== undefined || query.maxExperience !== undefined) {
    filters.experienceYears = {};
    if (query.minExperience !== undefined) filters.experienceYears.$gte = query.minExperience;
    if (query.maxExperience !== undefined) filters.experienceYears.$lte = query.maxExperience;
  }

  if (query.minFee !== undefined || query.maxFee !== undefined) {
    filters.consultationFee = {};
    if (query.minFee !== undefined) filters.consultationFee.$gte = query.minFee;
    if (query.maxFee !== undefined) filters.consultationFee.$lte = query.maxFee;
  }

  if (query.search) {
    const orFilters = [
      { specialization: { $regex: query.search, $options: "i" } },
      { qualification: { $elemMatch: { $regex: query.search, $options: "i" } } },
      { bio: { $regex: query.search, $options: "i" } },
      { registrationNumber: { $regex: query.search, $options: "i" } }
    ];

    // Name search: find doctor user names
    const matchingUsers = await User.find({
      name: { $regex: query.search, $options: "i" },
      role: "doctor"
    }).select("_id");
    if (matchingUsers.length > 0) {
      orFilters.push({ userId: { $in: matchingUsers.map(u => u._id) } });
    }

    // Specialization keyword mapping
    const matchedSpecs = mapSearchToSpecializations(query.search);
    if (matchedSpecs.length > 0) {
      orFilters.push({ specialization: { $in: matchedSpecs } });
    }

    filters.$or = orFilters;
  }

  return filters;
};

const getDoctorByIdOrThrow = async (id) => {
  const doctor = await Doctor.findById(id).populate(doctorPopulate);

  if (!doctor) {
    throw new AppError("Doctor not found", 404, "DOCTOR_NOT_FOUND");
  }

  return doctor;
};

export const listDoctors = async (query, actor = null) => {
  const filters = await buildDoctorFilters(query, true);
  const skip = (query.page - 1) * query.limit;
  const sort = { [query.sortBy]: query.sortOrder === "asc" ? 1 : -1 };

  const [doctors, total] = await Promise.all([
    Doctor.find(filters).populate(doctorPopulate).sort(sort).skip(skip).limit(query.limit),
    Doctor.countDocuments(filters)
  ]);

  if (actor) {
    await createAuditLog({
      ...getActor(actor),
      action: AUDIT_ACTIONS.DOCTOR_DISCOVERY_VIEW,
      resourceType: "doctors",
      resourceId: null
    });
  }

  return {
    doctors: doctors.map(toDoctorResponse),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit)
    }
  };
};

export const getDoctorById = async (id, actor = null) => {
  const doctor = await getDoctorByIdOrThrow(id);

  if (doctor.status !== "approved") {
    throw new AppError("Doctor not found", 404, "DOCTOR_NOT_FOUND");
  }

  if (actor) {
    await createAuditLog({
      ...getActor(actor),
      action: AUDIT_ACTIONS.DOCTOR_PROFILE_VIEW,
      resourceType: "doctors",
      resourceId: doctor._id
    });
  }

  return {
    doctor: toDoctorResponse(doctor)
  };
};

export const getPendingDoctors = async () => {
  const doctors = await Doctor.find({ status: "pending" })
    .populate(doctorPopulate)
    .sort({ createdAt: -1 });

  return {
    doctors: doctors.map(toDoctorResponse)
  };
};

export const getMyDoctorProfile = async (userId) => {
  const doctor = await Doctor.findOne({ userId }).populate(doctorPopulate);

  if (!doctor) {
    throw new AppError("Doctor profile not found", 404, "DOCTOR_PROFILE_NOT_FOUND");
  }

  return {
    doctor: toDoctorResponse(doctor)
  };
};

export const createDoctor = async (payload) => {
  const existingUser = await User.findOne({
    $or: [{ email: payload.email }, ...(payload.phone ? [{ phone: payload.phone }] : [])]
  });

  if (existingUser) {
    throw new AppError("User already exists with provided email or phone", 409, "USER_ALREADY_EXISTS");
  }

  const existingDoctor = await Doctor.findOne({ registrationNumber: payload.registrationNumber });

  if (existingDoctor) {
    throw new AppError("Doctor already exists with this registration number", 409, "DOCTOR_ALREADY_EXISTS");
  }

  const session = await mongoose.startSession();

  try {
    let doctor;

    await session.withTransaction(async () => {
      const passwordHash = await bcrypt.hash(payload.password, SALT_ROUNDS);
      const [user] = await User.create(
        [
          {
            name: payload.fullName,
            email: payload.email,
            phone: payload.phone,
            passwordHash,
            role: "doctor",
            status: payload.status === "approved" ? "active" : "pending"
          }
        ],
        { session }
      );

      [doctor] = await Doctor.create(
        [
          {
            userId: user._id,
            specialization: payload.specialization,
            qualification: payload.qualification,
            experienceYears: payload.experienceYears,
            registrationNumber: payload.registrationNumber,
            consultationFee: payload.consultationFee,
            availability: payload.availability,
            status: payload.status,
            bio: payload.bio
          }
        ],
        { session }
      );
    });

    const createdDoctor = await Doctor.findById(doctor._id).populate(doctorPopulate);

    return {
      doctor: toDoctorResponse(createdDoctor)
    };
  } finally {
    await session.endSession();
  }
};

export const updateDoctor = async (id, payload) => {
  const doctor = await getDoctorByIdOrThrow(id);

  if (payload.registrationNumber && payload.registrationNumber !== doctor.registrationNumber) {
    const duplicate = await Doctor.findOne({ registrationNumber: payload.registrationNumber });
    if (duplicate) {
      throw new AppError("Doctor already exists with this registration number", 409, "DOCTOR_ALREADY_EXISTS");
    }
  }

  const userUpdates = {};
  if (payload.fullName) userUpdates.name = payload.fullName;
  if (payload.phone) userUpdates.phone = payload.phone;

  if (Object.keys(userUpdates).length > 0) {
    await User.findByIdAndUpdate(doctor.userId._id, userUpdates, {
      runValidators: true
    });
  }

  const doctorUpdates = {};
  [
    "specialization",
    "experienceYears",
    "qualification",
    "consultationFee",
    "bio",
    "availability",
    "registrationNumber",
    "status"
  ].forEach((field) => {
    if (payload[field] !== undefined) {
      doctorUpdates[field] = payload[field];
    }
  });

  const updatedDoctor = await Doctor.findByIdAndUpdate(id, doctorUpdates, {
    new: true,
    runValidators: true
  }).populate(doctorPopulate);

  return {
    doctor: toDoctorResponse(updatedDoctor)
  };
};

export const updateMyDoctorProfile = async (userId, payload) => {
  const doctor = await Doctor.findOne({ userId }).populate(doctorPopulate);

  if (!doctor) {
    throw new AppError("Doctor profile not found", 404, "DOCTOR_PROFILE_NOT_FOUND");
  }

  return updateDoctor(doctor._id, payload);
};

export const updateMyAvailability = async (userId, availability) => {
  const doctor = await Doctor.findOneAndUpdate(
    { userId },
    { availability },
    { new: true, runValidators: true }
  ).populate(doctorPopulate);

  if (!doctor) {
    throw new AppError("Doctor profile not found", 404, "DOCTOR_PROFILE_NOT_FOUND");
  }

  return {
    doctor: toDoctorResponse(doctor)
  };
};

const getActor = (actor) => ({
  actorId: actor?._id || null,
  actorRole: actor?.role || "system"
});

export const deleteDoctor = async (id, actor = null) => {
  const doctor = await getDoctorByIdOrThrow(id);
  await Doctor.findByIdAndDelete(id);
  await User.findByIdAndUpdate(doctor.userId._id, { status: "suspended" });

  await createAuditLog({
    ...getActor(actor),
    action: AUDIT_ACTIONS.ACCOUNT_SUSPENSION,
    resourceType: "users",
    resourceId: doctor.userId._id
  });

  return {
    message: "Doctor deleted successfully"
  };
};

export const activateDoctor = async (id, actor = null) => {
  const doctor = await Doctor.findByIdAndUpdate(
    id,
    { status: "approved" },
    { new: true, runValidators: true }
  ).populate(doctorPopulate);

  if (!doctor) {
    throw new AppError("Doctor not found", 404, "DOCTOR_NOT_FOUND");
  }

  await User.findByIdAndUpdate(doctor.userId._id, { status: "active" });

  const updatedDoctor = await Doctor.findById(id).populate(doctorPopulate);

  await createAuditLog({
    ...getActor(actor),
    action: AUDIT_ACTIONS.DOCTOR_APPROVAL,
    resourceType: "doctors",
    resourceId: updatedDoctor._id
  });

  return {
    doctor: toDoctorResponse(updatedDoctor)
  };
};

export const rejectDoctor = async (id, actor = null) => {
  const doctor = await getDoctorByIdOrThrow(id);
  await Doctor.findByIdAndUpdate(id, { status: "rejected" }, { runValidators: true });
  await User.findByIdAndUpdate(doctor.userId._id, { status: "suspended" });

  const updatedDoctor = await Doctor.findById(id).populate(doctorPopulate);

  await createAuditLog({
    ...getActor(actor),
    action: AUDIT_ACTIONS.DOCTOR_REJECTION,
    resourceType: "doctors",
    resourceId: updatedDoctor._id
  });

  await createAuditLog({
    ...getActor(actor),
    action: AUDIT_ACTIONS.ACCOUNT_SUSPENSION,
    resourceType: "users",
    resourceId: doctor.userId._id
  });

  return {
    doctor: toDoctorResponse(updatedDoctor)
  };
};

export const deactivateDoctor = async (id, actor = null) => {
  const doctor = await getDoctorByIdOrThrow(id);
  await Doctor.findByIdAndUpdate(id, { status: "rejected" }, { runValidators: true });
  await User.findByIdAndUpdate(doctor.userId._id, { status: "suspended" });

  const updatedDoctor = await Doctor.findById(id).populate(doctorPopulate);

  await createAuditLog({
    ...getActor(actor),
    action: AUDIT_ACTIONS.ACCOUNT_SUSPENSION,
    resourceType: "users",
    resourceId: doctor.userId._id
  });

  return {
    doctor: toDoctorResponse(updatedDoctor)
  };
};

const toDoctorAppointmentResponse = (appointment) => {
  const plain = appointment.toObject ? appointment.toObject({ virtuals: true }) : appointment;
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
    patient: patient
      ? {
          id: patient._id,
          fullName: patient.userId?.name,
          email: patient.userId?.email,
          phone: patient.userId?.phone,
          dateOfBirth: patient.dateOfBirth,
          gender: patient.gender,
          bloodGroup: patient.bloodGroup
        }
      : null,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt
  };
};

const toPatientDetailsResponse = (patient) => {
  const plain = patient.toObject ? patient.toObject() : patient;

  return {
    id: plain._id,
    userId: plain.userId?._id || plain.userId,
    name: plain.userId?.name,
    email: plain.userId?.email,
    phone: plain.userId?.phone,
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

export const getMyAppointments = async (userId, query) => {
  const doctor = await Doctor.findOne({ userId });
  if (!doctor) {
    throw new AppError("Doctor profile not found", 404, "DOCTOR_PROFILE_NOT_FOUND");
  }

  const filters = { doctorId: doctor._id };

  if (query.status) {
    filters.status = query.status;
  }

  if (query.startDate || query.endDate) {
    filters.appointmentDate = {};
    if (query.startDate) {
      filters.appointmentDate.$gte = new Date(query.startDate);
    }
    if (query.endDate) {
      filters.appointmentDate.$lte = new Date(query.endDate);
    }
  }

  const skip = (query.page - 1) * query.limit;
  const sort = { appointmentDate: query.sortOrder === "asc" ? 1 : -1, startTime: 1 };

  const [appointments, total] = await Promise.all([
    Appointment.find(filters)
      .populate({
        path: "patientId",
        populate: {
          path: "userId",
          select: "name email phone"
        }
      })
      .sort(sort)
      .skip(skip)
      .limit(query.limit),
    Appointment.countDocuments(filters)
  ]);

  await createAuditLog({
    actorId: userId,
    actorRole: "doctor",
    action: AUDIT_ACTIONS.DOCTOR_APPOINTMENTS_VIEW,
    resourceType: "doctors",
    resourceId: doctor._id
  });

  return {
    appointments: appointments.map(toDoctorAppointmentResponse),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit)
    }
  };
};

export const getMyPatientById = async (userId, patientId) => {
  const doctor = await Doctor.findOne({ userId });
  if (!doctor) {
    throw new AppError("Doctor profile not found", 404, "DOCTOR_PROFILE_NOT_FOUND");
  }

  const hasAppointment = await Appointment.exists({ doctorId: doctor._id, patientId });
  if (!hasAppointment) {
    throw new AppError("Patient not assigned to this doctor", 403, "PATIENT_NOT_ASSIGNED");
  }

  const patient = await Patient.findById(patientId).populate({
    path: "userId",
    select: "name email phone"
  });

  if (!patient) {
    throw new AppError("Patient not found", 404, "PATIENT_NOT_FOUND");
  }

  await createAuditLog({
    actorId: userId,
    actorRole: "doctor",
    action: AUDIT_ACTIONS.DOCTOR_PATIENT_VIEW,
    resourceType: "patients",
    resourceId: patient._id
  });

  return {
    patient: toPatientDetailsResponse(patient)
  };
};

export const createPrescription = async (userId, payload) => {
  const doctor = await Doctor.findOne({ userId }).populate(doctorPopulate);
  if (!doctor) {
    throw new AppError("Doctor profile not found", 404, "DOCTOR_PROFILE_NOT_FOUND");
  }

  const appointment = await Appointment.findById(payload.appointmentId);
  if (!appointment) {
    throw new AppError("Appointment not found", 404, "APPOINTMENT_NOT_FOUND");
  }

  if (appointment.doctorId.toString() !== doctor._id.toString()) {
    throw new AppError("You do not have permission to prescribe for this appointment", 403, "FORBIDDEN");
  }

  if (!["confirmed", "completed"].includes(appointment.status)) {
    throw new AppError("Prescriptions can only be created for confirmed or completed appointments", 400, "INVALID_APPOINTMENT_STATUS");
  }

  const existingPrescription = await Prescription.findOne({ appointmentId: appointment._id });
  if (existingPrescription) {
    throw new AppError("A prescription already exists for this appointment", 409, "PRESCRIPTION_ALREADY_EXISTS");
  }

  const prescription = await Prescription.create({
    appointmentId: appointment._id,
    diagnosis: payload.diagnosis,
    medicines: payload.medicines,
    instructions: payload.instructions,
    followUpDate: payload.followUpDate
  });

  await appointment.populate("patientId");
  const patientUserId = appointment.patientId?.userId;

  if (patientUserId) {
    await Notification.create({
      userId: patientUserId,
      type: "prescription",
      title: "New Prescription Added",
      message: `A new prescription has been added by Dr. ${doctor.userId?.name || "assigned doctor"} for your appointment.`
    });
  }

  await createAuditLog({
    actorId: userId,
    actorRole: "doctor",
    action: AUDIT_ACTIONS.PRESCRIPTION_CREATE,
    resourceType: "prescriptions",
    resourceId: prescription._id
  });

  return {
    prescription
  };
};

export const getMyAvailability = async (userId) => {
  const doctor = await Doctor.findOne({ userId });
  if (!doctor) {
    throw new AppError("Doctor profile not found", 404, "DOCTOR_PROFILE_NOT_FOUND");
  }

  return {
    availability: doctor.availability
  };
};

export const getDoctorAvailabilityForDate = async (doctorId, dateStr) => {
  const doctor = await Doctor.findById(doctorId).populate(doctorPopulate);
  if (!doctor) {
    throw new AppError("Doctor not found", 404, "DOCTOR_NOT_FOUND");
  }

  const date = new Date(dateStr);
  const appointmentDay = date.getUTCDay();
  const appointmentDateStr = date.toISOString().split("T")[0];

  // 1. Check Exceptions first
  const dayExceptions = doctor.availability?.exceptions?.filter((e) => {
    const exceptionDateStr = new Date(e.date).toISOString().split("T")[0];
    return exceptionDateStr === appointmentDateStr;
  }) || [];

  const isFullDayBlocked = dayExceptions.some(
    (e) => !e.isAvailable && !e.startTime && !e.endTime
  );

  if (isFullDayBlocked) {
    return { slots: [] };
  }

  // 2. Check Weekly Schedule
  const daySchedule = doctor.availability?.weeklySchedule?.find(
    (d) => d.dayOfWeek === appointmentDay
  );

  if (!daySchedule || !daySchedule.isAvailable || !daySchedule.slots?.length) {
    return { slots: [] };
  }

  // 3. Fetch Bookings for that day
  const bookings = await Appointment.find({
    doctorId: doctor._id,
    appointmentDate: date,
    status: { $in: ["pending_payment", "pending", "confirmed", "completed"] }
  });

  // Enforce 15 patient daily booking limit
  if (bookings.length >= 15) {
    return { slots: [] };
  }

  // 4. Map weekly schedule slots and check overlaps
  const slots = daySchedule.slots.map((slot) => {
    const isBooked = bookings.some(
      (booking) => slot.startTime < booking.endTime && slot.endTime > booking.startTime
    );

    const isBlockedByException = dayExceptions.some((e) => {
      if (!e.isAvailable && e.startTime && e.endTime) {
        return slot.startTime < e.endTime && slot.endTime > e.startTime;
      }
      return false;
    });

    return {
      startTime: slot.startTime,
      endTime: slot.endTime,
      available: !isBooked && !isBlockedByException
    };
  });

  return { slots };
};


