import { marked, type Token } from "marked";

export interface DiffPart {
  kind: "same" | "insert" | "delete";
  raw: string;
  tokenType: string;
}

interface MarkdownBlock {
  raw: string;
  key: string;
  tokenType: string;
}

function tokenRaw(token: Token): string {
  return "raw" in token && typeof token.raw === "string" ? token.raw : "";
}

function markdownBlocks(markdown: string): MarkdownBlock[] {
  return marked
    .lexer(markdown)
    .filter((token) => token.type !== "space")
    .map((token) => ({
      raw: tokenRaw(token),
      key: tokenRaw(token).replace(/[ \t]+$/gm, "").trim(),
      tokenType: token.type,
    }))
    .filter(({ raw }) => Boolean(raw));
}

export function diffBlocks(previous: string, current: string): DiffPart[] {
  const oldBlocks = markdownBlocks(previous);
  const newBlocks = markdownBlocks(current);
  if (oldBlocks.length * newBlocks.length > 2_000_000) {
    return [
      ...oldBlocks.map(({ raw, tokenType }): DiffPart => ({ kind: "delete", raw, tokenType })),
      ...newBlocks.map(({ raw, tokenType }): DiffPart => ({ kind: "insert", raw, tokenType })),
    ];
  }
  const lengths = Array.from(
    { length: oldBlocks.length + 1 },
    () => new Uint32Array(newBlocks.length + 1),
  );
  for (let oldIndex = oldBlocks.length - 1; oldIndex >= 0; oldIndex--) {
    for (let newIndex = newBlocks.length - 1; newIndex >= 0; newIndex--) {
      lengths[oldIndex]![newIndex] =
        oldBlocks[oldIndex]!.key === newBlocks[newIndex]!.key
          ? lengths[oldIndex + 1]![newIndex + 1]! + 1
          : Math.max(
              lengths[oldIndex + 1]![newIndex]!,
              lengths[oldIndex]![newIndex + 1]!,
            );
    }
  }
  const parts: DiffPart[] = [];
  let oldIndex = 0;
  let newIndex = 0;
  while (oldIndex < oldBlocks.length || newIndex < newBlocks.length) {
    if (
      oldIndex < oldBlocks.length &&
      newIndex < newBlocks.length &&
      oldBlocks[oldIndex]!.key === newBlocks[newIndex]!.key
    ) {
      parts.push({ kind: "same", raw: newBlocks[newIndex]!.raw, tokenType: newBlocks[newIndex]!.tokenType });
      oldIndex++;
      newIndex++;
    } else if (
      newIndex < newBlocks.length &&
      (oldIndex === oldBlocks.length ||
          lengths[oldIndex]![newIndex + 1]! >
          lengths[oldIndex + 1]![newIndex]!)
    ) {
      const block = newBlocks[newIndex++]!;
      parts.push({ kind: "insert", raw: block.raw, tokenType: block.tokenType });
    } else {
      const block = oldBlocks[oldIndex++]!;
      parts.push({ kind: "delete", raw: block.raw, tokenType: block.tokenType });
    }
  }
  return parts;
}
