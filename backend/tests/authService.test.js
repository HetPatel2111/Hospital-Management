import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it, vi } from "vitest";

const session = {
  withTransaction: vi.fn(async (callback) => callback()),
  endSession: vi.fn()
};

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
    startSession: vi.fn(async () => session),
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

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(async () => "hashed-password"),
    compare: vi.fn(async (password) => password === "Password123")
  }
}));

vi.mock("../src/models/User.js", () => ({
  default: {
    findOne: vi.fn(),
    create: vi.fn(),
    findById: vi.fn()
  }
}));

vi.mock("../src/models/Doctor.js", () => ({
  default: {
    findOne: vi.fn(),
    create: vi.fn()
  }
}));

vi.mock("../src/models/RefreshToken.js", () => ({
  default: {
    create: vi.fn(),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    updateMany: vi.fn()
  }
}));

vi.mock("../src/services/auditService.js", () => ({
  AUDIT_ACTIONS: {
    REGISTER: "REGISTER",
    LOGIN: "LOGIN",
    LOGOUT: "LOGOUT",
    PASSWORD_RESET: "PASSWORD_RESET",
    DOCTOR_APPROVAL: "DOCTOR_APPROVAL",
    DOCTOR_REJECTION: "DOCTOR_REJECTION",
    ACCOUNT_SUSPENSION: "ACCOUNT_SUSPENSION"
  },
  createAuditLog: vi.fn()
}));

const User = (await import("../src/models/User.js")).default;
const Doctor = (await import("../src/models/Doctor.js")).default;
const RefreshToken = (await import("../src/models/RefreshToken.js")).default;
const authService = await import("../src/services/authService.js");

const createUser = (overrides = {}) => ({
  _id: {
    toString: () => "user-id-1"
  },
  name: "Active User",
  email: "active@example.com",
  phone: undefined,
  passwordHash: "hashed-password",
  role: "patient",
  status: "active",
  emailVerified: false,
  phoneVerified: false,
  lastLoginAt: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  save: vi.fn(async function save() {
    return this;
  }),
  ...overrides
});

describe("authService", () => {
  beforeEach(() => {
    process.env.JWT_ACCESS_SECRET = "access-secret";
    process.env.JWT_REFRESH_SECRET = "refresh-secret";
    vi.clearAllMocks();
    session.withTransaction.mockImplementation(async (callback) => callback());
    session.endSession.mockResolvedValue(undefined);
  });

  it("logs in active users and issues access and refresh tokens", async () => {
    const user = createUser();
    User.findOne.mockReturnValue({
      select: vi.fn(async () => user)
    });
    RefreshToken.create.mockResolvedValue([]);

    const result = await authService.login({
      email: "active@example.com",
      password: "Password123"
    });

    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(RefreshToken.create).toHaveBeenCalledOnce();
    expect(user.save).toHaveBeenCalledOnce();
  });

  it("blocks pending users from login", async () => {
    User.findOne.mockReturnValue({
      select: vi.fn(async () => createUser({ status: "pending" }))
    });

    await expect(
      authService.login({
        email: "pending@example.com",
        password: "Password123"
      })
    ).rejects.toMatchObject({
      statusCode: 403,
      code: "ACCOUNT_PENDING"
    });
  });

  it("rotates refresh tokens", async () => {
    const user = createUser();
    const oldRefreshToken = jwt.sign(
      {
        sub: "user-id-1",
        role: "patient",
        type: "refresh"
      },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );
    const storedToken = {
      userId: {
        toString: () => "user-id-1"
      },
      revokedAt: null,
      replacedByTokenHash: null,
      save: vi.fn(async function save() {
        return this;
      })
    };

    RefreshToken.findOne.mockResolvedValue(storedToken);
    RefreshToken.create.mockResolvedValue([]);
    User.findById.mockResolvedValue(user);

    const result = await authService.refreshToken({
      refreshToken: oldRefreshToken
    });

    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(storedToken.revokedAt).toBeInstanceOf(Date);
    expect(storedToken.replacedByTokenHash).toBeTruthy();
    expect(storedToken.save).toHaveBeenCalledOnce();
  });

  it("creates a pending doctor profile during doctor registration", async () => {
    const user = createUser({
      role: "doctor",
      status: "pending"
    });
    const doctor = {
      _id: "doctor-id-1",
      userId: user._id,
      specialization: "Cardiology",
      qualification: ["MBBS"],
      experienceYears: 5,
      registrationNumber: "REG-1001",
      consultationFee: 100000,
      availability: undefined,
      status: "pending",
      bio: undefined,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z")
    };

    User.findOne.mockResolvedValue(null);
    Doctor.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue([user]);
    Doctor.create.mockResolvedValue([doctor]);

    const result = await authService.register({
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

    expect(User.create).toHaveBeenCalledOnce();
    expect(Doctor.create).toHaveBeenCalledOnce();
    expect(result.user.status).toBe("pending");
    expect(result.doctor.status).toBe("pending");
    expect(result.accessToken).toBeUndefined();
  });
});
