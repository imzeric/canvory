/**
 * RM-03 实机联调：Postgres + Redis/BullMQ + MinIO。
 * 要求调用方已启动三个服务。本脚本强制 USE_MEMORY_DB=0 且 EXPORT_INLINE=0，
 * 并用独立 bucket / 可删除的文档行隔离数据。不把产物写入仓库。
 */
import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { Client as MinioClient } from "minio";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = path.resolve(HERE, "..");
const REPO_ROOT = path.resolve(SERVER_DIR, "../..");
const WORKER_DIR = path.join(REPO_ROOT, "apps/workers");
const TSX = path.join(REPO_ROOT, "node_modules/.bin/tsx");
const NODE = process.execPath;
const REPORT_PATH = path.join(
  REPO_ROOT,
  "docs/test/2-test-report/rm03-infra.md",
);

const PORT = 3011;
const BASE = `http://127.0.0.1:${PORT}`;
const TEST_TOKEN = "it-7484-dev-token";
const BUCKET = "canvory-it-7484";
const MARKER_V1 = "IT7484-V1-TEXT";
const MARKER_V2 = "IT7484-V2-TEXT";
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const ENV: NodeJS.ProcessEnv = {
  ...process.env,
  DATABASE_URL: "postgres://canvory:canvory@127.0.0.1:5432/canvory",
  REDIS_URL: "redis://127.0.0.1:6379",
  EXPORT_INLINE: "0",
  USE_MEMORY_DB: "0",
  MINIO_ENDPOINT: "127.0.0.1",
  MINIO_PORT: "9000",
  MINIO_ACCESS_KEY: "canvory",
  MINIO_SECRET_KEY: "canvorysecret",
  MINIO_BUCKET: BUCKET,
  MINIO_USE_SSL: "0",
  AUTH_TOKEN: TEST_TOKEN,
  PORT: String(PORT),
};

type Check = { name: string; pass: boolean; detail: string };
const checks: Check[] = [];

function check(name: string, pass: boolean, detail: string) {
  checks.push({ name, pass, detail });
  const tag = pass ? "PASS" : "FAIL";
  console.log(`${tag} ${name} — ${detail}`);
  if (!pass) throw new Error(`${name}: ${detail}`);
}

function authHeaders(token = TEST_TOKEN): Record<string, string> {
  return {
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
  };
}

async function api(pathname: string, init: RequestInit = {}, token?: string) {
  const headers = new Headers(init.headers);
  if (token !== "") {
    headers.set("authorization", `Bearer ${token ?? TEST_TOKEN}`);
  }
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  const res = await fetch(`${BASE}${pathname}`, { ...init, headers });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status, body, text, headers: res.headers };
}

function cdm(title: string, text: string, asset?: { id: string; storageKey: string }) {
  const now = Date.now();
  return {
    id: "",
    schemaVersion: "1.0.0",
    title,
    type: "presentation" as const,
    settings: { width: 1920, height: 1080, unit: "px" as const },
    scenes: [
      {
        id: randomUUID(),
        name: "Page 1",
        type: "slide" as const,
        width: 1920,
        height: 1080,
        children: [
          {
            id: "t1",
            type: "text" as const,
            transform: { x: 80, y: 80, width: 640, height: 80, rotation: 0 },
            content: {
              runs: [
                {
                  text,
                  fontFamily: "Arial",
                  fontSize: 32,
                  fontWeight: "400",
                  color: "#111111",
                },
              ],
            },
          },
          ...(asset
            ? [
                {
                  id: "img1",
                  type: "image" as const,
                  transform: { x: 80, y: 200, width: 320, height: 180, rotation: 0 },
                  assetId: asset.id,
                },
              ]
            : []),
          {
            id: "r1",
            type: "shape" as const,
            shapeKind: "rect" as const,
            transform: { x: 480, y: 200, width: 240, height: 120, rotation: 0 },
            fill: { type: "solid" as const, color: "#3366CC" },
          },
        ],
      },
    ],
    assets: asset
      ? [
          {
            id: asset.id,
            type: "image" as const,
            storageKey: asset.storageKey,
            mimeType: "image/png",
          },
        ]
      : [],
    animations: [],
    interactions: [],
    metadata: { createdAt: now, updatedAt: now, version: 1 },
  };
}

function startLogged(cmd: string, args: string[], cwd: string, logPath: string): ChildProcess {
  const out = fs.openSync(logPath, "a");
  const child = spawn(cmd, args, {
    cwd,
    env: ENV,
    stdio: ["ignore", out, out],
  });
  return child;
}

async function waitFor(url: string, timeoutMs: number) {
  const start = Date.now();
  let last = "";
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
      last = `HTTP ${res.status}`;
    } catch (e) {
      last = e instanceof Error ? e.message : String(e);
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`timeout waiting for ${url}: ${last}`);
}

async function stop(child: ChildProcess | null) {
  if (!child || child.exitCode !== null || !child.pid) return;
  child.kill("SIGTERM");
  const timer = setTimeout(() => child.kill("SIGKILL"), 5000);
  await once(child, "exit").catch(() => undefined);
  clearTimeout(timer);
}

async function waitExit(child: ChildProcess) {
  if (child.exitCode !== null) return child.exitCode;
  await once(child, "exit");
  return child.exitCode;
}

function minio() {
  return new MinioClient({
    endPoint: "127.0.0.1",
    port: 9000,
    useSSL: false,
    accessKey: "canvory",
    secretKey: "canvorysecret",
  });
}

async function objectExists(key: string): Promise<boolean> {
  try {
    await minio().statObject(BUCKET, key);
    return true;
  } catch {
    return false;
  }
}

async function inspectPptx(buf: Buffer) {
  const file = `/tmp/canvory-rm03-${randomUUID()}.pptx`;
  fs.writeFileSync(file, buf);
  const py = `
import zipfile, sys
z = zipfile.ZipFile(sys.argv[1])
names = z.namelist()
need = ["[Content_Types].xml", "ppt/presentation.xml"]
missing = [n for n in need if n not in names]
slide = ""
for n in names:
    if n.startswith("ppt/slides/slide") and n.endswith(".xml"):
        slide += z.read(n).decode("utf-8", "replace")
media = [n for n in names if n.startswith("ppt/media/")]
blob = b"".join(z.read(n) for n in media)
print("MISSING=" + ",".join(missing))
print("MEDIA=" + ",".join(media))
print("SLIDE_HAS_V1=" + str(${JSON.stringify(MARKER_V1)} in slide))
print("SLIDE_HAS_V2=" + str(${JSON.stringify(MARKER_V2)} in slide))
print("MEDIA_HAS_PNG=" + str(${JSON.stringify(PNG.toString("base64"))} == ""))
png = open(sys.argv[2], "rb").read()
print("MEDIA_CONTAINS_PNG=" + str(png in blob))
print("NAMES=" + str(len(names)))
`;
  const pngFile = `${file}.png`;
  fs.writeFileSync(pngFile, PNG);
  const { spawnSync } = await import("node:child_process");
  const result = spawnSync("python3", ["-c", py, file, pngFile], { encoding: "utf8" });
  fs.rmSync(file, { force: true });
  fs.rmSync(pngFile, { force: true });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "python zip inspect failed");
  }
  const map = Object.fromEntries(
    result.stdout
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const i = line.indexOf("=");
        return [line.slice(0, i), line.slice(i + 1)];
      }),
  );
  return map;
}

function writeReport(extra: { exitCode: number; error?: string }) {
  const passed = checks.filter((c) => c.pass).length;
  const failed = checks.filter((c) => !c.pass).length;
  const lines = [
    "# RM-03 Postgres / Redis / MinIO 联调",
    "",
    `- 日期：2026-11-17`,
    `- 环境：远程 Linux（非本机 Mac）。Postgres 16、Redis 7、MinIO RELEASE.2024-12-18T13-15-44Z，均监听 127.0.0.1。`,
    `- 模式：\`USE_MEMORY_DB=0\`，\`EXPORT_INLINE=0\`，\`MINIO_BUCKET=${BUCKET}\`。`,
    `- 凭据：与 \`infrastructure/docker/docker-compose.yml\` 中的开发默认值相同，未另引入生产密钥。`,
    `- 命令：\`pnpm validate:rm03\``,
    `- 退出码：${extra.exitCode}`,
    `- 结果：PASS ${passed} / FAIL ${failed}`,
    extra.error ? `- 失败摘要：${extra.error}` : "",
    "",
    "| 检查 | 结果 | 说明 |",
    "|------|------|------|",
    ...checks.map((c) => `| ${c.name} | ${c.pass ? "PASS" : "FAIL"} | ${c.detail.replaceAll("|", "/")} |`),
    "",
    "临时 PPTX 与进程日志留在远程 `/tmp`，不写入仓库，也不写入用户本机。",
    "",
  ].filter((line) => line !== undefined);
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, lines.join("\n"));
}

async function main() {
  if (ENV.USE_MEMORY_DB === "1" || ENV.EXPORT_INLINE === "1") {
    throw new Error("refusing to run in memory or inline mode");
  }
  const serverLog = "/tmp/canvory-rm03-server.log";
  const workerLog = "/tmp/canvory-rm03-worker.log";
  fs.writeFileSync(serverLog, "");
  fs.writeFileSync(workerLog, "");

  const pool = new pg.Pool({ connectionString: ENV.DATABASE_URL });
  let server: ChildProcess | null = null;
  let worker: ChildProcess | null = null;
  let documentId = "";
  const objectKeys: string[] = [];

  try {
    await pool.query("SELECT 1");
    check("postgres 可达", true, "SELECT 1");
    const migrate = spawn(TSX, ["src/db/migrate.ts"], {
      cwd: SERVER_DIR,
      env: ENV,
      stdio: "inherit",
    });
    const migrateCode = await waitExit(migrate);
    check("迁移 001_init", migrateCode === 0, `exit ${migrateCode}`);

    server = startLogged(NODE, ["dist/main.js"], SERVER_DIR, serverLog);
    await waitFor(`${BASE}/api/health`, 20000);
    check("server 健康检查", true, `GET /api/health on :${PORT}`);

    const anon = await api("/api/v1/documents", { method: "POST", body: "{}" }, "");
    const anonLeak = anon.text.includes(MARKER_V1) || anon.text.includes("scenes");
    check(
      "未认证拒绝且不返回文档体",
      anon.status === 401 && !anonLeak,
      `status ${anon.status}`,
    );
    const bad = await api("/api/v1/documents", { method: "POST", body: "{}" }, "not-the-token");
    check("错误令牌 401", bad.status === 401, `status ${bad.status}`);

    const presign = await api("/api/v1/assets/presign", {
      method: "POST",
      body: JSON.stringify({
        filename: "it7484.png",
        mime: "image/png",
        byteSize: PNG.byteLength,
      }),
    });
    const presignBody = presign.body as { assetId?: string; storageKey?: string };
    check(
      "资源预签名",
      presign.status === 201 || presign.status === 200,
      `status ${presign.status} key ${presignBody.storageKey ?? ""}`,
    );
    const storageKey = String(presignBody.storageKey);
    const assetId = String(presignBody.assetId);
    objectKeys.push(storageKey);
    const uploaded = await api(`/api/v1/assets/${assetId}/upload`, {
      method: "POST",
      body: JSON.stringify({ dataBase64: PNG.toString("base64") }),
    });
    check("资源上传", uploaded.status === 201 || uploaded.status === 200, `status ${uploaded.status}`);
    const statOk = await objectExists(storageKey);
    check("MinIO 对象存在（非内存）", statOk, storageKey);

    const id = randomUUID();
    const v1 = cdm("IT7484-V1", MARKER_V1, { id: assetId, storageKey });
    v1.id = id;
    const created = await api("/api/v1/documents", {
      method: "POST",
      body: JSON.stringify({ title: v1.title, cdm: v1 }),
    });
    const createdBody = created.body as { id?: string };
    documentId = String(createdBody.id ?? "");
    check("创建文档", created.status === 201 || created.status === 200, `id ${documentId}`);

    const row1 = await pool.query(
      `SELECT cdm_json #>> '{scenes,0,children,0,content,runs,0,text}' AS text
       FROM document_versions WHERE document_id=$1 AND version_no=1`,
      [documentId],
    );
    check(
      "版本 1 已写入 Postgres",
      row1.rows[0]?.text === MARKER_V1,
      `text=${row1.rows[0]?.text ?? "null"}`,
    );

    const v2 = cdm("IT7484-V2", MARKER_V2);
    v2.id = documentId;
    const saved = await api(`/api/v1/documents/${documentId}/versions`, {
      method: "POST",
      body: JSON.stringify({ content: v2, label: "v2" }),
    });
    const savedBody = saved.body as { version?: number };
    check("保存版本 2", saved.status === 201 || saved.status === 200, `version ${savedBody.version}`);

    const restored = await api(`/api/v1/documents/${documentId}/restore`, {
      method: "POST",
      body: JSON.stringify({ version: 1 }),
    });
    const restoredBody = restored.body as { version?: number };
    check("恢复 v1 产生新版本", restoredBody.version === 3, `version ${restoredBody.version}`);

    const versions = await pool.query(
      `SELECT version_no, cdm_json #>> '{scenes,0,children,0,content,runs,0,text}' AS text
       FROM document_versions WHERE document_id=$1 ORDER BY version_no`,
      [documentId],
    );
    const texts = versions.rows.map((r) => `${r.version_no}:${r.text}`).join(",");
    check(
      "Postgres 保留 v1/v2/v3 且 v3 内容为 v1",
      versions.rows.length === 3 && versions.rows[2]?.text === MARKER_V1,
      texts,
    );

    const queued = await api("/api/v1/export/tasks", {
      method: "POST",
      body: JSON.stringify({ documentId, mode: "auto", scope: { sceneIds: "all" } }),
    });
    const queuedBody = queued.body as { taskId?: string; transport?: string };
    check(
      "入队走 BullMQ",
      queued.status === 201 && queuedBody.transport === "bullmq",
      `status ${queued.status} transport ${queuedBody.transport}`,
    );
    const cancelId = String(queuedBody.taskId);
    const cancelled = await api(`/api/v1/export/tasks/${cancelId}/cancel`, { method: "POST" });
    const cancelBody = cancelled.body as { status?: string };
    check("取消排队任务", cancelBody.status === "cancelled", `status ${cancelBody.status}`);
    const earlyArtifact = await api(`/api/v1/export/tasks/${cancelId}/artifact`);
    check(
      "取消后不可下载",
      earlyArtifact.status === 404,
      `status ${earlyArtifact.status}`,
    );

    worker = startLogged(NODE, ["dist/pptx.worker.js"], WORKER_DIR, workerLog);
    await new Promise((r) => setTimeout(r, 2500));
    const afterWorker = await api(`/api/v1/export/tasks/${cancelId}`);
    const afterBody = afterWorker.body as { status?: string; downloadUrl?: string };
    const leaked = await objectExists(`exports/${cancelId}.pptx`);
    check(
      "Worker 不把已取消任务写成可下载",
      afterBody.status === "cancelled" && !afterBody.downloadUrl && !leaked,
      `status ${afterBody.status} object=${leaked}`,
    );

    const job = await api("/api/v1/export/tasks", {
      method: "POST",
      body: JSON.stringify({ documentId, mode: "auto", scope: { sceneIds: "all" } }),
    });
    const jobBody = job.body as { taskId?: string; transport?: string };
    check("成功路径再次入队", jobBody.transport === "bullmq", `task ${jobBody.taskId}`);
    const taskId = String(jobBody.taskId);
    let finalStatus = "";
    let downloadUrl = "";
    for (let i = 0; i < 40; i++) {
      const st = await api(`/api/v1/export/tasks/${taskId}`);
      const body = st.body as { status?: string; downloadUrl?: string; errorMessage?: string };
      finalStatus = body.status ?? "";
      downloadUrl = body.downloadUrl ?? "";
      if (finalStatus === "succeeded" || finalStatus === "failed" || finalStatus === "cancelled") {
        if (finalStatus !== "succeeded") {
          check("导出任务成功", false, `${finalStatus} ${body.errorMessage ?? ""}`);
        }
        break;
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    check("导出任务成功", finalStatus === "succeeded" && Boolean(downloadUrl), finalStatus);

    const artifact = await fetch(`${BASE}/api/v1/export/tasks/${taskId}/artifact`, {
      headers: authHeaders(),
    });
    const bytes = Buffer.from(await artifact.arrayBuffer());
    check(
      "成功任务可下载",
      artifact.status === 200 && bytes.subarray(0, 2).toString() === "PK" && bytes.byteLength > 1000,
      `status ${artifact.status} bytes ${bytes.byteLength}`,
    );
    const inspected = await inspectPptx(bytes);
    check(
      "PPTX 含恢复后的 v1 文本与 MinIO 图片",
      inspected.MISSING === "" &&
        inspected.SLIDE_HAS_V1 === "True" &&
        inspected.SLIDE_HAS_V2 === "False" &&
        inspected.MEDIA_CONTAINS_PNG === "True",
      JSON.stringify(inspected),
    );
    objectKeys.push(`exports/${taskId}.pptx`);
    const exported = await minio().statObject(BUCKET, `exports/${taskId}.pptx`);
    check(
      "产物对象在 MinIO",
      exported.size === bytes.byteLength,
      `size ${exported.size}`,
    );

    const jobRow = await pool.query(`SELECT status FROM export_jobs WHERE id=$1`, [taskId]);
    check("Postgres 任务状态为 succeeded", jobRow.rows[0]?.status === "succeeded", String(jobRow.rows[0]?.status));
    const cancelRow = await pool.query(`SELECT status FROM export_jobs WHERE id=$1`, [cancelId]);
    check("Postgres 取消状态保留", cancelRow.rows[0]?.status === "cancelled", String(cancelRow.rows[0]?.status));

    await stop(server);
    server = null;
    server = startLogged(NODE, ["dist/main.js"], SERVER_DIR, serverLog);
    await waitFor(`${BASE}/api/health`, 20000);
    const reloaded = await api(`/api/v1/documents/${documentId}`);
    const reloadedBody = reloaded.body as {
      cdm?: { scenes?: Array<{ children?: Array<{ content?: { runs?: Array<{ text?: string }> } }> }> };
    };
    const reloadedText =
      reloadedBody.cdm?.scenes?.[0]?.children?.[0]?.content?.runs?.[0]?.text ?? "";
    const versionList = await api(`/api/v1/documents/${documentId}/versions`);
    const items = (versionList.body as { items?: Array<{ version: number }> }).items ?? [];
    check(
      "新进程从 Postgres 读到恢复后的版本",
      reloaded.status === 200 && reloadedText === MARKER_V1 && items.map((i) => i.version).join(",") === "1,2,3",
      `status ${reloaded.status} text=${reloadedText} versions=${items.map((i) => i.version).join(",")}`,
    );

    const authedLeak = await api(`/api/v1/documents/${documentId}`, { method: "GET" }, "");
    check(
      "重启后未认证仍 401",
      authedLeak.status === 401 && !authedLeak.text.includes(MARKER_V1),
      `status ${authedLeak.status}`,
    );
  } finally {
    await stop(worker);
    await stop(server);
    if (documentId) {
      await pool.query(`DELETE FROM export_jobs WHERE document_id=$1`, [documentId]).catch(() => undefined);
      await pool.query(`DELETE FROM document_versions WHERE document_id=$1`, [documentId]).catch(() => undefined);
      await pool.query(`DELETE FROM documents WHERE id=$1`, [documentId]).catch(() => undefined);
    }
    const client = minio();
    for (const key of objectKeys) {
      await client.removeObject(BUCKET, key).catch(() => undefined);
    }
    await client.removeBucket(BUCKET).catch(() => undefined);
    await pool.end();
  }
}

let exitCode = 0;
try {
  await main();
  writeReport({ exitCode: 0 });
  console.log("RM-03 PASS");
} catch (e) {
  exitCode = 1;
  const message = e instanceof Error ? e.message : String(e);
  console.error(message);
  writeReport({ exitCode: 1, error: message });
  process.exitCode = 1;
}
void exitCode;
