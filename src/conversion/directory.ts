import { mkdir, readFile, rename, rm, stat } from "node:fs/promises";
import {
  basename,
  dirname,
  extname,
  isAbsolute,
  join,
  posix,
  relative,
  resolve,
  sep,
} from "node:path";
import { countActiveAnnotations } from "../annotations/model.js";
import {
  readAnnotations,
  serializeAnnotations,
} from "../annotations/storage.js";
import { renderMarkdown } from "../markdown-to-html.js";
import { atomicWriteFile } from "../utils/files.js";
import {
  BUILD_MANIFEST,
  assertNoOutputCollisions,
  loadManifest,
  writeManifest,
} from "./manifest.js";
import { buildBreadcrumbs, buildFileTree } from "./navigation.js";
import {
  DEFAULT_OUTPUT_DIRECTORY,
  findMarkdownFiles,
  firstExistingPath,
  pathExists,
  toLegacyMetadataPaths,
} from "./paths.js";
import {
  OUTPUT_COMPATIBILITY_VERSION,
  contentHash,
  renderFingerprint,
  rewriteMarkdownLinks,
} from "./rendering.js";
import type {
  BuildManifest,
  ConversionResult,
  ConversionOptions,
  ManifestFile,
  MarkdownFile,
} from "./types.js";
import { prepareImageAssets } from "./assets.js";

async function migrateLegacyMetadata(
  files: MarkdownFile[],
  output: string,
): Promise<number> {
  let moved = 0;
  for (const file of files) {
    const metadata = join(output, ...file.metadataPath.split("/"));
    if (await pathExists(metadata)) continue;
    const legacy = await firstExistingPath(
      toLegacyMetadataPaths(file.relativePath).map((path) =>
        join(output, ...path.split("/")),
      ),
    );
    if (!legacy) continue;
    await mkdir(dirname(metadata), { recursive: true });
    await rename(legacy, metadata);
    moved++;
  }
  return moved;
}

async function loadSources(files: MarkdownFile[]): Promise<void> {
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

async function prepareAssets(
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

async function removeUnusedAssets(
  previous: BuildManifest | undefined,
  files: MarkdownFile[],
  output: string,
): Promise<void> {
  const current = new Set(files.flatMap((file) => file.assetOutputs ?? []));
  const old = new Set(
    Object.values(previous?.files ?? {}).flatMap((file) => file.assets ?? []),
  );
  for (const asset of old) {
    if (!current.has(asset))
      await rm(join(output, ...asset.split("/")), { force: true });
  }
}

async function moveRenamedDocuments(
  files: MarkdownFile[],
  previous: BuildManifest | undefined,
  output: string,
  removed: string[],
): Promise<{ deleted: number; metadataMoved: number }> {
  let deleted = 0;
  let metadataMoved = 0;
  const added = files.filter((file) => !previous?.files[file.relativePath]);
  for (const file of added) {
    const matches = removed.filter(
      (old) =>
        previous?.files[old]?.sourceHash === file.sourceHash &&
        added.filter((candidate) => candidate.sourceHash === file.sourceHash)
          .length === 1,
    );
    if (matches.length !== 1) continue;
    const old = matches[0]!;
    const oldData = previous!.files[old]!;
    const oldMetadata = join(output, ...oldData.annotations.split("/"));
    const nextMetadata = join(output, ...file.metadataPath.split("/"));
    if ((await pathExists(oldMetadata)) && oldMetadata !== nextMetadata) {
      await mkdir(dirname(nextMetadata), { recursive: true });
      const value = await readAnnotations(oldMetadata);
      value.document = file.relativePath;
      await atomicWriteFile(nextMetadata, serializeAnnotations(value));
      await rm(oldMetadata);
      metadataMoved++;
    }
    const oldHtml = join(output, ...oldData.output.split("/"));
    if (await pathExists(oldHtml)) {
      await rm(oldHtml);
      deleted++;
    }
    warnAboutStaleLinks(files, old);
    removed.splice(removed.indexOf(old), 1);
  }
  return { deleted, metadataMoved };
}

function warnAboutStaleLinks(files: MarkdownFile[], oldPath: string): void {
  for (const file of files) {
    const formerHref = posix.relative(
      posix.dirname(file.relativePath),
      oldPath,
    );
    if (file.source?.includes(formerHref)) {
      console.warn(
        `Possible stale Markdown link in ${file.relativePath}: ${formerHref}`,
      );
    }
  }
}

async function loadMetadata(
  files: MarkdownFile[],
  output: string,
): Promise<number> {
  let created = 0;
  for (const file of files) {
    const metadata = join(output, ...file.metadataPath.split("/"));
    const existed = await pathExists(metadata);
    file.annotations = await readAnnotations(metadata, file.relativePath);
    if (!existed) created++;
    file.annotationHash = contentHash(serializeAnnotations(file.annotations));
  }
  return created;
}

async function removeDeletedHtml(
  removed: string[],
  previous: BuildManifest | undefined,
  output: string,
): Promise<{ deleted: number; orphaned: string[] }> {
  let deleted = 0;
  const orphaned: string[] = [];
  for (const old of removed) {
    const info = previous?.files[old];
    if (!info) continue;
    const oldHtml = join(output, ...info.output.split("/"));
    if (await pathExists(oldHtml)) {
      await rm(oldHtml);
      deleted++;
    }
    if (await pathExists(join(output, ...info.annotations.split("/")))) {
      orphaned.push(info.annotations);
    }
  }
  return { deleted, orphaned };
}

async function renderChangedFiles(
  files: MarkdownFile[],
  input: string,
  output: string,
  previous: BuildManifest | undefined,
  full: boolean,
  options: ConversionOptions,
): Promise<{
  converted: number;
  skipped: number;
  files: Record<string, ManifestFile>;
}> {
  let converted = 0;
  let skipped = 0;
  const manifestFiles: Record<string, ManifestFile> = {};
  for (const file of files) {
    const old = previous?.files[file.relativePath];
    const destination = join(output, ...file.outputPath.split("/"));
    const changed =
      full ||
      !old ||
      old.sourceHash !== file.sourceHash ||
      old.modifiedAt !== file.modifiedAt ||
      old.annotationHash !== file.annotationHash ||
      old.assetHash !== file.assetHash ||
      !(await pathExists(destination));
    if (changed) {
      await atomicWriteFile(
        destination,
        renderMarkdown(
          file.source!,
          {
            title: basename(file.relativePath, extname(file.relativePath)),
            modifiedAt: file.modifiedAt,
            fileTree: {
              title: "ファイル",
              items: buildFileTree(files, file.outputPath),
              breadcrumbs: buildBreadcrumbs(files, file),
            },
            markedOptions: {
              walkTokens: (token) => {
                rewriteMarkdownLinks(token);
                file.rewriteImages?.(token);
              },
            },
          },
          file.annotations,
        ),
      );
      converted++;
      options.onLog?.(`Converted ${file.relativePath} -> ${file.outputPath}`);
    } else {
      skipped++;
      options.onLog?.(`Skipped ${file.relativePath}`);
    }
    manifestFiles[file.relativePath] = {
      sourceHash: file.sourceHash!,
      modifiedAt: file.modifiedAt!,
      annotationHash: file.annotationHash!,
      output: file.outputPath,
      annotations: file.metadataPath,
      assetHash: file.assetHash,
      assets: file.assetOutputs,
    };
  }
  return { converted, skipped, files: manifestFiles };
}

export async function convertDirectoryDetailed(
  input: string,
  outputArgument?: string,
  options: ConversionOptions = {},
): Promise<ConversionResult> {
  const output = outputArgument
    ? resolve(outputArgument)
    : resolve(DEFAULT_OUTPUT_DIRECTORY);
  const outputRelative = relative(input, output);
  const outputInsideInput =
    outputRelative !== "" &&
    !outputRelative.startsWith(`..${sep}`) &&
    outputRelative !== ".." &&
    !isAbsolute(outputRelative);
  const files = await findMarkdownFiles(
    input,
    outputInsideInput ? output : undefined,
  );
  if (files.length === 0)
    throw new Error(`No Markdown files found in: ${input}`);
  assertNoOutputCollisions(files);
  await mkdir(output, { recursive: true });

  const manifestPath = join(output, BUILD_MANIFEST);
  const loaded = await loadManifest(manifestPath);
  if (loaded.warning) console.warn(loaded.warning);
  const previous = loaded.manifest;
  await loadSources(files);
  await prepareAssets(files, output);
  let annotationsMoved = await migrateLegacyMetadata(files, output);

  const currentPaths = new Set(files.map((file) => file.relativePath));
  const removed = Object.keys(previous?.files ?? {}).filter(
    (path) => !currentPaths.has(path),
  );
  const renamed = await moveRenamedDocuments(files, previous, output, removed);
  annotationsMoved += renamed.metadataMoved;
  const annotationsCreated = await loadMetadata(files, output);

  const treeHash = contentHash(
    files
      .map(
        (file) =>
          `${file.relativePath}\0${file.annotations ? countActiveAnnotations(file.annotations) : 0}`,
      )
      .sort()
      .join("\n"),
  );
  const fingerprint = renderFingerprint();
  const full =
    !previous ||
    loaded.warning !== undefined ||
    previous.generator.outputCompatibilityVersion !==
      OUTPUT_COMPATIBILITY_VERSION ||
    previous.generator.renderFingerprint !== fingerprint ||
    previous.treeHash !== treeHash;
  const removedResult = await removeDeletedHtml(removed, previous, output);
  const rendered = await renderChangedFiles(
    files,
    input,
    output,
    previous,
    full,
    options,
  );
  await removeUnusedAssets(previous, files, output);
  await writeManifest(manifestPath, {
    schemaVersion: 1,
    generator: {
      name: "marksites",
      version: "0.2.0",
      outputCompatibilityVersion: OUTPUT_COMPATIBILITY_VERSION,
      renderFingerprint: fingerprint,
    },
    treeHash,
    files: rendered.files,
  });
  return {
    converted: rendered.converted,
    skipped: rendered.skipped,
    deleted: renamed.deleted + removedResult.deleted,
    annotationsCreated,
    annotationsMoved,
    orphanedAnnotations: removedResult.orphaned,
    outputRoot: output,
  };
}

export async function convertDirectory(
  input: string,
  outputArgument?: string,
): Promise<number> {
  return (await convertDirectoryDetailed(input, outputArgument)).converted;
}
