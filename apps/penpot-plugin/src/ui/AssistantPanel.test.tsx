import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { AssistantPanel } from "./AssistantPanel.js";

function Harness() {
  const [mounts, setMounts] = useState<{ boardId: string; name: string; locked: boolean }[]>([]);
  const [selectionIds, setSelectionIds] = useState(["board-1"]);
  return (
    <>
      <button type="button" onClick={() => setSelectionIds(["board-2"])}>
        改选区
      </button>
      <AssistantPanel
        selectionIds={selectionIds}
        mounts={mounts}
        persistence="file"
        onMount={(id) =>
          setMounts((current) =>
            current.some((mount) => mount.boardId === id)
              ? current
              : [...current, { boardId: id, name: id, locked: false }],
          )
        }
        onRemove={() => undefined}
        onLock={() => undefined}
      />
    </>
  );
}

afterEach(() => cleanup());

describe("AssistantPanel", () => {
  it("does not change mounts when only the selection changes", async () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "挂载当前选区" }));
    fireEvent.click(screen.getByRole("button", { name: "改选区" }));
    expect(screen.getByTestId("mount-list").textContent).toContain("board-1");
    expect(screen.getByTestId("mount-list").textContent).not.toContain("board-2");
    expect(screen.getByTestId("selection-list").textContent).toBe("board-2");
  });

  it("uses the approved panel color and keeps generation disabled", () => {
    render(
      <AssistantPanel
        selectionIds={[]}
        mounts={[]}
        persistence="unavailable"
        onMount={() => undefined}
        onRemove={() => undefined}
        onLock={() => undefined}
      />,
    );
    const panel = screen.getByTestId("assistant-panel");
    expect(panel.getAttribute("style")).toContain("rgb(24, 27, 31)");
    expect(panel.getAttribute("style")).toContain("14px");
    expect((screen.getByRole("button", { name: "绘制" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId("model-state").textContent).toContain("尚未配置模型");
    expect(panel.textContent).toContain("可拖动、可关闭的插件浮窗");
  });
});
