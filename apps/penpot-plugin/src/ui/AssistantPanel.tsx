import { useState } from "react";
import type { MountRecord } from "@canvory/core";

const font = '"Source Han Sans SC", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif';

export function AssistantPanel(props: {
  selectionIds: string[];
  mounts: MountRecord[];
  onMount: (id: string) => void;
  onRemove: (id: string) => void;
  onLock: (id: string, locked: boolean) => void;
  persistence: "file" | "unavailable";
  canWrite: boolean;
  materialIds?: string[];
  notice?: string;
  busy?: boolean;
  onGenerate?: (demand: string) => void;
  onCancel?: () => void;
  onCite?: (text: string) => void;
  onFixture?: (kind: "create" | "edit") => void;
  canDraw?: boolean;
  onDraw?: () => void;
}) {
  const [demand, setDemand] = useState("");
  const [material, setMaterial] = useState("");
  const [demandError, setDemandError] = useState("");
  const [materialError, setMaterialError] = useState("");
  return (
    <section data-testid="assistant-panel" className="canvory-panel">
      <style>{`
        .canvory-panel {
          box-sizing: border-box;
          width: 100%;
          min-width: 0;
          overflow-x: hidden;
          background: #f4f7f6;
          color: #1c2422;
          font-family: ${font};
          font-size: 14px;
          line-height: 1.55;
          padding: 12px;
          caret-color: #0c6e64;
          scrollbar-color: #c5d4ce #f4f7f6;
        }
        .canvory-panel ::selection { background: #c9ebe4; color: #1c2422; }
        .canvory-panel * { box-sizing: border-box; }
        .canvory-panel :focus-visible { outline: 2px solid #0c6e64; outline-offset: 2px; }
        .canvory-panel p { margin: 0; }
        .canvory-title { margin: 0; font-size: 16px; font-weight: 650; line-height: 1.35; }
        .canvory-panel fieldset {
          border: 1px solid #d5ddd9;
          border-radius: 8px;
          margin: 16px 0 0;
          padding: 8px 10px 10px;
          min-width: 0;
        }
        .canvory-panel legend { padding: 0 4px; font-size: 12px; color: #3e524c; }
        .canvory-panel label { display: block; margin-top: 8px; }
        .canvory-panel textarea {
          display: block;
          width: 100%;
          margin-top: 4px;
          padding: 8px;
          border: 1px solid #d5ddd9;
          border-radius: 2px;
          background: #ffffff;
          color: #1c2422;
          font: inherit;
          line-height: 1.55;
          resize: vertical;
          caret-color: #0c6e64;
        }
        .canvory-demand { min-height: 7.5em; }
        .canvory-material { min-height: 4.5em; }
        .canvory-help, .canvory-error { font-size: 12px; margin-top: 4px; }
        .canvory-help { color: #3e524c; }
        .canvory-error { color: #8e2424; }
        .canvory-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
        .canvory-panel button {
          font: inherit;
          font-size: 14px;
          border-radius: 2px;
          border: 1px solid #c5d4ce;
          background: #ffffff;
          color: #1c2422;
          padding: 6px 10px;
        }
        .canvory-panel button:disabled { opacity: 0.45; cursor: not-allowed; }
        .canvory-panel button:hover:not(:disabled) { background: #e7f3f0; }
        .canvory-panel button.canvory-primary {
          background: #0c6e64;
          color: #f7fffc;
          border-color: #0c6e64;
        }
        .canvory-panel button.canvory-primary:hover:not(:disabled) { background: #0a5c54; color: #f7fffc; }
        .canvory-status {
          margin-top: 12px;
          padding: 8px;
          background: #ffffff;
          border: 1px solid #d5ddd9;
          border-radius: 2px;
          overflow-wrap: anywhere;
        }
        .canvory-mounts, .canvory-materials { list-style: none; margin: 8px 0 0; padding: 0; }
        .canvory-mounts li, .canvory-materials li {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          align-items: center;
          margin-top: 6px;
          overflow-wrap: anywhere;
        }
        .canvory-chip {
          background: #e5f4f1;
          color: #0d3d38;
          padding: 4px 8px;
          border-radius: 2px;
        }
        .canvory-panel details { margin-top: 16px; }
        .canvory-panel summary { cursor: pointer; color: #3e524c; }
      `}</style>
      <h1 className="canvory-title">PPT 浮窗</h1>
      <p className="canvory-help">可拖动，可关闭。生成只校验，绘制才写到画布。</p>
      <fieldset>
        <legend>需求</legend>
        <label>
          想做的演示
          <textarea
            className="canvory-demand"
            aria-label="需求"
            aria-invalid={demandError ? true : undefined}
            value={demand}
            placeholder="写下章节或要表达的内容。不限字数。"
            onChange={(event) => {
              setDemand(event.target.value);
              if (demandError) setDemandError("");
            }}
          />
        </label>
        <p className="canvory-help">未配置模型时不能生成。生成只校验操作，不会立刻画到画布。</p>
        {demandError ? <p className="canvory-error">{demandError}</p> : null}
        <div className="canvory-actions">
          <button
            className="canvory-primary"
            type="button"
            disabled={props.busy}
            onClick={() => {
              if (!demand.trim()) {
                setDemandError("先写需求，再生成。");
                return;
              }
              setDemandError("");
              props.onGenerate?.(demand);
            }}
          >
            {props.busy ? "正在校验…" : "生成"}
          </button>
          <button type="button" disabled={!props.canDraw || props.busy} onClick={() => props.onDraw?.()}>
            绘制
          </button>
          <button type="button" disabled={!props.busy} onClick={() => props.onCancel?.()}>
            停止
          </button>
        </div>
      </fieldset>
      <fieldset>
        <legend>资料</legend>
        <label>
          要引用的文字
          <textarea
            className="canvory-material"
            aria-label="资料"
            aria-invalid={materialError ? true : undefined}
            value={material}
            placeholder="只粘贴纯文本。不读取网址或本机文件。"
            onChange={(event) => {
              setMaterial(event.target.value);
              if (materialError) setMaterialError("");
            }}
          />
        </label>
        {materialError ? <p className="canvory-error">{materialError}</p> : null}
        <div className="canvory-actions">
          <button
            type="button"
            onClick={() => {
              if (!material.trim()) {
                setMaterialError("先贴上要引用的文字。");
                return;
              }
              setMaterialError("");
              props.onCite?.(material);
            }}
          >
            引用这段文字
          </button>
        </div>
        <ul className="canvory-materials" data-testid="material-list">
          {(props.materialIds ?? []).map((id) => (
            <li key={id}>{id}</li>
          ))}
        </ul>
      </fieldset>
      <fieldset>
        <legend>挂载页</legend>
        <p className="canvory-help">只改已挂载的画板。当前选区不会自动加入。</p>
        <ul className="canvory-mounts" data-testid="mount-list">
          {props.mounts.length === 0 ? <li>还没有挂载。</li> : null}
          {props.mounts.map((mount) => (
            <li key={mount.boardId}>
              <span className="canvory-chip">
                {mount.name}
                {mount.locked ? "，已锁定" : ""}
              </span>
              <button type="button" onClick={() => props.onRemove(mount.boardId)}>
                移除
              </button>
              <button type="button" onClick={() => props.onLock(mount.boardId, !mount.locked)}>
                {mount.locked ? "解锁" : "锁定"}
              </button>
            </li>
          ))}
        </ul>
        <p className="canvory-help" data-testid="selection-list">
          当前选区：{props.selectionIds.length ? props.selectionIds.join("，") : "无"}
        </p>
        {props.persistence === "unavailable" ? <p className="canvory-error">当前不在 Penpot 文件中，挂载不会写入文件。</p> : null}
        {props.persistence === "file" && !props.canWrite ? <p className="canvory-error">当前文件会话已结束，不能写入。</p> : null}
        <div className="canvory-actions">
          <button
            type="button"
            disabled={!props.canWrite || props.selectionIds.length === 0}
            onClick={() => {
              for (const id of props.selectionIds) props.onMount(id);
            }}
          >
            挂载当前选区
          </button>
        </div>
      </fieldset>
      <p className="canvory-status" data-testid="model-state" role="status">
        {props.notice || "尚未配置模型，不能生成画板。"}
      </p>
      <details>
        <summary>技术与测试</summary>
        <p className="canvory-help">测试夹具不是模型生成。绘制失败时，半成品留在画布上，用 Penpot 撤销该页。</p>
        <div className="canvory-actions">
          <button type="button" onClick={() => props.onFixture?.("create")}>
            运行测试夹具
          </button>
          <button type="button" onClick={() => props.onFixture?.("edit")}>
            测试夹具只改已挂载
          </button>
        </div>
      </details>
    </section>
  );
}
