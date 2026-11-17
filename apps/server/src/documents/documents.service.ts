import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { memory } from "../db/pool.js";
import type { AuthUser } from "../auth/auth.guard.js";
import {
  parseCanvoryDocument,
  type CanvoryDocument,
} from "@canvory/document-model";
import {
  ensureUser,
  insertDocument,
  insertVersion,
  loadDocumentFromPg,
  postgresEnabled,
} from "../db/postgres-documents.js";

type DocRecord = {
  ownerId: string;
  id: string;
  title: string;
  updatedAt: string;
  versions: Array<{
    id: string;
    versionNo: number;
    schemaVersion: string;
    cdm: unknown;
    createdAt: string;
    label?: string;
  }>;
};

function blankDocument(title: string): CanvoryDocument {
  const now = Date.now();
  const id = randomUUID();
  return {
    id,
    schemaVersion: "1.0.0",
    title,
    type: "presentation",
    settings: { width: 1920, height: 1080, unit: "px", background: "#FFFFFF" },
    scenes: [
      {
        id: randomUUID(),
        name: "Page 1",
        type: "slide",
        children: [],
      },
    ],
    assets: [],
    animations: [],
    interactions: [],
    metadata: { createdAt: now, updatedAt: now, version: 1 },
  };
}

@Injectable()
export class DocumentsService {
  /** memory 未命中时从 Postgres 灌入（T083） */
  private async ensureLoaded(id: string, user: AuthUser): Promise<DocRecord> {
    let doc = memory.documents.get(id) as DocRecord | undefined;
    if ((!doc || doc.ownerId !== user.id) && postgresEnabled()) {
      const pg = await loadDocumentFromPg(id, user.id);
      if (pg) {
        const record: DocRecord = {
          ownerId: user.id,
          id: pg.id,
          title: pg.title,
          updatedAt: pg.updatedAt,
          versions: pg.versions,
        };
        memory.documents.set(id, record);
        doc = record;
      }
    }
    if (!doc || doc.ownerId !== user.id) {
      throw new NotFoundException({
        error: { code: "NOT_FOUND", message: "文档不存在" },
      });
    }
    return doc;
  }

  create(user: AuthUser, title: string, cdmInput?: unknown) {
    const parsed = parseCanvoryDocument(cdmInput ?? blankDocument(title));
    const id = parsed.id || randomUUID();
    const versionId = randomUUID();
    const now = new Date().toISOString();
    const cdmDoc: CanvoryDocument = { ...parsed, id };
    memory.documents.set(id, {
      ownerId: user.id,
      id,
      title: parsed.title,
      updatedAt: now,
      versions: [
        {
          id: versionId,
          versionNo: 1,
          schemaVersion: parsed.schemaVersion,
          cdm: cdmDoc,
          createdAt: now,
        },
      ],
    });
    void ensureUser(user.id, user.email, user.displayName)
      .then(() => insertDocument(id, user.id, parsed.title, versionId, cdmDoc))
      .catch((e) => console.error("[pg] insertDocument", e));
    return {
      id,
      title: parsed.title,
      latestVersionId: versionId,
      updatedAt: now,
    };
  }

  async get(id: string, user: AuthUser) {
    const doc = await this.ensureLoaded(id, user);
    const latest = doc.versions[doc.versions.length - 1]!;
    return {
      id: doc.id,
      title: doc.title,
      latestVersionId: latest.id,
      updatedAt: doc.updatedAt,
      cdm: latest.cdm,
    };
  }

  async patch(id: string, user: AuthUser, cdm: unknown) {
    return this.putVersion(id, user, cdm);
  }

  async putVersion(id: string, user: AuthUser, cdm: unknown, label?: string) {
    const doc = await this.ensureLoaded(id, user);
    const parsed = parseCanvoryDocument(cdm);
    const versionNo = doc.versions.length + 1;
    const versionId = randomUUID();
    const now = new Date().toISOString();
    doc.versions.push({
      id: versionId,
      versionNo,
      schemaVersion: parsed.schemaVersion,
      cdm: parsed,
      createdAt: now,
      label,
    });
    doc.title = parsed.title;
    doc.updatedAt = now;
    void insertVersion(id, versionNo, parsed, user.id, label).catch((e) =>
      console.error("[pg] insertVersion", e),
    );
    return { id: versionId, version: versionNo };
  }

  async restore(id: string, version: number, user: AuthUser) {
    const doc = await this.ensureLoaded(id, user);
    const source = doc.versions.find((v) => v.versionNo === version);
    if (!source) {
      throw new NotFoundException({
        error: { code: "NOT_FOUND", message: "版本不存在" },
      });
    }
    // restore = 复制为新版本
    return this.putVersion(id, user, source.cdm);
  }

  async listVersions(id: string, user: AuthUser) {
    const doc = await this.ensureLoaded(id, user);
    return doc.versions.map((v) => ({
      id: v.id,
      version: v.versionNo,
      schemaVersion: v.schemaVersion,
      createdAt: v.createdAt,
      label: v.label,
    }));
  }

  async getCdmByVersion(
    documentId: string,
    user: AuthUser,
    version?: number,
  ): Promise<{ versionId: string; cdm: CanvoryDocument }> {
    const doc = await this.ensureLoaded(documentId, user);
    const v =
      version === undefined
        ? doc.versions[doc.versions.length - 1]
        : doc.versions.find((x) => x.versionNo === version);
    if (!v) {
      throw new NotFoundException({
        error: { code: "NOT_FOUND", message: "版本不存在" },
      });
    }
    return { versionId: v.id, cdm: v.cdm as CanvoryDocument };
  }
}
