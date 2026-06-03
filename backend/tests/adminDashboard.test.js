import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";

const SchemaMock = function () {
  return {
    index: vi.fn(),
    set: vi.fn(),
    virtual: vi.fn(() => ({ get: vi.fn() }))
  };
};
SchemaMock.Types = {
  ObjectId: vi.fn()
};

vi.mock("mongoose", () => ({
  default: {
    Schema: SchemaMock,
    model: vi.fn(() => ({
      index: vi.fn()
    })),
    Types: {
      ObjectId: {
        isValid: vi.fn(() => true)
      }
    }
  }
}));

vi.mock("../src/models/Patient.js", () => ({
  default: {
    countDocuments: vi.fn(),
    find: vi.fn(),
    findById: vi.fn()
  }
}));

vi.mock("../src/models/Doctor.js", () => ({
  default: {
    countDocuments: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    populate: vi.fn()
  }
}));

vi.mock("../src/models/Appointment.js", () => ({
  default: {
    countDocuments: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
    aggregate: vi.fn()
  }
}));

vi.mock("../src/models/Payment.js", () => ({
  default: {
    aggregate: vi.fn(),
    find: vi.fn()
  }
}));

vi.mock("../src/models/Refund.js", () => ({
  default: {
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
    findById: vi.fn(),
    find: vi.fn()
  }
}));

vi.mock("../src/models/User.js", () => ({
  default: {
    find: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn()
  }
}));

vi.mock("../src/services/auditService.js", () => ({
  AUDIT_ACTIONS: {
    ACCOUNT_SUSPENSION: "ACCOUNT_SUSPENSION",
    ACCOUNT_ACTIVATION: "ACCOUNT_ACTIVATION",
    DOCTOR_APPROVAL: "DOCTOR_APPROVAL",
    DOCTOR_REJECTION: "DOCTOR_REJECTION"
  },
  createAuditLog: vi.fn()
}));

const Patient = (await import("../src/models/Patient.js")).default;
const Doctor = (await import("../src/models/Doctor.js")).default;
const Appointment = (await import("../src/models/Appointment.js")).default;
const Payment = (await import("../src/models/Payment.js")).default;
const Refund = (await import("../src/models/Refund.js")).default;
const User = (await import("../src/models/User.js")).default;

const app = (await import("../src/app.js")).default;

const JWT_SECRET = "my_super_secret_jwt_key_12345";
process.env.JWT_ACCESS_SECRET = JWT_SECRET;

const mockQuery = (resolvedValue) => {
  const query = {};
  query.populate = vi.fn().mockReturnValue(query);
  query.sort = vi.fn().mockReturnValue(query);
  query.skip = vi.fn().mockReturnValue(query);
  query.limit = vi.fn().mockReturnValue(query);
  query.then = vi.fn((resolve) => resolve(resolvedValue));
  return query;
};

describe("Admin Dashboard & Analytics Integration Tests", () => {
  let adminToken;
  let patientToken;

  beforeEach(() => {
    vi.clearAllMocks();
    adminToken = "Bearer " + jwt.sign({ sub: "admin-id", type: "access" }, JWT_SECRET);
    patientToken = "Bearer " + jwt.sign({ sub: "patient-id", type: "access" }, JWT_SECRET);
  });

  describe("Admin Authorization Verification", () => {
    it("should deny access to admin endpoints when no token is provided", async () => {
      const response = await request(app).get("/api/v1/admin/dashboard/overview");
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe("UNAUTHORIZED");
    });

    it("should deny access to admin endpoints for non-admin users (e.g. patients)", async () => {
      User.findById.mockResolvedValue({
        _id: "patient-id",
        role: "patient",
        status: "active"
      });

      const response = await request(app)
        .get("/api/v1/admin/dashboard/overview")
        .set("Authorization", patientToken);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe("FORBIDDEN");
    });

    it("should permit access to admin endpoints for authorized admin users", async () => {
      User.findById.mockResolvedValue({
        _id: "admin-id",
        role: "admin",
        status: "active"
      });

      Patient.countDocuments.mockResolvedValue(10);
      Doctor.countDocuments.mockResolvedValue(5);
      Appointment.countDocuments.mockResolvedValue(20);
      Refund.countDocuments.mockResolvedValue(2);
      Payment.aggregate.mockResolvedValue([{ _id: null, total: 5000 }]);
      Refund.aggregate.mockResolvedValue([{ _id: null, total: 1000 }]);

      const response = await request(app)
        .get("/api/v1/admin/dashboard/overview")
        .set("Authorization", adminToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalPatients).toBe(10);
      expect(response.body.data.totalRevenue).toBe(5000);
    });
  });

  describe("Analytics Endpoint Verification", () => {
    beforeEach(() => {
      User.findById.mockResolvedValue({
        _id: "admin-id",
        role: "admin",
        status: "active"
      });
    });

    it("should correctly aggregate appointment statistics", async () => {
      Appointment.aggregate
        .mockResolvedValueOnce([{ _id: "2026-06-03", count: 5 }]) // daily
        .mockResolvedValueOnce([{ _id: { year: 2026, week: 22 }, count: 12 }]) // weekly
        .mockResolvedValueOnce([{ _id: "2026-06", count: 30 }]); // monthly

      const response = await request(app)
        .get("/api/v1/admin/dashboard/appointments")
        .set("Authorization", adminToken);

      expect(response.status).toBe(200);
      expect(response.body.data.daily).toEqual([{ _id: "2026-06-03", count: 5 }]);
      expect(response.body.data.weekly).toEqual([{ _id: { year: 2026, week: 22 }, count: 12 }]);
      expect(response.body.data.monthly).toEqual([{ _id: "2026-06", count: 30 }]);
    });

    it("should correctly aggregate revenue statistics", async () => {
      Payment.aggregate
        .mockResolvedValueOnce([{ _id: "2026-06-03", amount: 1500 }]) // daily
        .mockResolvedValueOnce([{ _id: { year: 2026, week: 22 }, amount: 4500 }]) // weekly
        .mockResolvedValueOnce([{ _id: "2026-06", amount: 12000 }]); // monthly

      const response = await request(app)
        .get("/api/v1/admin/dashboard/revenue")
        .set("Authorization", adminToken);

      expect(response.status).toBe(200);
      expect(response.body.data.daily).toEqual([{ _id: "2026-06-03", amount: 1500 }]);
      expect(response.body.data.monthly).toEqual([{ _id: "2026-06", amount: 12000 }]);
    });

    it("should correctly aggregate refund statuses", async () => {
      Refund.aggregate.mockResolvedValue([
        { _id: "requested", count: 2, amount: 400 },
        { _id: "refunded", count: 1, amount: 800 }
      ]);

      const response = await request(app)
        .get("/api/v1/admin/dashboard/refunds")
        .set("Authorization", adminToken);

      expect(response.status).toBe(200);
      expect(response.body.data.requested).toBe(2);
      expect(response.body.data.refunded).toBe(1);
      expect(response.body.data.refundedAmount).toBe(800);
    });

    it("should correctly compile doctor popularity and revenue statistics", async () => {
      Appointment.aggregate.mockResolvedValue([{ _id: "doc-1", count: 10 }]);
      Payment.aggregate.mockResolvedValue([{ _id: "doc-1", revenue: 8000 }]);
      Doctor.countDocuments.mockResolvedValue(5);

      const mockPopulatedDocs = [
        {
          _id: {
            _id: "doc-1",
            specialization: "Cardiology",
            rating: 4.8,
            userId: { name: "Dr. Smith" }
          },
          count: 10,
          revenue: 8000
        }
      ];

      Doctor.populate.mockResolvedValue(mockPopulatedDocs);

      const response = await request(app)
        .get("/api/v1/admin/dashboard/doctors")
        .set("Authorization", adminToken);

      expect(response.status).toBe(200);
      expect(response.body.data.mostBooked[0].fullName).toBe("Dr. Smith");
      expect(response.body.data.topRevenue[0].revenue).toBe(8000);
    });
  });

  describe("Patient Management Controls", () => {
    beforeEach(() => {
      User.findById.mockResolvedValue({
        _id: "admin-id",
        role: "admin",
        status: "active"
      });
    });

    it("should query patients with correct pagination and search fields", async () => {
      User.find.mockReturnValue({
        select: vi.fn().mockResolvedValue([{ _id: "user-patient-1" }])
      });

      Patient.find.mockReturnValue(mockQuery([
        {
          _id: "patient-1",
          userId: { _id: "user-patient-1", name: "Alice", email: "alice@gmail.com", phone: "12345678", status: "active" }
        }
      ]));

      Patient.countDocuments.mockResolvedValue(1);

      const response = await request(app)
        .get("/api/v1/admin/patients?search=Alice&page=1&limit=5")
        .set("Authorization", adminToken);

      expect(response.status).toBe(200);
      expect(response.body.data.patients[0].userId.name).toBe("Alice");
      expect(response.body.data.pagination.total).toBe(1);
    });

    it("should successfully suspend an active patient account", async () => {
      Patient.findById.mockResolvedValue({
        _id: "patient-1",
        userId: "user-patient-1"
      });

      User.findByIdAndUpdate.mockResolvedValue({});

      const response = await request(app)
        .patch("/api/v1/admin/patients/patient-1/suspend")
        .set("Authorization", adminToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith("user-patient-1", { status: "suspended" });
    });

    it("should successfully reactivate a suspended patient account", async () => {
      Patient.findById.mockResolvedValue({
        _id: "patient-1",
        userId: "user-patient-1"
      });

      User.findByIdAndUpdate.mockResolvedValue({});

      const response = await request(app)
        .patch("/api/v1/admin/patients/patient-1/activate")
        .set("Authorization", adminToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith("user-patient-1", { status: "active" });
    });
  });
});
