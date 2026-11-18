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
}) {
  return (
    <section
      data-testid="assistant-panel"
      style={{ background: "#181b1f", color: "#e7ecec", fontSize: 14, fontFamily: panelFont, padding: 12 }}
    >
      <p>PPT</p>
      <p>这是可拖动、可关闭的插件浮窗。</p>
      <p data-testid="model-state">尚未配置模型，不能生成画板。</p>
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
