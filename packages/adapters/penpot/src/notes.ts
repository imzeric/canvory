/** 演讲者备注约定：存储于画板 pluginData.canvoryNotes */
export const NOTES_PLUGIN_DATA_KEY = "canvoryNotes";

export function readNotes(pluginData: Record<string, string> | undefined): string | undefined {
  return pluginData?.[NOTES_PLUGIN_DATA_KEY];
}

export function writeNotes(
  pluginData: Record<string, string> | undefined,
  notes: string,
): Record<string, string> {
  return { ...(pluginData ?? {}), [NOTES_PLUGIN_DATA_KEY]: notes };
}
