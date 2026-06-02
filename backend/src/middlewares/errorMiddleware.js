import logger from "../config/logger.js";

const normalizeMongoError = (error) => {
  if (error?.code === 11000) {
    const fields = Object.keys(error.keyValue || {});
    return {
      statusCode: 409,
      code: "DUPLICATE_RESOURCE",
      message: fields.length
        ? `Duplicate value for ${fields.join(", ")}`
        : "Duplicate resource",
      details: fields.map((field) => ({
        path: field,
        message: `${field} must be unique`
      }))
    };
  }

  if (error?.name === "ValidationError") {
    return {
      statusCode: 400,
      code: "VALIDATION_ERROR",
      message: "Invalid request payload",
      details: Object.values(error.errors || {}).map((issue) => ({
        path: issue.path,
        message: issue.message
      }))
    };
  }

  if (error?.name === "CastError") {
    return {
      statusCode: 400,
      code: "INVALID_RESOURCE_ID",
      message: "Invalid resource identifier",
      details: [
        {
          path: error.path,
          message: `Invalid ${error.kind || "value"}`
        }
      ]
    };
  }

  return error;
};

const errorMiddleware = (error, req, res, next) => {
  const normalizedError = normalizeMongoError(error);
  const statusCode = normalizedError.statusCode || 500;
  const isOperational = Boolean(normalizedError.statusCode);
  const message =
    process.env.NODE_ENV === "production" && !isOperational
      ? "Internal server error"
      : normalizedError.message;

  if (!isOperational || statusCode >= 500) {
    logger.error("Request failed", {
      message: error.message,
      method: req.method,
      path: req.originalUrl,
      statusCode
    });
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code: normalizedError.code || "INTERNAL_SERVER_ERROR",
      message,
      ...(normalizedError.details ? { details: normalizedError.details } : {})
    }
  });
};

export default errorMiddleware;
