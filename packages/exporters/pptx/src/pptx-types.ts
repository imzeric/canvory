import PptxGenJSImport from "pptxgenjs";

/** NodeNext 下 pptxgenjs 类型与 default 构造不完全对齐，统一收口 */
export const PptxGenJS = PptxGenJSImport as unknown as {
  new (): PptxApp;
  prototype: PptxApp;
};

export type PptxApp = {
  ShapeType: {
    ellipse: unknown;
    line: unknown;
    roundRect: unknown;
  };
  defineLayout: (layout: { name: string; width: number; height: number }) => void;
  layout: string;
  addSlide: () => PptxSlide;
  write: (opts: { outputType: "nodebuffer" | "uint8array" }) => Promise<Buffer | Uint8Array>;
};

export type PptxSlide = {
  addText: (...args: unknown[]) => void;
  addShape: (...args: unknown[]) => void;
  addImage: (...args: unknown[]) => void;
  addNotes: (notes: string) => void;
};
