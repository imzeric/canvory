import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { memory, useMemoryDb } from "../db/pool.js";
import { randomUUID } from "node:crypto";

export type AuthUser = { id: string; email: string; displayName: string };

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: AuthUser;
    }>();
    const header = req.headers.authorization ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    const expected = process.env.AUTH_TOKEN ?? "dev-token-change-me";

    if (!token || token !== expected) {
      throw new UnauthorizedException({
        error: { code: "UNAUTHORIZED", message: "Missing or invalid Bearer token" },
      });
    }

    // Phase 1：单租户开发令牌映射到固定用户
    let user = [...memory.users.values()][0];
    if (!user) {
      const id = randomUUID();
      user = {
        id,
        email: "dev@canvory.local",
        displayName: "Dev User",
      };
      memory.users.set(id, user);
    }
    req.user = user;
    void useMemoryDb;
    return true;
  }
}
