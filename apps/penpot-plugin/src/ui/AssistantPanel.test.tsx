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
        canWrite
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
    expect(screen.getByTestId("selection-list").textContent).toContain("board-2");
  });

  it("uses the approved panel color and keeps generation disabled", () => {
    render(
      <AssistantPanel
        selectionIds={[]}
        mounts={[]}
        persistence="unavailable"
        canWrite={false}
        onMount={() => undefined}
        onRemove={() => undefined}
        onLock={() => undefined}
      />,
    );
    const panel = screen.getByTestId("assistant-panel");
    expect(getComputedStyle(panel).backgroundColor).toBe("rgb(244, 247, 246)");
    expect(getComputedStyle(panel).color).toBe("rgb(28, 36, 34)");
    expect(getComputedStyle(panel).fontSize).toBe("14px");
    expect(getComputedStyle(screen.getByRole("button", { name: "生成" })).backgroundColor).toBe("rgb(12, 110, 100)");
    expect((screen.getByRole("button", { name: "绘制" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId("model-state").textContent).toContain("尚未配置模型");
    expect(panel.textContent).toContain("可拖动，可关闭");
  });

  it("asks the server to generate without claiming a board was drawn", () => {
    let demand = "";
    render(
      <AssistantPanel
        selectionIds={[]}
        mounts={[]}
        persistence="file"
        canWrite
        onMount={() => undefined}
        onRemove={() => undefined}
        onLock={() => undefined}
        onGenerate={(value) => {
          demand = value;
        }}
      />,
    );
    fireEvent.change(screen.getByRole("textbox", { name: "需求" }), { target: { value: "做一页封面" } });
    fireEvent.click(screen.getByRole("button", { name: "生成" }));
    expect(demand).toBe("做一页封面");
    expect((screen.getByRole("button", { name: "绘制" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId("assistant-panel").textContent).not.toContain("已绘制");
  });

  it("draws only after validated operations exist", () => {
    let drawn = 0;
    render(
      <AssistantPanel
        selectionIds={[]}
        mounts={[]}
        persistence="file"
        canWrite
        canDraw
        onMount={() => undefined}
        onRemove={() => undefined}
        onLock={() => undefined}
        onDraw={() => {
          drawn += 1;
        }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "绘制" }));
    expect(drawn).toBe(1);
    expect(screen.getByTestId("assistant-panel").textContent).toContain("不是模型生成");
  });
});
