import { mkdir, readFile, rename, stat } from "node:fs/promises";
import { basename, dirname, extname, join, resolve } from "node:path";
import { readAnnotations } from "../annotations/storage.js";
import { renderMarkdown } from "../markdown-to-html.js";
import { atomicWriteFile } from "../utils/files.js";
import {
  DEFAULT_OUTPUT_DIRECTORY,
  firstExistingPath,
  isMarkdown,
  pathExists,
} from "./paths.js";
import { prepareImageAssets } from "./assets.js";
import {
  readHistory,
  toHistoryPath,
  toPreviousHistoryPath,
  toVersionHistoryPath,
  writeHistory,
} from "./history.js";
import { contentHash } from "./rendering.js";
import type { ConversionOptions, HistoryVersion } from "./types.js";

export async function convertFile(
  input: string,
  outputArgument?: string,
  options: ConversionOptions = {},
): Promise<string> {
  if (!isMarkdown(input))
    throw new Error(`Input file must use .md or .markdown: ${input}`);
  const output = outputArgument
    ? resolve(outputArgument)
    : resolve(
        DEFAULT_OUTPUT_DIRECTORY,
        `${basename(input, extname(input))}.html`,
      );
  const outputName = basename(output, extname(output));
  const metadataPath = join(dirname(output), `.${outputName}.json`);
  const legacyPaths = [
    join(dirname(output), `.${outputName}.marksites.json`),
    join(dirname(output), `${outputName}.annotations.json`),
  ];
  if (!(await pathExists(metadataPath))) {
    const legacy = await firstExistingPath(legacyPaths);
    if (legacy) await rename(legacy, metadataPath);
  }
  const annotations = await readAnnotations(metadataPath, basename(input));
  const [markdown, sourceStat] = await Promise.all([
    readFile(input, "utf8"),
    stat(input),
  ]);
  await mkdir(dirname(output), { recursive: true });
  const assets = await prepareImageAssets(
    markdown,
    input,
    basename(output),
    dirname(output),
  );
  const outputRoot = dirname(output);
  const historyPath = toHistoryPath(basename(output));
  const previousHistoryPath = toPreviousHistoryPath(basename(output));
  const latestSource = await readHistory(outputRoot, historyPath);
  const storedPreviousSource = await readHistory(
    outputRoot,
    previousHistoryPath,
  );
  const sourceChanged = latestSource !== undefined && latestSource !== markdown;
  const previousSource = sourceChanged ? latestSource : storedPreviousSource;
  const currentHash = contentHash(markdown);
  const versionPath = toVersionHistoryPath(basename(output), currentHash);
  const versionIndexPath = join(
    outputRoot,
    ...dirname(versionPath).split("/"),
    "index.json",
  );
  let versions: HistoryVersion[] = [];
  try {
    const stored = JSON.parse(await readFile(versionIndexPath, "utf8")) as {
      versions?: HistoryVersion[];
    };
    for (const version of stored.versions ?? []) {
      const source = await readHistory(outputRoot, version.path);
      if (source !== undefined) versions.push({ ...version, source });
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT" &&
        !(error instanceof SyntaxError)) throw error;
  }
  if (versions.length === 0 && previousSource !== undefined) {
    const sourceHash = contentHash(previousSource);
    versions.push({
      sourceHash,
      path: toVersionHistoryPath(basename(output), sourceHash),
      source: previousSource,
    });
  }
  if (versions.at(-1)?.sourceHash !== currentHash)
    versions.push({
      sourceHash: currentHash,
      path: versionPath,
      modifiedAt: sourceStat.mtime.toISOString(),
      source: markdown,
    });
  versions = versions.slice(-((options.historyLimit ?? 10) + 1));
  await atomicWriteFile(
    output,
    renderMarkdown(
      markdown,
      {
        title: basename(input, extname(input)),
        modifiedAt: sourceStat.mtime.toISOString(),
        markedOptions: {
          walkTokens: assets.rewrite,
        },
        documentDiff: options.documentDiff,
      },
      annotations,
      previousSource,
      undefined,
      versions.slice(0, -1).map((version, index, previousVersions) => ({
        markdown: version.source!,
        label: version.modifiedAt ?? `過去版 ${previousVersions.length - index}`,
      })),
    ),
  );
  if (sourceChanged) {
    await writeHistory(outputRoot, previousHistoryPath, latestSource);
  }
  await writeHistory(outputRoot, historyPath, markdown);
  for (const version of versions)
    await writeHistory(outputRoot, version.path, version.source!);
  await atomicWriteFile(
    versionIndexPath,
    `${JSON.stringify({
      versions: versions.map(({ sourceHash, path, modifiedAt }) => ({
        sourceHash,
        path,
        modifiedAt,
      })),
    }, null, 2)}\n`,
  );
  return output;
}
