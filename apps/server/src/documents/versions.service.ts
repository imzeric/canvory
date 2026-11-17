import { Injectable } from "@nestjs/common";
import { DocumentsService } from "./documents.service.js";
import type { AuthUser } from "../auth/auth.guard.js";

/** 版本保存 / 恢复语义封装（T033/T034） */
@Injectable()
export class VersionsService {
  constructor(private readonly docs: DocumentsService) {}

  save(documentId: string, user: AuthUser, content: unknown, label?: string) {
    return this.docs.putVersion(documentId, user, content, label);
  }

  list(documentId: string, user: AuthUser) {
    return this.docs.listVersions(documentId, user);
  }

  restore(documentId: string, version: number, user: AuthUser) {
    return this.docs.restore(documentId, version, user);
  }
}
