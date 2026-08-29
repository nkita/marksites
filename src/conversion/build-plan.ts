import { countActiveAnnotations } from "../annotations/model.js";
import {
  GENERATOR_VERSION,
  OUTPUT_COMPATIBILITY_VERSION,
  contentHash,
  renderFingerprint,
} from "./rendering.js";
import type { BuildManifest, MarkdownFile } from "./types.js";

export interface BuildPlan {
  removed: string[];
  treeHash: string;
  renderFingerprint: string;
  full: boolean;
}

export function findRemovedPaths(
  files: MarkdownFile[],
  previous: BuildManifest | undefined,
): string[] {
  const currentPaths = new Set(files.map((file) => file.relativePath));
  return Object.keys(previous?.files ?? {}).filter(
    (path) => !currentPaths.has(path),
  );
}

export function createBuildPlan(
  files: MarkdownFile[],
  previous: BuildManifest | undefined,
  manifestWarning?: string,
  removed = findRemovedPaths(files, previous),
): BuildPlan {
  const treeHash = contentHash(
    files
      .map(
        (file) =>
          `${file.relativePath}\0${file.modifiedAt}\0${file.annotations ? countActiveAnnotations(file.annotations) : 0}`,
      )
      .sort()
      .join("\n"),
  );
  const fingerprint = renderFingerprint();
  return {
    removed,
    treeHash,
    renderFingerprint: fingerprint,
    full:
      !previous ||
      manifestWarning !== undefined ||
      previous.generator.version !== GENERATOR_VERSION ||
      previous.generator.outputCompatibilityVersion !==
        OUTPUT_COMPATIBILITY_VERSION ||
      previous.generator.renderFingerprint !== fingerprint ||
      previous.treeHash !== treeHash,
  };
}
