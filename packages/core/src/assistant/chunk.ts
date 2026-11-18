export function chunkText(input: string, maxChars: number): { id: string; text: string }[] {
  if (!Number.isInteger(maxChars) || maxChars < 1) throw new Error("CHUNK_SIZE_INVALID");
  const pieces: string[] = [];
  for (const block of input.split(/\n\n+/)) {
    if (block.length === 0) continue;
    if (block.length <= maxChars) {
      pieces.push(block);
      continue;
    }
    for (const sentence of splitSentences(block)) {
      if (sentence.length <= maxChars) pieces.push(sentence);
      else {
        for (let index = 0; index < sentence.length; index += maxChars) {
          pieces.push(sentence.slice(index, index + maxChars));
        }
      }
    }
  }
  return pieces.filter((text) => text.length > 0).map((text, index) => ({ id: `chunk-${index + 1}`, text }));
}

function splitSentences(block: string): string[] {
  const parts = block.split("。");
  const sentences: string[] = [];
  for (let index = 0; index < parts.length; index += 1) {
    const piece = parts[index] ?? "";
    if (index < parts.length - 1) sentences.push(`${piece}。`);
    else if (piece.length > 0) sentences.push(piece);
  }
  return sentences.filter((sentence) => sentence.length > 0);
}
