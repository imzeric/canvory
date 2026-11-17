import { describe, expect, it } from "vitest";
import { UnauthorizedException } from "@nestjs/common";
import { memory } from "../db/pool.js";
import { AuthGuard, DEV_AUTH_USER } from "./auth.guard.js";

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
    expect(req.user).toEqual(DEV_AUTH_USER);
  });

  it("keeps the same user id after the in-memory user map is cleared", () => {
    process.env.AUTH_TOKEN = "test-token";
    memory.users.clear();
    const guard = new AuthGuard();
    const first: { headers: Record<string, string>; user?: { id: string } } = {
      headers: { authorization: "Bearer test-token" },
    };
    guard.canActivate({
      switchToHttp: () => ({ getRequest: () => first }),
    } as never);
    memory.users.clear();
    const second: { headers: Record<string, string>; user?: { id: string } } = {
      headers: { authorization: "Bearer test-token" },
    };
    guard.canActivate({
      switchToHttp: () => ({ getRequest: () => second }),
    } as never);
    expect(first.user?.id).toBe(DEV_AUTH_USER.id);
    expect(second.user?.id).toBe(DEV_AUTH_USER.id);
  });
});
