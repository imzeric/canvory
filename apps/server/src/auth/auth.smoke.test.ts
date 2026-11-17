import { describe, expect, it } from "vitest";
import { AuthGuard } from "./auth.guard.js";
import { UnauthorizedException } from "@nestjs/common";

describe("FR-016 auth guard", () => {
  it("rejects missing token with 401", () => {
    const guard = new AuthGuard();
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: {} }),
      }),
    };
    expect(() => guard.canActivate(ctx as never)).toThrow(UnauthorizedException);
  });

  it("accepts Bearer AUTH_TOKEN", () => {
    process.env.AUTH_TOKEN = "test-token";
    const guard = new AuthGuard();
    const req: { headers: Record<string, string>; user?: unknown } = {
      headers: { authorization: "Bearer test-token" },
    };
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    };
    expect(guard.canActivate(ctx as never)).toBe(true);
    expect(req.user).toBeTruthy();
  });
});
