import pg from "pg";

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL is required");
    }
    pool = new pg.Pool({ connectionString: url });
  }
  return pool;
}

/** 无 DB 时内存回退（本地 demo / 单测） */
export type MemoryStore = {
  users: Map<string, { id: string; email: string; displayName: string }>;
  documents: Map<
    string,
    {
      id: string;
      ownerId: string;
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
    }
  >;
  jobs: Map<string, Record<string, unknown>>;
  assets: Map<string, Record<string, unknown>>;
};

export const memory: MemoryStore = {
  users: new Map(),
  documents: new Map(),
  jobs: new Map(),
  assets: new Map(),
};

export function useMemoryDb(): boolean {
  return process.env.USE_MEMORY_DB === "1" || !process.env.DATABASE_URL;
}
