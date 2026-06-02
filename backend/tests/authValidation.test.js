import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import validate from "../src/validators/validate.js";
import { registerSchema } from "../src/validators/authSchemas.js";
import errorMiddleware from "../src/middlewares/errorMiddleware.js";

const createValidationApp = () => {
  const app = express();
  app.use(express.json());
  app.post("/register", validate(registerSchema), (req, res) => {
    res.status(200).json({
      success: true,
      data: req.validated.body
    });
  });
  app.use(errorMiddleware);
  return app;
};

describe("auth registration validation", () => {
  it("rejects public admin registration", async () => {
    const response = await request(createValidationApp())
      .post("/register")
      .send({
        name: "Admin User",
        email: "admin@example.com",
        password: "Password123",
        role: "admin"
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("accepts patient registration payloads", async () => {
    const response = await request(createValidationApp())
      .post("/register")
      .send({
        name: "Patient User",
        email: "patient@example.com",
        password: "Password123",
        role: "patient"
      });

    expect(response.status).toBe(200);
    expect(response.body.data.role).toBe("patient");
  });

  it("requires doctor profile fields during doctor registration", async () => {
    const response = await request(createValidationApp())
      .post("/register")
      .send({
        name: "Doctor User",
        email: "doctor@example.com",
        password: "Password123",
        role: "doctor"
      });

    expect(response.status).toBe(400);
    expect(response.body.error.details.map((detail) => detail.path)).toContain("body.specialization");
  });

  it("accepts complete doctor registration payloads", async () => {
    const response = await request(createValidationApp())
      .post("/register")
      .send({
        name: "Doctor User",
        email: "doctor@example.com",
        password: "Password123",
        role: "doctor",
        specialization: "Cardiology",
        qualification: ["MBBS"],
        experienceYears: 5,
        registrationNumber: "REG-1001",
        consultationFee: 100000
      });

    expect(response.status).toBe(200);
    expect(response.body.data.role).toBe("doctor");
    expect(response.body.data.registrationNumber).toBe("REG-1001");
  });
});
