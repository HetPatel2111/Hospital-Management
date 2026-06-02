import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimiter from "./middlewares/rateLimiter.js";
import errorMiddleware from "./middlewares/errorMiddleware.js";
import AppError from "./utils/AppError.js";
import authRoutes from "./routes/authRoutes.js";
import doctorRoutes from "./routes/doctorRoutes.js";
import adminDoctorRoutes from "./routes/adminDoctorRoutes.js";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
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
app.use("/api/v1/doctors", doctorRoutes);
app.use("/api/v1/admin/doctors", adminDoctorRoutes);

app.use((req, res, next) => {
  next(new AppError("Route not found", 404, "ROUTE_NOT_FOUND"));
});

app.use(errorMiddleware);

export default app;
