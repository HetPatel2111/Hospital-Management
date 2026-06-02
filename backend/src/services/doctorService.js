import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import Doctor from "../models/Doctor.js";
import User from "../models/User.js";
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

const buildDoctorFilters = (query, includeOnlyApproved = true) => {
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
    filters.$or = [
      { specialization: { $regex: query.search, $options: "i" } },
      { qualification: { $elemMatch: { $regex: query.search, $options: "i" } } },
      { bio: { $regex: query.search, $options: "i" } },
      { registrationNumber: { $regex: query.search, $options: "i" } }
    ];
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

export const listDoctors = async (query) => {
  const filters = buildDoctorFilters(query, true);
  const skip = (query.page - 1) * query.limit;
  const sort = { [query.sortBy]: query.sortOrder === "asc" ? 1 : -1 };

  const [doctors, total] = await Promise.all([
    Doctor.find(filters).populate(doctorPopulate).sort(sort).skip(skip).limit(query.limit),
    Doctor.countDocuments(filters)
  ]);

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

export const getDoctorById = async (id) => {
  const doctor = await getDoctorByIdOrThrow(id);

  if (doctor.status !== "approved") {
    throw new AppError("Doctor not found", 404, "DOCTOR_NOT_FOUND");
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
