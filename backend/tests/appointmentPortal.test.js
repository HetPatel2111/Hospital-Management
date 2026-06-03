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
    findOne: vi.fn(),
    findById: vi.fn()
  }
}));

vi.mock("../src/models/Patient.js", () => ({
  default: {
    findOne: vi.fn(),
    findById: vi.fn()
  }
}));

vi.mock("../src/models/Appointment.js", () => ({
  default: {
    create: vi.fn(),
    findById: vi.fn(),
    find: vi.fn(),
    exists: vi.fn(),
    countDocuments: vi.fn(),
    distinct: vi.fn()
  }
}));

vi.mock("../src/models/Notification.js", () => ({
  default: {
    create: vi.fn(),
    exists: vi.fn()
  }
}));

vi.mock("../src/services/auditService.js", () => ({
  AUDIT_ACTIONS: {
    APPOINTMENT_CREATE: "APPOINTMENT_CREATE",
    APPOINTMENT_CANCEL: "APPOINTMENT_CANCEL",
    APPOINTMENT_RESCHEDULE: "APPOINTMENT_RESCHEDULE",
    APPOINTMENT_CONFIRM: "APPOINTMENT_CONFIRM",
    APPOINTMENT_COMPLETE: "APPOINTMENT_COMPLETE",
    APPOINTMENT_STATUS_UPDATE: "APPOINTMENT_STATUS_UPDATE",
    APPOINTMENT_VIEW: "APPOINTMENT_VIEW"
  },
  createAuditLog: vi.fn()
}));

const Doctor = (await import("../src/models/Doctor.js")).default;
const Patient = (await import("../src/models/Patient.js")).default;
const Appointment = (await import("../src/models/Appointment.js")).default;
const Notification = (await import("../src/models/Notification.js")).default;

const appointmentService = await import("../src/services/appointmentService.js");

const mockQuery = (resolvedValue) => {
  const query = {};
  query.populate = vi.fn().mockReturnValue(query);
  query.sort = vi.fn().mockReturnValue(query);
  query.skip = vi.fn().mockReturnValue(query);
  query.limit = vi.fn().mockReturnValue(query);
  query.then = vi.fn((resolve) => resolve(resolvedValue));
  return query;
};

describe("Appointment Management Module - Services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const getApprovedDoctor = () => ({
    _id: "doc-1",
    status: "approved",
    userId: { _id: "user-doc1", name: "Dr. House", email: "house@example.com" },
    availability: {
      weeklySchedule: [
        {
          dayOfWeek: 1, // Monday
          isAvailable: true,
          slots: [{ startTime: "09:00", endTime: "17:00" }]
        }
      ],
      exceptions: []
    }
  });

  describe("createAppointment", () => {
    it("should successfully create appointment if doctor is available and slot is open", async () => {
      Patient.findOne.mockResolvedValue({ _id: "patient-1" });
      const doctor = getApprovedDoctor();
      Doctor.findById.mockReturnValue(mockQuery(doctor));
      Appointment.exists.mockResolvedValue(false);

      const createdMock = {
        _id: "app-1",
        patientId: "patient-1",
        doctorId: "doc-1",
        appointmentDate: new Date("2026-06-08T00:00:00.000Z"), // Monday
        startTime: "10:00",
        endTime: "11:00",
        reason: "checkup",
        status: "pending"
      };
      Appointment.create.mockResolvedValue(createdMock);

      const populatedMock = {
        ...createdMock,
        toObject: () => createdMock
      };
      Appointment.findById.mockReturnValue(mockQuery(populatedMock));

      const result = await appointmentService.createAppointment("user-patient1", {
        doctorId: "doc-1",
        appointmentDate: "2026-06-08",
        startTime: "10:00",
        endTime: "11:00",
        reason: "checkup"
      });

      expect(result.appointment).toBeDefined();
      expect(Notification.create).toHaveBeenCalledOnce();
    });

    it("should throw error if exception date blocks booking", async () => {
      Patient.findOne.mockResolvedValue({ _id: "patient-1" });
      const doctor = getApprovedDoctor();
      doctor.availability.exceptions = [
        { date: new Date("2026-06-08T00:00:00.000Z"), isAvailable: false, reason: "Sick leave" }
      ];

      Doctor.findById.mockReturnValue(mockQuery(doctor));

      await expect(
        appointmentService.createAppointment("user-patient1", {
          doctorId: "doc-1",
          appointmentDate: "2026-06-08",
          startTime: "10:00",
          endTime: "11:00"
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        code: "DOCTOR_UNAVAILABLE_EXCEPTION"
      });
    });

    it("should throw error on double booking (overlapping slots)", async () => {
      Patient.findOne.mockResolvedValue({ _id: "patient-1" });
      const doctor = getApprovedDoctor();
      Doctor.findById.mockReturnValue(mockQuery(doctor));
      Appointment.exists.mockResolvedValue(true);

      await expect(
        appointmentService.createAppointment("user-patient1", {
          doctorId: "doc-1",
          appointmentDate: "2026-06-08",
          startTime: "10:00",
          endTime: "11:00"
        })
      ).rejects.toMatchObject({
        statusCode: 409,
        code: "DOUBLE_BOOKING"
      });
    });
  });

  describe("cancelAppointment", () => {
    it("should allow patient to cancel their own appointment", async () => {
      const appMock = {
        _id: "app-1",
        patientId: { userId: { _id: "user-patient1" } },
        doctorId: { userId: { _id: "user-doc1" } },
        status: "pending",
        appointmentDate: new Date(),
        save: vi.fn().mockResolvedValue(this)
      };

      Appointment.findById.mockReturnValue(mockQuery(appMock));

      const result = await appointmentService.cancelAppointment("app-1", {
        _id: "user-patient1",
        role: "patient"
      }, "change of plans");

      expect(result.appointment.status).toBe("cancelled");
      expect(appMock.save).toHaveBeenCalledOnce();
      expect(Notification.create).toHaveBeenCalledOnce(); // notify doctor
    });

    it("should block cancellation for third-party user", async () => {
      const appMock = {
        _id: "app-1",
        patientId: { userId: { _id: "user-patient1" } },
        doctorId: { userId: { _id: "user-doc1" } },
        status: "pending",
        appointmentDate: new Date()
      };

      Appointment.findById.mockReturnValue(mockQuery(appMock));

      await expect(
        appointmentService.cancelAppointment("app-1", {
          _id: "user-other",
          role: "patient"
        })
      ).rejects.toMatchObject({
        statusCode: 403,
        code: "FORBIDDEN"
      });
    });
  });

  describe("rescheduleAppointment", () => {
    it("should allow rescheduling for pending status to available slot", async () => {
      const doctor = getApprovedDoctor();
      const appMock = {
        _id: "app-1",
        patientId: { userId: { _id: "user-patient1" } },
        doctorId: doctor,
        status: "pending",
        appointmentDate: new Date(),
        save: vi.fn().mockResolvedValue(this)
      };

      Appointment.findById.mockReturnValue(mockQuery(appMock));
      Appointment.exists.mockResolvedValue(false);

      const result = await appointmentService.rescheduleAppointment("app-1", {
        _id: "user-patient1",
        role: "patient"
      }, {
        appointmentDate: "2026-06-08",
        startTime: "12:00",
        endTime: "13:00"
      });

      expect(result.appointment.startTime).toBe("12:00");
      expect(appMock.save).toHaveBeenCalledOnce();
    });
  });

  describe("confirmAppointment", () => {
    it("should allow assigned doctor to confirm pending appointment", async () => {
      const appMock = {
        _id: "app-1",
        patientId: { userId: { _id: "user-patient1" } },
        doctorId: { userId: { _id: "user-doc1" } },
        status: "pending",
        appointmentDate: new Date(),
        save: vi.fn().mockResolvedValue(this)
      };

      Appointment.findById.mockReturnValue(mockQuery(appMock));

      const result = await appointmentService.confirmAppointment("app-1", {
        _id: "user-doc1",
        role: "doctor"
      });

      expect(result.appointment.status).toBe("confirmed");
      expect(appMock.save).toHaveBeenCalledOnce();
    });
  });

  describe("admin features", () => {
    it("listAllAppointments - filters and paginates correct matches", async () => {
      const findMock = {
        populate: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([])
      };
      Appointment.find.mockReturnValue(findMock);
      Appointment.countDocuments.mockResolvedValue(5);

      const result = await appointmentService.listAllAppointments({
        page: 1,
        limit: 10,
        sortOrder: "desc"
      });

      expect(result.appointments).toBeDefined();
      expect(result.pagination.total).toBe(5);
    });

    it("updateAppointmentStatus - forces status updates by admin only", async () => {
      const appMock = {
        _id: "app-1",
        patientId: { userId: { _id: "user-patient1" } },
        doctorId: { userId: { _id: "user-doc1" } },
        status: "pending",
        save: vi.fn().mockResolvedValue(this)
      };

      Appointment.findById.mockReturnValue(mockQuery(appMock));

      const result = await appointmentService.updateAppointmentStatus("app-1", "refunded", {
        _id: "admin-1",
        role: "admin"
      });

      expect(result.appointment.status).toBe("refunded");
      expect(appMock.save).toHaveBeenCalledOnce();
    });

    it("updateAppointmentStatus - rejects non-admin update statuses", async () => {
      const appMock = {
        _id: "app-1",
        patientId: { userId: { _id: "user-patient1" } },
        doctorId: { userId: { _id: "user-doc1" } },
        status: "pending"
      };
      Appointment.findById.mockReturnValue(mockQuery(appMock));

      await expect(
        appointmentService.updateAppointmentStatus("app-1", "refunded", {
          _id: "user-1",
          role: "patient"
        })
      ).rejects.toMatchObject({
        statusCode: 403,
        code: "ADMIN_ACCESS_REQUIRED"
      });
    });
  });

  describe("reminderService", () => {
    it("should send reminder notification if appointment tomorrow and no reminder sent yet", async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const appMock = {
        _id: "app-rem-1",
        status: "confirmed",
        appointmentDate: tomorrow,
        startTime: "09:00",
        doctorId: { userId: { name: "Dr. House" } },
        patientId: { userId: { _id: "user-patient-rem" } }
      };

      Appointment.find.mockReturnValue(mockQuery([appMock]));
      Notification.exists.mockResolvedValue(false);

      const reminderService = await import("../src/services/reminderService.js");
      await reminderService.checkUpcomingAppointments();

      expect(Appointment.find).toHaveBeenCalledOnce();
      expect(Notification.exists).toHaveBeenCalledOnce();
      expect(Notification.create).toHaveBeenCalledOnce();
      expect(Notification.create).toHaveBeenCalledWith(expect.objectContaining({
        userId: "user-patient-rem",
        type: "appointment",
        title: "Upcoming Appointment Reminder"
      }));
    });

    it("should skip sending reminder if notification was already sent", async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const appMock = {
        _id: "app-rem-2",
        status: "confirmed",
        appointmentDate: tomorrow,
        startTime: "09:00",
        doctorId: { userId: { name: "Dr. House" } },
        patientId: { userId: { _id: "user-patient-rem" } }
      };

      Appointment.find.mockReturnValue(mockQuery([appMock]));
      Notification.exists.mockResolvedValue(true);

      const reminderService = await import("../src/services/reminderService.js");
      await reminderService.checkUpcomingAppointments();

      expect(Notification.create).not.toHaveBeenCalled();
    });
  });
});

