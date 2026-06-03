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

vi.mock("../src/models/Refund.js", () => ({
  default: {
    create: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
    find: vi.fn(),
    countDocuments: vi.fn()
  }
}));

vi.mock("../src/models/Payment.js", () => ({
  default: {
    findById: vi.fn(),
    findOne: vi.fn()
  }
}));

vi.mock("../src/models/Appointment.js", () => ({
  default: {
    findById: vi.fn(),
    find: vi.fn()
  }
}));

vi.mock("../src/models/Patient.js", () => ({
  default: {
    findOne: vi.fn()
  }
}));

vi.mock("../src/models/Notification.js", () => ({
  default: {
    create: vi.fn()
  }
}));

vi.mock("../src/services/auditService.js", () => ({
  AUDIT_ACTIONS: {
    REFUND_REQUESTED: "REFUND_REQUESTED",
    REFUND_APPROVED: "REFUND_APPROVED",
    REFUND_REJECTED: "REFUND_REJECTED",
    REFUND_COMPLETED: "REFUND_COMPLETED"
  },
  createAuditLog: vi.fn()
}));

const mockRazorpayRefund = vi.fn();
class MockRazorpay {
  constructor() {
    this.payments = {
      refund: mockRazorpayRefund
    };
  }
}

vi.mock("razorpay", () => {
  return {
    default: MockRazorpay
  };
});

const Refund = (await import("../src/models/Refund.js")).default;
const Payment = (await import("../src/models/Payment.js")).default;
const Appointment = (await import("../src/models/Appointment.js")).default;
const Patient = (await import("../src/models/Patient.js")).default;
const Notification = (await import("../src/models/Notification.js")).default;
const refundService = await import("../src/services/refundService.js");

const mockQuery = (resolvedValue) => {
  const query = {};
  query.populate = vi.fn().mockReturnValue(query);
  query.sort = vi.fn().mockReturnValue(query);
  query.skip = vi.fn().mockReturnValue(query);
  query.limit = vi.fn().mockReturnValue(query);
  query.then = vi.fn((resolve) => resolve(resolvedValue));
  return query;
};

describe("Refund System Module - Services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RAZORPAY_KEY_ID = "rzp_test_keyid123";
    process.env.RAZORPAY_KEY_SECRET = "rzp_test_secret123";
  });

  describe("requestRefund - Business Rules & Eligibility", () => {
    it("should successfully request full 100% refund if cancelled more than 24 hours in advance", async () => {
      Patient.findOne.mockResolvedValue({ _id: "patient-123" });
      
      const paymentMock = {
        _id: "payment-123",
        amount: 800,
        paymentStatus: "success",
        save: vi.fn()
      };

      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + 2); // 48 hours in future

      const cancellationDate = new Date(); // now

      const appointmentMock = {
        _id: "appt-123",
        patientId: "patient-123",
        status: "cancelled",
        appointmentDate: scheduledDate,
        cancellation: {
          cancelledAt: cancellationDate,
          reason: "Change of plans"
        },
        paymentId: paymentMock,
        save: vi.fn()
      };
      
      Appointment.findById.mockReturnValue(mockQuery(appointmentMock));
      Refund.findOne.mockResolvedValue(null);

      Refund.create.mockResolvedValue({
        _id: "refund-123",
        appointmentId: "appt-123",
        refundPercentage: 100,
        refundAmount: 800,
        refundStatus: "requested"
      });

      const result = await refundService.requestRefund("user-patient-123", "appt-123", "Need balance return");

      expect(result.refundPercentage).toBe(100);
      expect(result.refundAmount).toBe(800);
      expect(Refund.create).toHaveBeenCalledWith(expect.objectContaining({
        refundPercentage: 100,
        refundAmount: 800
      }));
      expect(appointmentMock.status).toBe("refund_requested");
      expect(appointmentMock.save).toHaveBeenCalledOnce();
    });

    it("should successfully request partial 50% refund if cancelled less than 24 hours in advance", async () => {
      Patient.findOne.mockResolvedValue({ _id: "patient-123" });

      const paymentMock = {
        _id: "payment-123",
        amount: 1000,
        paymentStatus: "success",
        save: vi.fn()
      };

      const scheduledDate = new Date();
      scheduledDate.setHours(scheduledDate.getHours() + 10); // 10 hours in future

      const appointmentMock = {
        _id: "appt-123",
        patientId: "patient-123",
        status: "cancelled",
        appointmentDate: scheduledDate,
        cancellation: {
          cancelledAt: new Date()
        },
        paymentId: paymentMock,
        save: vi.fn()
      };

      Appointment.findById.mockReturnValue(mockQuery(appointmentMock));
      Refund.findOne.mockResolvedValue(null);

      Refund.create.mockResolvedValue({
        _id: "refund-123",
        refundPercentage: 50,
        refundAmount: 500
      });

      const result = await refundService.requestRefund("user-patient-123", "appt-123", "Reason");

      expect(result.refundPercentage).toBe(50);
      expect(result.refundAmount).toBe(500);
    });

    it("should reject refund request with error if cancellation date is past scheduled time", async () => {
      Patient.findOne.mockResolvedValue({ _id: "patient-123" });

      const paymentMock = {
        _id: "payment-123",
        amount: 1000,
        paymentStatus: "success"
      };

      const scheduledDate = new Date();
      scheduledDate.setHours(scheduledDate.getHours() - 2); // 2 hours in PAST

      const appointmentMock = {
        _id: "appt-123",
        patientId: "patient-123",
        status: "cancelled",
        appointmentDate: scheduledDate,
        cancellation: {
          cancelledAt: new Date()
        },
        paymentId: paymentMock
      };

      Appointment.findById.mockReturnValue(mockQuery(appointmentMock));
      Refund.findOne.mockResolvedValue(null);

      await expect(refundService.requestRefund("user-patient-123", "appt-123", "Too late"))
        .rejects.toThrow("Appointments cancelled after their scheduled start time are not eligible for a refund");
    });

    it("should block request if appointment is completed (No refund eligibility)", async () => {
      Patient.findOne.mockResolvedValue({ _id: "patient-123" });

      const appointmentMock = {
        _id: "appt-123",
        patientId: "patient-123",
        status: "completed"
      };

      Appointment.findById.mockReturnValue(mockQuery(appointmentMock));

      await expect(refundService.requestRefund("user-patient-123", "appt-123", "Reason"))
        .rejects.toThrow("Completed appointments are not eligible for a refund");
    });

    it("should block request if accessed by unauthorized patient", async () => {
      Patient.findOne.mockResolvedValue({ _id: "patient-hacker" });

      const appointmentMock = {
        _id: "appt-123",
        patientId: "patient-victim",
        status: "cancelled"
      };

      Appointment.findById.mockReturnValue(mockQuery(appointmentMock));

      await expect(refundService.requestRefund("user-hacker", "appt-123", "Reason"))
        .rejects.toThrow("You do not have permission to request a refund for this appointment");
    });

    it("should reject duplicate refund request", async () => {
      Patient.findOne.mockResolvedValue({ _id: "patient-123" });

      const paymentMock = {
        _id: "payment-123",
        amount: 1000,
        paymentStatus: "success"
      };

      const appointmentMock = {
        _id: "appt-123",
        patientId: "patient-123",
        status: "cancelled",
        paymentId: paymentMock
      };

      Appointment.findById.mockReturnValue(mockQuery(appointmentMock));
      Refund.findOne.mockResolvedValue({ _id: "refund-active" });

      await expect(refundService.requestRefund("user-patient-123", "appt-123", "Reason"))
        .rejects.toThrow("A refund has already been requested for this appointment");
    });
  });

  describe("processRefund - Verification & Duplicates Prevention", () => {
    it("should process approved refund through Razorpay and update statuses", async () => {
      const paymentMock = {
        _id: "payment-123",
        razorpayPaymentId: "pay_rzp_123",
        refundStatus: "approved",
        save: vi.fn()
      };

      const appointmentMock = {
        _id: "appt-123",
        status: "refund_requested",
        save: vi.fn()
      };

      const refundMock = {
        _id: "refund-123",
        refundAmount: 500,
        refundStatus: "approved",
        paymentId: paymentMock,
        appointmentId: appointmentMock,
        save: vi.fn()
      };

      Refund.findById.mockReturnValue(mockQuery(refundMock));
      mockRazorpayRefund.mockResolvedValue({
        id: "rfnd_rzp_123",
        status: "processed"
      });

      const result = await refundService.processRefund("user-admin-123", "refund-123");

      expect(result.refundStatus).toBe("refunded");
      expect(result.gatewayRefundId).toBe("rfnd_rzp_123");
      expect(mockRazorpayRefund).toHaveBeenCalledOnce();
      expect(paymentMock.refundStatus).toBe("refunded");
      expect(paymentMock.paymentStatus).toBe("refunded");
      expect(appointmentMock.status).toBe("refunded");
    });

    it("should prevent duplicate refund processing after refund already completed/processing", async () => {
      const refundMock = {
        _id: "refund-123",
        refundStatus: "refunded"
      };

      Refund.findById.mockReturnValue(mockQuery(refundMock));

      await expect(refundService.processRefund("user-admin-123", "refund-123"))
        .rejects.toThrow("This refund has already been processed or is currently in progress");
    });
  });
});
