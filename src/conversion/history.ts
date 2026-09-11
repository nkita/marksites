import { createHash } from "node:crypto";
import { readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { atomicWriteFile } from "../utils/files.js";

const HISTORY_DIRECTORY = ".marksites-history";
const HISTORY_PATH =
  /^\.marksites-history\/(?:[a-f0-9]{64}(?:\.previous)?\.md|[a-f0-9]{64}\/[a-f0-9]{64}\.md)$/;

function isHistoryPath(path: string | undefined): path is string {
  return path !== undefined && HISTORY_PATH.test(path);
}

export function toHistoryPath(documentPath: string): string {
  const id = createHash("sha256").update(documentPath).digest("hex");
  return `${HISTORY_DIRECTORY}/${id}.md`;
}

export function toPreviousHistoryPath(documentPath: string): string {
  return toHistoryPath(documentPath).replace(/\.md$/, ".previous.md");
}

export function toVersionHistoryPath(
  documentPath: string,
  sourceHash: string,
): string {
  const documentId = createHash("sha256").update(documentPath).digest("hex");
  return `${HISTORY_DIRECTORY}/${documentId}/${sourceHash.replace(/^sha256:/, "")}.md`;
}

export async function readHistory(
  outputRoot: string,
  historyPath: string | undefined,
): Promise<string | undefined> {
  if (!isHistoryPath(historyPath)) return undefined;
  try {
    return await readFile(join(outputRoot, ...historyPath.split("/")), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

export async function writeHistory(
  outputRoot: string,
  historyPath: string,
  markdown: string,
): Promise<void> {
  await atomicWriteFile(
    join(outputRoot, ...historyPath.split("/")),
    markdown,
  );
}

export async function removeHistory(
  outputRoot: string,
  historyPath: string | undefined,
): Promise<void> {
  if (!isHistoryPath(historyPath)) return;
  await rm(join(outputRoot, ...historyPath.split("/")), { force: true });
}
