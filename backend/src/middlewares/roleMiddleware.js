import AppError from "../utils/AppError.js";

const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError("Authentication is required", 401, "UNAUTHORIZED"));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError("You do not have permission to access this resource", 403, "FORBIDDEN"));
    }

    return next();
  };
};

export const patientOnly = roleMiddleware("patient");
export const doctorOnly = roleMiddleware("doctor");
export const adminOnly = roleMiddleware("admin");

export default roleMiddleware;
