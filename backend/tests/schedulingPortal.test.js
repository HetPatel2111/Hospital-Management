import { beforeEach, describe, expect, it, vi } from "vitest";

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

vi.mock("../src/models/Doctor.js", () => ({
  default: {
    findById: vi.fn(),
    find: vi.fn(),
    countDocuments: vi.fn()
  }
}));

vi.mock("../src/models/User.js", () => ({
  default: {
    find: vi.fn()
  }
}));

vi.mock("../src/models/Patient.js", () => ({
  default: {
    findOne: vi.fn()
  }
}));

vi.mock("../src/models/Appointment.js", () => ({
  default: {
    create: vi.fn(),
    findById: vi.fn(),
    find: vi.fn(),
    exists: vi.fn(),
    countDocuments: vi.fn()
  }
}));

vi.mock("../src/models/Notification.js", () => ({
  default: {
    create: vi.fn()
  }
}));

vi.mock("../src/services/auditService.js", () => ({
  AUDIT_ACTIONS: {
    APPOINTMENT_CREATE: "APPOINTMENT_CREATE",
    DOCTOR_DISCOVERY_VIEW: "DOCTOR_DISCOVERY_VIEW"
  },
  createAuditLog: vi.fn()
}));

const Doctor = (await import("../src/models/Doctor.js")).default;
const User = (await import("../src/models/User.js")).default;
const Patient = (await import("../src/models/Patient.js")).default;
const Appointment = (await import("../src/models/Appointment.js")).default;

const doctorService = await import("../src/services/doctorService.js");
const appointmentService = await import("../src/services/appointmentService.js");

const mockQuery = (resolvedValue) => {
  const query = {};
  query.populate = vi.fn().mockReturnValue(query);
  query.select = vi.fn().mockReturnValue(query);
  query.sort = vi.fn().mockReturnValue(query);
  query.skip = vi.fn().mockReturnValue(query);
  query.limit = vi.fn().mockReturnValue(query);
  query.then = vi.fn((resolve) => resolve(resolvedValue));
  return query;
};

describe("Advanced Scheduling and Search Portal Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const getMockDoctor = () => ({
    _id: "doc-1",
    status: "approved",
    userId: { _id: "user-doc1", name: "Dr. House", email: "house@example.com" },
    availability: {
      weeklySchedule: [
        {
          dayOfWeek: 3, // Wednesday
          isAvailable: true,
          slots: [
            { startTime: "10:00", endTime: "13:00" },
            { startTime: "14:00", endTime: "18:00" }
          ]
        }
      ],
      exceptions: [
        {
          date: new Date("2026-06-03T00:00:00.000Z"), // Wednesday
          isAvailable: false,
          startTime: "10:00",
          endTime: "11:00",
          reason: "Dentist appointment"
        }
      ]
    }
  });

  describe("getDoctorAvailabilityForDate", () => {
    it("should respect slot-specific exceptions and getUTCDay index", async () => {
      const doctor = getMockDoctor();
      Doctor.findById.mockReturnValue(mockQuery(doctor));
      Appointment.find.mockResolvedValue([]); // no bookings

      // Query Wednesday June 3rd, 2026
      const res = await doctorService.getDoctorAvailabilityForDate("doc-1", "2026-06-03");

      expect(res.slots).toHaveLength(2);
      // first slot is blocked by exception (10:00 - 11:00 overlaps with 10:00 - 13:00 exception)
      expect(res.slots[0]).toEqual({
        startTime: "10:00",
        endTime: "13:00",
        available: false
      });
      // second slot is free
      expect(res.slots[1]).toEqual({
        startTime: "14:00",
        endTime: "18:00",
        available: true
      });
    });

    it("should mark all slots unavailable if the 15-patient limit is reached", async () => {
      const doctor = getMockDoctor();
      Doctor.findById.mockReturnValue(mockQuery(doctor));
      // 15 bookings already exist
      Appointment.find.mockResolvedValue(new Array(15).fill({}));

      const res = await doctorService.getDoctorAvailabilityForDate("doc-1", "2026-06-03");
      expect(res.slots).toHaveLength(0);
    });
  });

  describe("createAppointment constraints", () => {
    it("should throw if the 15-patient daily booking limit is exceeded", async () => {
      Patient.findOne.mockResolvedValue({ _id: "patient-1" });
      const doctor = getMockDoctor();
      Doctor.findById.mockReturnValue(mockQuery(doctor));
      Appointment.countDocuments.mockResolvedValue(15);

      await expect(
        appointmentService.createAppointment("user-patient1", {
          doctorId: "doc-1",
          appointmentDate: "2026-06-03",
          startTime: "14:00",
          endTime: "15:00",
          reason: "checkup"
        })
      ).rejects.toThrow("Doctor has reached the maximum booking limit of 15 patients for this date");
    });

    it("should throw if booking overlaps with a slot exception", async () => {
      Patient.findOne.mockResolvedValue({ _id: "patient-1" });
      const doctor = getMockDoctor();
      Doctor.findById.mockReturnValue(mockQuery(doctor));
      Appointment.countDocuments.mockResolvedValue(0);

      // Book overlapping slot (10:30-11:30 overlaps with exception 10:00-11:00)
      await expect(
        appointmentService.createAppointment("user-patient1", {
          doctorId: "doc-1",
          appointmentDate: "2026-06-03",
          startTime: "10:30",
          endTime: "11:30",
          reason: "checkup"
        })
      ).rejects.toThrow("Doctor is not available during requested hours: Dentist appointment");
    });
  });

  describe("buildDoctorFilters and keyword mapping", () => {
    it("should map cardilogistic to Cardiology specialization", async () => {
      User.find.mockReturnValue(mockQuery([])); // no user name matches
      Doctor.find.mockReturnValue(mockQuery([]));
      Doctor.countDocuments.mockResolvedValue(0);

      await doctorService.listDoctors({
        search: "cardilogistic",
        page: 1,
        limit: 10,
        sortBy: "createdAt",
        sortOrder: "desc"
      });

      // The search filters should map cardilogistic to Cardiology
      const filters = Doctor.find.mock.calls[0][0];
      expect(filters.$or).toContainEqual({
        specialization: { $in: ["Cardiology"] }
      });
    });

    it("should find doctor user names", async () => {
      User.find.mockReturnValue(mockQuery([{ _id: "user-doc1" }]));
      Doctor.find.mockReturnValue(mockQuery([]));
      Doctor.countDocuments.mockResolvedValue(0);

      await doctorService.listDoctors({
        search: "House",
        page: 1,
        limit: 10,
        sortBy: "createdAt",
        sortOrder: "desc"
      });

      const filters = Doctor.find.mock.calls[0][0];
      expect(filters.$or).toContainEqual({
        userId: { $in: ["user-doc1"] }
      });
    });
  });
});
