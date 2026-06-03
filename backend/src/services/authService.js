import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Doctor from "../models/Doctor.js";
import Patient from "../models/Patient.js";
import RefreshToken from "../models/RefreshToken.js";
import User from "../models/User.js";
import { AUDIT_ACTIONS, createAuditLog } from "./auditService.js";
import AppError from "../utils/AppError.js";

const ACCESS_TOKEN_EXPIRES_IN = "15m";
const REFRESH_TOKEN_EXPIRES_IN = "7d";
const REFRESH_TOKEN_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000;
const RESET_TOKEN_EXPIRES_IN = "15m";
const SALT_ROUNDS = 12;

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  status: user.status,
  emailVerified: user.emailVerified,
  phoneVerified: user.phoneVerified,
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

const signAccessToken = (user) => {
  if (!process.env.JWT_ACCESS_SECRET) {
    throw new AppError("JWT access secret is not configured", 500, "SERVER_CONFIGURATION_ERROR");
  }

  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      type: "access"
    },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
  );
};

const signRefreshToken = (user) => {
  if (!process.env.JWT_REFRESH_SECRET) {
    throw new AppError("JWT refresh secret is not configured", 500, "SERVER_CONFIGURATION_ERROR");
  }

  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      type: "refresh"
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
  );
};

const signResetToken = (user) => {
  if (!process.env.JWT_ACCESS_SECRET) {
    throw new AppError("JWT access secret is not configured", 500, "SERVER_CONFIGURATION_ERROR");
  }

  return jwt.sign(
    {
      sub: user._id.toString(),
      type: "reset-password",
      passwordChangedAt: user.passwordChangedAt?.getTime() || null
    },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: RESET_TOKEN_EXPIRES_IN }
  );
};

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

const assertActiveUser = (user) => {
  if (user.status === "suspended") {
    throw new AppError("User account is suspended", 403, "ACCOUNT_SUSPENDED");
  }

  if (user.status === "pending") {
    throw new AppError("User account is pending approval", 403, "ACCOUNT_PENDING");
  }

  if (user.status !== "active") {
    throw new AppError("User account is not active", 403, "ACCOUNT_NOT_ACTIVE");
  }
};

const createRefreshTokenRecord = async (user, session = undefined) => {
  const refreshToken = signRefreshToken(user);
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_MS);

  const payload = [
    {
      userId: user._id,
      tokenHash,
      expiresAt
    }
  ];

  if (session) {
    await RefreshToken.create(payload, { session });
  } else {
    await RefreshToken.create(payload);
  }

  return {
    refreshToken,
    tokenHash
  };
};

const issueTokenPair = async (user, session = undefined) => {
  const accessToken = signAccessToken(user);
  const { refreshToken } = await createRefreshTokenRecord(user, session);

  return {
    accessToken,
    refreshToken
  };
};

const toDoctorResponse = (doctor) => ({
  id: doctor._id,
  userId: doctor.userId,
  specialization: doctor.specialization,
  qualification: doctor.qualification,
  experienceYears: doctor.experienceYears,
  registrationNumber: doctor.registrationNumber,
  consultationFee: doctor.consultationFee,
  availability: doctor.availability,
  status: doctor.status,
  bio: doctor.bio,
  createdAt: doctor.createdAt,
  updatedAt: doctor.updatedAt
});

const toPatientResponse = (patient) => ({
  id: patient._id,
  userId: patient.userId,
  profilePictureUrl: patient.profilePictureUrl,
  dateOfBirth: patient.dateOfBirth,
  gender: patient.gender,
  bloodGroup: patient.bloodGroup,
  address: patient.address,
  emergencyContact: patient.emergencyContact,
  medicalHistory: patient.medicalHistory,
  allergies: patient.allergies,
  currentMedications: patient.currentMedications,
  insuranceDetails: patient.insuranceDetails,
  createdAt: patient.createdAt,
  updatedAt: patient.updatedAt
});

export const register = async ({
  name,
  email,
  phone,
  password,
  role,
  specialization,
  qualification,
  experienceYears,
  registrationNumber,
  consultationFee,
  availability,
  bio
}) => {
  const existingUser = await User.findOne({
    $or: [{ email }, ...(phone ? [{ phone }] : [])]
  });

  if (existingUser) {
    throw new AppError("User already exists with provided email or phone", 409, "USER_ALREADY_EXISTS");
  }

  if (role === "doctor") {
    const existingDoctor = await Doctor.findOne({ registrationNumber });

    if (existingDoctor) {
      throw new AppError("Doctor already exists with this registration number", 409, "DOCTOR_ALREADY_EXISTS");
    }
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const status = role === "doctor" ? "pending" : "active";
  const session = await mongoose.startSession();

  try {
    let user;
    let doctor;
    let patient;

    await session.withTransaction(async () => {
      [user] = await User.create(
        [
          {
            name,
            email,
            phone,
            passwordHash,
            role,
            status
          }
        ],
        { session }
      );

      if (role === "doctor") {
        [doctor] = await Doctor.create(
          [
            {
              userId: user._id,
              specialization,
              qualification,
              experienceYears,
              registrationNumber,
              consultationFee,
              availability,
              status: "pending",
              bio
            }
          ],
          { session }
        );
      } else {
        [patient] = await Patient.create(
          [
            {
              userId: user._id
            }
          ],
          { session }
        );
      }
    });

    await createAuditLog({
      actorId: user._id,
      actorRole: user.role,
      action: AUDIT_ACTIONS.REGISTER,
      resourceType: "users",
      resourceId: user._id
    });

    const response = {
      user: sanitizeUser(user)
    };

    if (doctor) {
      response.doctor = toDoctorResponse(doctor);
    } else {
      response.patient = toPatientResponse(patient);
      const tokens = await issueTokenPair(user);
      response.accessToken = tokens.accessToken;
      response.refreshToken = tokens.refreshToken;
    }

    return response;
  } finally {
    await session.endSession();
  }
};

export const login = async ({ email, password }) => {
  const user = await User.findOne({ email }).select("+passwordHash");

  if (!user) {
    throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }

  assertActiveUser(user);

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }

  user.lastLoginAt = new Date();
  await user.save();

  const tokens = await issueTokenPair(user);

  await createAuditLog({
    actorId: user._id,
    actorRole: user.role,
    action: AUDIT_ACTIONS.LOGIN,
    resourceType: "users",
    resourceId: user._id
  });

  return {
    user: sanitizeUser(user),
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken
  };
};

export const refreshToken = async ({ refreshToken: token }) => {
  let decoded;

  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw new AppError("Invalid or expired refresh token", 401, "INVALID_REFRESH_TOKEN");
  }

  if (decoded.type !== "refresh") {
    throw new AppError("Invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
  }

  const tokenHash = hashToken(token);
  const storedToken = await RefreshToken.findOne({
    tokenHash,
    revokedAt: null,
    expiresAt: { $gt: new Date() }
  });

  if (!storedToken) {
    throw new AppError("Invalid or expired refresh token", 401, "INVALID_REFRESH_TOKEN");
  }

  const user = await User.findById(decoded.sub);

  if (!user || user._id.toString() !== storedToken.userId.toString()) {
    throw new AppError("Invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
  }

  assertActiveUser(user);

  const accessToken = signAccessToken(user);
  const { refreshToken: newRefreshToken, tokenHash: newTokenHash } = await createRefreshTokenRecord(user);

  storedToken.revokedAt = new Date();
  storedToken.replacedByTokenHash = newTokenHash;
  await storedToken.save();

  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken: newRefreshToken
  };
};

export const logout = async ({ user, refreshToken: token }) => {
  const tokenHash = hashToken(token);

  await RefreshToken.findOneAndUpdate(
    {
      userId: user._id,
      tokenHash,
      revokedAt: null
    },
    {
      revokedAt: new Date()
    }
  );

  await createAuditLog({
    actorId: user._id,
    actorRole: user.role,
    action: AUDIT_ACTIONS.LOGOUT,
    resourceType: "users",
    resourceId: user._id
  });

  return {
    message: "Logged out successfully"
  };
};

export const forgotPassword = async ({ email }) => {
  const user = await User.findOne({ email });

  if (!user) {
    return {
      message: "If an account exists for this email, a reset link will be sent"
    };
  }

  const resetToken = signResetToken(user);

  return {
    message: "If an account exists for this email, a reset link will be sent",
    resetToken:
      process.env.NODE_ENV === "production"
        ? undefined
        : resetToken
  };
};

export const resetPassword = async ({ resetToken, password }) => {
  let decoded;

  try {
    decoded = jwt.verify(resetToken, process.env.JWT_ACCESS_SECRET);
  } catch {
    throw new AppError("Invalid or expired reset token", 400, "INVALID_RESET_TOKEN");
  }

  if (decoded.type !== "reset-password") {
    throw new AppError("Invalid reset token", 400, "INVALID_RESET_TOKEN");
  }

  const user = await User.findById(decoded.sub).select("+passwordHash");

  if (!user) {
    throw new AppError("Invalid reset token", 400, "INVALID_RESET_TOKEN");
  }

  const currentPasswordChangedAt = user.passwordChangedAt?.getTime() || null;

  if (currentPasswordChangedAt !== decoded.passwordChangedAt) {
    throw new AppError("Reset token is no longer valid", 400, "INVALID_RESET_TOKEN");
  }

  user.passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  user.passwordChangedAt = new Date();
  await user.save();

  await RefreshToken.updateMany(
    { userId: user._id, revokedAt: null },
    { revokedAt: new Date() }
  );

  await createAuditLog({
    actorId: user._id,
    actorRole: user.role,
    action: AUDIT_ACTIONS.PASSWORD_RESET,
    resourceType: "users",
    resourceId: user._id
  });

  return {
    message: "Password reset successfully"
  };
};

export const getMe = async (user) => {
  return {
    user: sanitizeUser(user)
  };
};
