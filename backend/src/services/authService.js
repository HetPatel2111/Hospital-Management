import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import AppError from "../utils/AppError.js";

const ACCESS_TOKEN_EXPIRES_IN = "15m";
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

export const register = async ({ name, email, phone, password, role }) => {
  const existingUser = await User.findOne({
    $or: [{ email }, ...(phone ? [{ phone }] : [])]
  });

  if (existingUser) {
    throw new AppError("User already exists with provided email or phone", 409, "USER_ALREADY_EXISTS");
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const status = role === "doctor" ? "pending" : "active";

  const user = await User.create({
    name,
    email,
    phone,
    passwordHash,
    role,
    status
  });

  const accessToken = signAccessToken(user);

  return {
    user: sanitizeUser(user),
    accessToken
  };
};

export const login = async ({ email, password }) => {
  const user = await User.findOne({ email }).select("+passwordHash");

  if (!user) {
    throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }

  if (user.status === "suspended") {
    throw new AppError("User account is suspended", 403, "ACCOUNT_SUSPENDED");
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }

  user.lastLoginAt = new Date();
  await user.save();

  const accessToken = signAccessToken(user);

  return {
    user: sanitizeUser(user),
    accessToken
  };
};

export const logout = async () => {
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

  return {
    message: "Password reset successfully"
  };
};

export const getMe = async (user) => {
  return {
    user: sanitizeUser(user)
  };
};
