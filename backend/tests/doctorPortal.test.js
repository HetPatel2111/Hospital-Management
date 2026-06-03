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

vi.mock("../src/models/Appointment.js", () => ({
  default: {
    findById: vi.fn(),
    find: vi.fn(),
    exists: vi.fn(),
    countDocuments: vi.fn(),
    distinct: vi.fn()
  }
}));

vi.mock("../src/models/Patient.js", () => ({
  default: {
    findById: vi.fn()
  }
}));

vi.mock("../src/models/Prescription.js", () => ({
  default: {
    create: vi.fn(),
    findOne: vi.fn()
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
    DOCTOR_APPOINTMENTS_VIEW: "DOCTOR_APPOINTMENTS_VIEW",
    DOCTOR_PATIENT_VIEW: "DOCTOR_PATIENT_VIEW",
    PRESCRIPTION_CREATE: "PRESCRIPTION_CREATE",
    APPOINTMENT_COMPLETE: "APPOINTMENT_COMPLETE",
    DOCTOR_DASHBOARD_VIEW: "DOCTOR_DASHBOARD_VIEW"
  },
  createAuditLog: vi.fn()
}));

const Doctor = (await import("../src/models/Doctor.js")).default;
const Appointment = (await import("../src/models/Appointment.js")).default;
const Patient = (await import("../src/models/Patient.js")).default;
const Prescription = (await import("../src/models/Prescription.js")).default;
const Notification = (await import("../src/models/Notification.js")).default;

const doctorService = await import("../src/services/doctorService.js");
const appointmentService = await import("../src/services/appointmentService.js");
const analyticsService = await import("../src/services/analyticsService.js");

const mockQuery = (resolvedValue) => {
  const query = {};
  query.populate = vi.fn().mockReturnValue(query);
  query.sort = vi.fn().mockReturnValue(query);
  query.skip = vi.fn().mockReturnValue(query);
  query.limit = vi.fn().mockReturnValue(query);
  query.then = vi.fn((resolve) => resolve(resolvedValue));
  return query;
};

describe("Doctor Portal - Services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("doctorService", () => {
    it("getMyAppointments - returns paginated appointments", async () => {
      Doctor.findOne.mockReturnValue(mockQuery({ _id: "doc-id-1", availability: {} }));

      const appointmentsMock = [
        {
          _id: "app-1",
          appointmentDate: new Date(),
          startTime: "10:00",
          endTime: "10:30",
          status: "confirmed",
          patientId: {
            _id: "patient-1",
            userId: { name: "John Doe", email: "john@example.com" },
            dateOfBirth: new Date(),
            gender: "male",
            bloodGroup: "O+"
          }
        }
      ];

      Appointment.find.mockReturnValue(mockQuery(appointmentsMock));
      Appointment.countDocuments.mockResolvedValue(1);

      const result = await doctorService.getMyAppointments("user-1", {
        page: 1,
        limit: 10,
        sortOrder: "desc"
      });

      expect(result.appointments).toHaveLength(1);
      expect(result.appointments[0].patient.fullName).toBe("John Doe");
      expect(result.pagination.total).toBe(1);
    });

    it("getMyPatientById - throws error if patient is not assigned", async () => {
      Doctor.findOne.mockReturnValue(mockQuery({ _id: "doc-id-1" }));
      Appointment.exists.mockResolvedValue(false);

      await expect(
        doctorService.getMyPatientById("user-1", "patient-1")
      ).rejects.toMatchObject({
        statusCode: 403,
        code: "PATIENT_NOT_ASSIGNED"
      });
    });

    it("getMyPatientById - returns patient details if assigned", async () => {
      Doctor.findOne.mockReturnValue(mockQuery({ _id: "doc-id-1" }));
      Appointment.exists.mockResolvedValue(true);

      const patientMock = {
        _id: "patient-1",
        userId: { _id: "user-p1", name: "John Doe", email: "john@example.com", phone: "123456" },
        dateOfBirth: new Date(),
        gender: "male",
        bloodGroup: "O+",
        address: {},
        emergencyContact: {},
        medicalHistory: ["flu"],
        allergies: [],
        currentMedications: [],
        insuranceDetails: {}
      };

      Patient.findById.mockReturnValue(mockQuery(patientMock));

      const result = await doctorService.getMyPatientById("user-1", "patient-1");
      expect(result.patient.name).toBe("John Doe");
      expect(result.patient.medicalHistory).toContain("flu");
    });

    it("createPrescription - throws error if appointment not confirmed or completed", async () => {
      Doctor.findOne.mockReturnValue(mockQuery({ _id: "doc-id-1", userId: { name: "Dr. Smith" } }));
      Appointment.findById.mockResolvedValue({
        _id: "app-1",
        doctorId: "doc-id-1",
        status: "pending"
      });

      await expect(
        doctorService.createPrescription("user-1", {
          appointmentId: "app-1",
          diagnosis: "Fever",
          medicines: []
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        code: "INVALID_APPOINTMENT_STATUS"
      });
    });

    it("createPrescription - successfully creates prescription and notifies patient", async () => {
      Doctor.findOne.mockReturnValue(mockQuery({ _id: "doc-id-1", userId: { name: "Dr. Smith" } }));

      const appMock = {
        _id: "app-1",
        doctorId: "doc-id-1",
        status: "confirmed",
        patientId: { userId: "user-p1" },
        populate: vi.fn().mockResolvedValue(this)
      };
      Appointment.findById.mockResolvedValue(appMock);
      Prescription.findOne.mockResolvedValue(null);

      const presMock = {
        _id: "pres-1",
        appointmentId: "app-1",
        diagnosis: "Fever",
        medicines: []
      };
      Prescription.create.mockResolvedValue(presMock);

      const result = await doctorService.createPrescription("user-1", {
        appointmentId: "app-1",
        diagnosis: "Fever",
        medicines: []
      });

      expect(result.prescription).toBeDefined();
      expect(result.prescription.diagnosis).toBe("Fever");
      expect(Notification.create).toHaveBeenCalledOnce();
    });

    it("getDoctorAvailabilityForDate - returns free slots on open date", async () => {
      const doctor = {
        _id: "doc-1",
        availability: {
          weeklySchedule: [
            {
              dayOfWeek: 1, // Monday
              isAvailable: true,
              slots: [{ startTime: "09:00", endTime: "12:00" }]
            }
          ],
          exceptions: []
        }
      };
      Doctor.findById.mockReturnValue(mockQuery(doctor));
      Appointment.find.mockResolvedValue([]);

      const result = await doctorService.getDoctorAvailabilityForDate("doc-1", "2026-06-08"); // Monday
      expect(result.slots).toHaveLength(1);
      expect(result.slots[0].available).toBe(true);
    });

    it("getDoctorAvailabilityForDate - marks overlapping slot as booked", async () => {
      const doctor = {
        _id: "doc-1",
        availability: {
          weeklySchedule: [
            {
              dayOfWeek: 1,
              isAvailable: true,
              slots: [{ startTime: "09:00", endTime: "12:00" }]
            }
          ],
          exceptions: []
        }
      };
      Doctor.findById.mockReturnValue(mockQuery(doctor));
      Appointment.find.mockResolvedValue([
        { startTime: "09:30", endTime: "10:30" }
      ]);

      const result = await doctorService.getDoctorAvailabilityForDate("doc-1", "2026-06-08");
      expect(result.slots).toHaveLength(1);
      expect(result.slots[0].available).toBe(false);
    });

    it("getDoctorAvailabilityForDate - returns empty slots if exception blocks the day", async () => {
      const doctor = {
        _id: "doc-1",
        availability: {
          weeklySchedule: [
            {
              dayOfWeek: 1,
              isAvailable: true,
              slots: [{ startTime: "09:00", endTime: "12:00" }]
            }
          ],
          exceptions: [
            { date: new Date("2026-06-08T00:00:00.000Z"), isAvailable: false, reason: "holiday" }
          ]
        }
      };
      Doctor.findById.mockReturnValue(mockQuery(doctor));

      const result = await doctorService.getDoctorAvailabilityForDate("doc-1", "2026-06-08");
      expect(result.slots).toHaveLength(0);
    });
  });

  describe("appointmentService", () => {
    it("completeAppointment - throws error if wrong doctor completes it", async () => {
      Doctor.findOne.mockReturnValue(mockQuery({ _id: "doc-id-1" }));
      Appointment.findById.mockReturnValue(mockQuery({
        _id: "app-1",
        doctorId: { _id: "doc-id-2" },
        status: "confirmed"
      }));

      await expect(
        appointmentService.completeAppointment("app-1", { _id: "user-1", role: "doctor" })
      ).rejects.toMatchObject({
        statusCode: 403,
        code: "FORBIDDEN"
      });
    });

    it("completeAppointment - successfully completes confirmed appointment", async () => {
      Doctor.findOne.mockReturnValue(mockQuery({ _id: "doc-id-1" }));

      const saveSpy = vi.fn().mockResolvedValue(this);
      const appMock = {
        _id: "app-1",
        doctorId: { _id: "doc-id-1" },
        status: "confirmed",
        patientId: { userId: "user-p1" },
        populate: vi.fn().mockResolvedValue(this),
        save: saveSpy
      };
      Appointment.findById.mockReturnValue(mockQuery(appMock));

      const result = await appointmentService.completeAppointment("app-1", {
        _id: "user-1",
        role: "doctor",
        name: "Dr. Smith"
      });

      expect(result.appointment.status).toBe("completed");
      expect(saveSpy).toHaveBeenCalledOnce();
      expect(Notification.create).toHaveBeenCalledOnce();
    });
  });

  describe("analyticsService", () => {
    it("getDoctorOverview - returns correct statistics", async () => {
      Doctor.findOne.mockReturnValue(mockQuery({ _id: "doc-id-1" }));
      Appointment.countDocuments.mockResolvedValueOnce(10); // total
      Appointment.countDocuments.mockResolvedValueOnce(3); // upcoming
      Appointment.countDocuments.mockResolvedValueOnce(7); // completed
      Appointment.distinct.mockResolvedValue(["patient-1", "patient-2"]);

      Appointment.find.mockReturnValue(mockQuery([]));

      const result = await analyticsService.getDoctorOverview("user-1");

      expect(result.overview.totalAppointments).toBe(10);
      expect(result.overview.upcomingAppointments).toBe(3);
      expect(result.overview.completedAppointments).toBe(7);
      expect(result.overview.uniquePatients).toBe(2);
      expect(result.overview.revenue).toBe(0); // revenue delayed
    });
  });
});
