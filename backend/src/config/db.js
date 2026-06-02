import mongoose from "mongoose";
import logger from "./logger.js";

const connectDB = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not configured");
  }

  mongoose.connection.on("connected", () => {
    logger.info("Database connected successfully");
  });

  mongoose.connection.on("error", (error) => {
    if (process.env.NODE_ENV !== "production") {
      logger.error("MongoDB connection error", { error: error.message });
    }
  });

  mongoose.connection.on("disconnected", () => {
    if (process.env.NODE_ENV !== "production") {
      logger.warn("MongoDB disconnected");
    }
  });

  await mongoose.connect(process.env.MONGODB_URI);
};

export default connectDB;
