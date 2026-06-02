import jwt from "jsonwebtoken";
import User from "../models/User.js";
import AppError from "../utils/AppError.js";

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new AppError("Authentication token is required", 401, "UNAUTHORIZED"));
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    if (decoded.type !== "access") {
      return next(new AppError("Invalid authentication token", 401, "INVALID_TOKEN"));
    }

    const user = await User.findById(decoded.sub);

    if (!user) {
      return next(new AppError("Invalid authentication token", 401, "INVALID_TOKEN"));
    }

    if (user.status === "suspended") {
      return next(new AppError("User account is suspended", 403, "ACCOUNT_SUSPENDED"));
    }

    if (user.status === "pending") {
      return next(new AppError("User account is pending approval", 403, "ACCOUNT_PENDING"));
    }

    if (user.status !== "active") {
      return next(new AppError("User account is not active", 403, "ACCOUNT_NOT_ACTIVE"));
    }

    if (
      user.passwordChangedAt &&
      decoded.iat &&
      decoded.iat * 1000 < user.passwordChangedAt.getTime()
    ) {
      return next(new AppError("Authentication token is no longer valid", 401, "TOKEN_STALE"));
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(new AppError("Invalid or expired authentication token", 401, "INVALID_TOKEN"));
  }
};

export default authMiddleware;
