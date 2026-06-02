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

    req.user = user;
    return next();
  } catch (error) {
    return next(new AppError("Invalid or expired authentication token", 401, "INVALID_TOKEN"));
  }
};

export default authMiddleware;
