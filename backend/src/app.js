import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimiter from "./middlewares/rateLimiter.js";
import errorMiddleware from "./middlewares/errorMiddleware.js";
import AppError from "./utils/AppError.js";
import authRoutes from "./routes/authRoutes.js";
import doctorRoutes from "./routes/doctorRoutes.js";
import adminDoctorRoutes from "./routes/adminDoctorRoutes.js";
import patientRoutes from "./routes/patientRoutes.js";
import appointmentRoutes from "./routes/appointmentRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import refundRoutes from "./routes/refundRoutes.js";

const app = express();

app.use(helmet());
const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:3000"
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or tests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1 || /^http:\/\/localhost:\d+$/.test(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(rateLimiter);

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Backend service is healthy"
  });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/patients", patientRoutes);
app.use("/api/v1/doctors", doctorRoutes);
app.use("/api/v1/admin/doctors", adminDoctorRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/appointments", appointmentRoutes);
app.use("/api/v1/analytics", analyticsRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/refunds", refundRoutes);

app.use((req, res, next) => {
  next(new AppError("Route not found", 404, "ROUTE_NOT_FOUND"));
});

app.use(errorMiddleware);

export default app;
