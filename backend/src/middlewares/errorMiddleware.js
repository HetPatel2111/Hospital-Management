import logger from "../config/logger.js";

const errorMiddleware = (error, req, res, next) => {
  const statusCode = error.statusCode || 500;
  const isOperational = Boolean(error.statusCode);
  const message =
    process.env.NODE_ENV === "production" && !isOperational
      ? "Internal server error"
      : error.message;

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
      code: error.code || "INTERNAL_SERVER_ERROR",
      message,
      ...(error.details ? { details: error.details } : {})
    }
  });
};

export default errorMiddleware;
