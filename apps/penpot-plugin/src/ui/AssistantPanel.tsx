import { useState } from "react";
import type { MountRecord } from "@canvory/core";

const panelFont = '"Source Han Sans SC", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif';

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
  onGenerate?: (demand: string) => void;
  onCite?: (text: string) => void;
}) {
  const [demand, setDemand] = useState("");
  const [material, setMaterial] = useState("");
  return (
    <section
      data-testid="assistant-panel"
      style={{ background: "#181b1f", color: "#e7ecec", fontSize: 14, fontFamily: panelFont, padding: 12 }}
    >
      <p>PPT</p>
      <p>这是可拖动、可关闭的插件浮窗。</p>
      <p data-testid="model-state">{props.notice || "尚未配置模型，不能生成画板。"}</p>
      <label>
        需求
        <textarea aria-label="需求" value={demand} onChange={(event) => setDemand(event.target.value)} />
      </label>
      <button type="button" onClick={() => props.onGenerate?.(demand)}>
        生成
      </button>
      <label>
        资料
        <textarea aria-label="资料" value={material} onChange={(event) => setMaterial(event.target.value)} />
      </label>
      <button type="button" onClick={() => props.onCite?.(material)}>
        引用资料
      </button>
      <ul data-testid="material-list">
        {(props.materialIds ?? []).map((id) => (
          <li key={id}>{id}</li>
        ))}
      </ul>
      <button type="button" disabled>
        绘制
      </button>
      <ul data-testid="mount-list">
        {props.mounts.map((mount) => (
          <li key={mount.boardId}>
            {mount.name}
            {mount.locked ? "（已锁定）" : ""}
            <button type="button" onClick={() => props.onRemove(mount.boardId)}>
              移除
            </button>
            <button type="button" onClick={() => props.onLock(mount.boardId, !mount.locked)}>
              {mount.locked ? "解锁" : "锁定"}
            </button>
          </li>
        ))}
      </ul>
      <p data-testid="selection-list">{props.selectionIds.join(",")}</p>
      {props.persistence === "unavailable" ? <p>当前不在 Penpot 文件中，挂载不会写入文件。</p> : null}
      {props.persistence === "file" && !props.canWrite ? <p>当前文件会话已结束，不能写入。</p> : null}
      <button
        type="button"
        disabled={!props.canWrite || props.selectionIds.length === 0}
        onClick={() => {
          for (const id of props.selectionIds) props.onMount(id);
        }}
      >
        挂载当前选区
      </button>
    </section>
  );
}
