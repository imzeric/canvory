import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { memory } from "../db/pool.js";

export type AuthUser = { id: string; email: string; displayName: string };

/**
 * 阶段一开发令牌对应的固定用户。
 * 必须跨进程稳定，否则 Postgres 中的 owner_id 无法被下一个 server 进程读到。
 */
export const DEV_AUTH_USER: AuthUser = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "dev@canvory.local",
  displayName: "Dev User",
};

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

    // Phase 1：单租户开发令牌映射到固定用户（跨进程同一 id）
    memory.users.set(DEV_AUTH_USER.id, DEV_AUTH_USER);
    req.user = DEV_AUTH_USER;
    return true;
  }
}
