import type { ExportMode } from "@canvory/core";
import {
  BROWSER_EXPORT_HINT_MS,
  PAGE_SOFT_LIMIT,
} from "@canvory/shared";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:3000/api/v1";
const AUTH_TOKEN = import.meta.env.VITE_AUTH_TOKEN ?? "dev-token-change-me";

export { BROWSER_EXPORT_HINT_MS, PAGE_SOFT_LIMIT };

export async function apiFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${AUTH_TOKEN}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  return res;
}

export async function createMaterial(body: { fileId: string; text: string }): Promise<{ id: string }> {
  const res = await apiFetch("/assistant/materials", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ id: string }>;
}

export async function requestGeneration(body: {
  fileId: string;
  demand: string;
  materialIds: string[];
}): Promise<{ drawn: false; message: string; ops: unknown[] }> {
  const res = await apiFetch("/assistant/generate", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (res.status === 503 || text.includes("MODEL_PROVIDER_UNCONFIGURED")) {
    return { drawn: false, ops: [], message: "尚未配置模型，不能生成画板。" };
  }
  if (!res.ok) {
    return { drawn: false, ops: [], message: "没有绘制画板。" };
  }
  const payload = JSON.parse(text) as { ops?: unknown[] };
  const ops = Array.isArray(payload.ops) ? payload.ops : [];
  return { drawn: false, ops, message: `已校验 ${ops.length} 条操作，没有绘制画板。` };
}

export async function saveDocument(body: { title?: string; cdm?: unknown }) {
  const res = await apiFetch("/documents", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ id: string; title: string; latestVersionId: string }>;
}

export async function createBackgroundTask(body: {
  documentId: string;
  mode: ExportMode;
  version?: number;
  scope?: { sceneIds: string[] | "all"; sort?: "position" | "name" };
}) {
  const res = await apiFetch("/export/tasks", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ taskId: string; status: string }>;
}

export async function pollTask(taskId: string) {
  const res = await apiFetch(`/export/tasks/${taskId}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{
    taskId: string;
    status: string;
    downloadUrl?: string;
    errorMessage?: string;
  }>;
}

export async function cancelTask(taskId: string) {
  const res = await apiFetch(`/export/tasks/${taskId}/cancel`, { method: "POST" });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ status: string }>;
}
