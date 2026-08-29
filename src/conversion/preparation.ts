import { readFile, stat } from "node:fs/promises";
import { prepareImageAssets } from "./assets.js";
import { readHistory, toHistoryPath } from "./history.js";
import { contentHash } from "./rendering.js";
import type { BuildManifest, MarkdownFile } from "./types.js";

export async function loadSources(files: MarkdownFile[]): Promise<void> {
  for (const file of files) {
    const [source, sourceStat] = await Promise.all([
      readFile(file.sourcePath, "utf8"),
      stat(file.sourcePath),
    ]);
    file.source = source;
    file.sourceHash = contentHash(file.source);
    file.modifiedAt = sourceStat.mtime.toISOString();
  }
}

export async function loadHistories(
  files: MarkdownFile[],
  previous: BuildManifest | undefined,
  output: string,
): Promise<void> {
  for (const file of files) {
    file.historyPath = toHistoryPath(file.relativePath);
    file.previousSource = await readHistory(
      output,
      previous?.files[file.relativePath]?.history,
    );
  }
}

export async function prepareAssets(
  files: MarkdownFile[],
  output: string,
): Promise<void> {
  for (const file of files) {
    const assets = await prepareImageAssets(
      file.source!,
      file.sourcePath,
      file.outputPath,
      output,
    );
    file.assetHash = assets.hash;
    file.assetOutputs = assets.outputs;
    file.rewriteImages = assets.rewrite;
  }
}
