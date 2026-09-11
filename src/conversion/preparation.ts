import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { prepareImageAssets } from "./assets.js";
import {
  readHistory,
  toHistoryPath,
  toPreviousHistoryPath,
  toVersionHistoryPath,
} from "./history.js";
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
  historyLimit = 10,
): Promise<void> {
  for (const file of files) {
    file.historyPath = toHistoryPath(file.relativePath);
    file.previousHistoryPath = toPreviousHistoryPath(file.relativePath);
    const old = previous?.files[file.relativePath];
    file.latestSource = await readHistory(output, old?.history);
    file.previousSource = await readHistory(output, old?.previousHistory);
    const versions = [];
    for (const version of old?.historyVersions ?? []) {
      const source = await readHistory(output, version.path);
      if (source !== undefined) versions.push({ ...version, source });
    }
    if (versions.length === 0) {
      if (file.previousSource !== undefined) {
        const sourceHash = contentHash(file.previousSource);
        versions.push({
          sourceHash,
          path: toVersionHistoryPath(file.relativePath, sourceHash),
          source: file.previousSource,
        });
      }
      if (file.latestSource !== undefined) {
        const sourceHash = contentHash(file.latestSource);
        if (versions.at(-1)?.sourceHash !== sourceHash)
          versions.push({
            sourceHash,
            path: toVersionHistoryPath(file.relativePath, sourceHash),
            modifiedAt: old?.modifiedAt,
            source: file.latestSource,
          });
      }
    }
    if (versions.at(-1)?.sourceHash !== file.sourceHash) {
      versions.push({
        sourceHash: file.sourceHash!,
        path: toVersionHistoryPath(file.relativePath, file.sourceHash!),
        modifiedAt: file.modifiedAt,
        source: file.source,
      });
    }
    file.historyVersions = versions.slice(-(historyLimit + 1));
    const comparisons = file.historyVersions.slice(0, -1);
    file.previousSource = comparisons.at(-1)?.source;
    if (old && comparisons.length === 0 && !old.previousHistory) {
      file.preservedDiffContent = await readGeneratedDiff(
        join(output, ...file.outputPath.split("/")),
      );
    }
  }
}

async function readGeneratedDiff(path: string): Promise<string | undefined> {
  try {
    const html = await readFile(path, "utf8");
    const startMarker =
      '<main class="document-diff-content" aria-label="文書の差分" hidden>\n';
    const start = html.indexOf(startMarker);
    if (start === -1) return undefined;
    const contentStart = start + startMarker.length;
    const end = html.indexOf("</main>\n</div>", contentStart);
    if (end === -1) return undefined;
    const content = html.slice(contentStart, end);
    return content.startsWith('<div class="document-diff-comparison">') ||
      content.startsWith('<div class="document-diff-version-picker">') ||
      content.startsWith("<div data-document-diff-active>")
      ? content
      : undefined;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
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
