import { beforeEach, describe, expect, it, vi } from "vitest";
import crypto from "crypto";

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

vi.mock("../src/models/Payment.js", () => ({
  default: {
    create: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
    find: vi.fn(),
    countDocuments: vi.fn()
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
    PAYMENT_CREATED: "PAYMENT_CREATED",
    PAYMENT_SUCCESS: "PAYMENT_SUCCESS",
    PAYMENT_FAILED: "PAYMENT_FAILED"
  },
  createAuditLog: vi.fn()
}));

const mockRazorpayCreate = vi.fn();

// Use an ES6 Class so it behaves as a valid constructor under ES Modules
class MockRazorpay {
  constructor() {
    this.orders = {
      create: mockRazorpayCreate
    };
  }
}

vi.mock("razorpay", () => {
  return {
    default: MockRazorpay
  };
});

const Payment = (await import("../src/models/Payment.js")).default;
const Appointment = (await import("../src/models/Appointment.js")).default;
const Patient = (await import("../src/models/Patient.js")).default;
const Notification = (await import("../src/models/Notification.js")).default;
const paymentService = await import("../src/services/paymentService.js");

const mockQuery = (resolvedValue) => {
  const query = {};
  query.populate = vi.fn().mockReturnValue(query);
  query.sort = vi.fn().mockReturnValue(query);
  query.skip = vi.fn().mockReturnValue(query);
  query.limit = vi.fn().mockReturnValue(query);
  query.then = vi.fn((resolve) => resolve(resolvedValue));
  return query;
};

describe("Payment Integration Module - Services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RAZORPAY_KEY_ID = "rzp_test_keyid123";
    process.env.RAZORPAY_KEY_SECRET = "rzp_test_secret123";
  });

  describe("createOrder", () => {
    it("should successfully create order and record payment", async () => {
      Patient.findOne.mockResolvedValue({ _id: "patient-123" });
      
      const appointmentMock = {
        _id: "appt-123",
        patientId: "patient-123",
        status: "pending_payment",
        doctorId: {
          _id: "doc-123",
          consultationFee: 500,
          userId: { _id: "user-doc-123" }
        }
      };
      Appointment.findById.mockReturnValue(mockQuery(appointmentMock));
      
      mockRazorpayCreate.mockResolvedValue({
        id: "order_rzp_123",
        amount: 50000,
        currency: "INR"
      });

      Payment.create.mockResolvedValue({
        _id: "payment-123",
        appointmentId: "appt-123",
        patientId: "patient-123",
        amount: 500,
        currency: "INR",
        razorpayOrderId: "order_rzp_123",
        paymentStatus: "pending"
      });

      const result = await paymentService.createOrder("user-patient-123", "appt-123");

      expect(result.orderId).toBe("order_rzp_123");
      expect(result.amount).toBe(50000);
      expect(result.paymentId).toBe("payment-123");
      expect(Payment.create).toHaveBeenCalledOnce();
      expect(mockRazorpayCreate).toHaveBeenCalledOnce();
    });

    it("should reject order creation if appointment is not in pending_payment status", async () => {
      Patient.findOne.mockResolvedValue({ _id: "patient-123" });
      const appointmentMock = {
        _id: "appt-123",
        patientId: "patient-123",
        status: "confirmed",
        doctorId: { _id: "doc-123", consultationFee: 500 }
      };
      Appointment.findById.mockReturnValue(mockQuery(appointmentMock));

      await expect(paymentService.createOrder("user-patient-123", "appt-123"))
        .rejects.toThrow("Payment is not required. Current status: confirmed");
    });
  });

  describe("verifyPayment", () => {
    // Dynamically generate a valid signature using the mocked secret
    const orderId = "order_rzp_123";
    const paymentId = "pay_rzp_123";
    const secret = "rzp_test_secret123";
    const body = orderId + "|" + paymentId;
    const dynamicSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    const validSignatureInput = {
      appointmentId: "appt-123",
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: dynamicSignature,
      paymentMethod: "card",
      gatewayResponse: { extra: "metadata" }
    };

    it("should successfully verify payment with valid signature", async () => {
      Patient.findOne.mockResolvedValue({ _id: "patient-123" });

      const saveMock = vi.fn();
      const paymentMock = {
        _id: "payment-123",
        razorpayOrderId: "order_rzp_123",
        paymentStatus: "pending",
        save: saveMock
      };
      Payment.findOne.mockReturnValue(mockQuery(paymentMock));

      const apptSaveMock = vi.fn();
      const appointmentMock = {
        _id: "appt-123",
        status: "pending_payment",
        save: apptSaveMock,
        doctorId: {
          userId: { _id: "user-doc-123" }
        }
      };
      Appointment.findById.mockReturnValue(mockQuery(appointmentMock));

      const result = await paymentService.verifyPayment("user-patient-123", validSignatureInput);

      expect(result.success).toBe(true);
      expect(result.paymentStatus).toBe("success");
      expect(result.appointmentStatus).toBe("confirmed");
      
      expect(paymentMock.paymentStatus).toBe("success");
      expect(paymentMock.paymentMethod).toBe("card");
      expect(paymentMock.gatewayResponse).toEqual({ extra: "metadata" });
      expect(saveMock).toHaveBeenCalledOnce();
      expect(apptSaveMock).toHaveBeenCalledTimes(2); // one for payment_completed, one for confirmed
      expect(Notification.create).toHaveBeenCalled();
    });

    it("should fail validation and mark payment as failed on invalid signature", async () => {
      Patient.findOne.mockResolvedValue({ _id: "patient-123" });

      const saveMock = vi.fn();
      const paymentMock = {
        _id: "payment-123",
        razorpayOrderId: "order_rzp_123",
        paymentStatus: "pending",
        save: saveMock
      };
      Payment.findOne.mockReturnValue(mockQuery(paymentMock));

      const appointmentMock = {
        _id: "appt-123",
        status: "pending_payment"
      };
      Appointment.findById.mockReturnValue(mockQuery(appointmentMock));

      const invalidInput = { ...validSignatureInput, razorpaySignature: "invalid_sig_here" };

      await expect(paymentService.verifyPayment("user-patient-123", invalidInput))
        .rejects.toThrow("Payment signature verification failed");

      expect(paymentMock.paymentStatus).toBe("failed");
      expect(saveMock).toHaveBeenCalledOnce();
    });

    it("should fail duplicate verification attempt", async () => {
      Patient.findOne.mockResolvedValue({ _id: "patient-123" });

      const paymentMock = {
        _id: "payment-123",
        razorpayOrderId: "order_rzp_123",
        paymentStatus: "success"
      };
      Payment.findOne.mockReturnValue(mockQuery(paymentMock));

      await expect(paymentService.verifyPayment("user-patient-123", validSignatureInput))
        .rejects.toThrow("This payment has already been verified and processed");
    });
  });

  describe("getPaymentById - Access Control Controls", () => {
    const paymentRecordMock = {
      _id: "payment-123",
      amount: 500,
      patientId: {
        _id: "patient-123",
        userId: { _id: "user-patient-123" }
      },
      appointmentId: {
        _id: "appt-123",
        doctorId: {
          _id: "doc-123",
          userId: { _id: "user-doc-123" }
        }
      }
    };

    it("should allow admin access to view any details", async () => {
      Payment.findById.mockReturnValue(mockQuery(paymentRecordMock));

      const result = await paymentService.getPaymentById("user-admin-999", "admin", "payment-123");
      expect(result._id).toBe("payment-123");
    });

    it("should allow matching patient access", async () => {
      Payment.findById.mockReturnValue(mockQuery(paymentRecordMock));

      const result = await paymentService.getPaymentById("user-patient-123", "patient", "payment-123");
      expect(result._id).toBe("payment-123");
    });

    it("should block non-matching patient access (Unauthorized Payment Access)", async () => {
      Payment.findById.mockReturnValue(mockQuery(paymentRecordMock));

      await expect(paymentService.getPaymentById("user-patient-hacker", "patient", "payment-123"))
        .rejects.toThrow("You do not have permission to view this payment");
    });

    it("should allow matching doctor access", async () => {
      Payment.findById.mockReturnValue(mockQuery(paymentRecordMock));

      const result = await paymentService.getPaymentById("user-doc-123", "doctor", "payment-123");
      expect(result._id).toBe("payment-123");
    });

    it("should block non-matching doctor access", async () => {
      Payment.findById.mockReturnValue(mockQuery(paymentRecordMock));

      await expect(paymentService.getPaymentById("user-doc-other", "doctor", "payment-123"))
        .rejects.toThrow("You do not have permission to view this payment");
    });
  });
});
