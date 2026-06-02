import { describe, expect, it, vi } from "vitest";
import roleMiddleware from "../src/middlewares/roleMiddleware.js";

describe("roleMiddleware", () => {
  it("allows users with an allowed role", () => {
    const req = { user: { role: "admin" } };
    const next = vi.fn();

    roleMiddleware("admin")(req, {}, next);

    expect(next).toHaveBeenCalledWith();
  });

  it("blocks users without an allowed role", () => {
    const req = { user: { role: "patient" } };
    const next = vi.fn();

    roleMiddleware("admin")(req, {}, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        code: "FORBIDDEN"
      })
    );
  });
});
