import logger from "../config/logger.js";
import AuditLog from "../models/AuditLog.js";

export const AUDIT_ACTIONS = {
  REGISTER: "REGISTER",
  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",
  PASSWORD_RESET: "PASSWORD_RESET",
  DOCTOR_APPROVAL: "DOCTOR_APPROVAL",
  DOCTOR_REJECTION: "DOCTOR_REJECTION",
  ACCOUNT_SUSPENSION: "ACCOUNT_SUSPENSION"
};

export const createAuditLog = async ({
  actorId = null,
  actorRole = "system",
  action,
  resourceType,
  resourceId = null
}) => {
  try {
    await AuditLog.create({
      actorId,
      actorRole,
      action,
      resourceType,
      resourceId,
      timestamp: new Date()
    });
  } catch (error) {
    logger.warn("Failed to create audit log", {
      action,
      resourceType,
      error: error.message
    });
  }
};
