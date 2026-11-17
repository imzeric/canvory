import type { CanvoryDocument, Scene } from "@canvory/document-model";

export interface ExportScope {
  sceneIds: string[] | "all";
  sort?: "position" | "name";
}

export function selectScenes(doc: CanvoryDocument, scope: ExportScope): Scene[] {
  const scenes =
    scope.sceneIds === "all"
      ? [...doc.scenes]
      : doc.scenes.filter((s) => scope.sceneIds.includes(s.id));

  if (scope.sort === "name") {
    scenes.sort((a, b) => a.name.localeCompare(b.name, "zh"));
  }
  return scenes;
}
