import { readFile } from "node:fs/promises";
import { atomicWriteFile } from "../utils/files.js";
import type { BuildManifest, MarkdownFile } from "./types.js";

export const BUILD_MANIFEST = ".marksites-build.json";

export function assertNoOutputCollisions(files: MarkdownFile[]): void {
  const paths = new Map<string, string>();
  for (const file of files) {
    for (const output of [file.outputPath, file.metadataPath]) {
      const key = output.toLowerCase();
      if (paths.has(key))
        throw new Error(`Multiple Markdown files map to: ${output}`);
      paths.set(key, file.relativePath);
    }
    if (
      file.outputPath === BUILD_MANIFEST ||
      file.metadataPath === BUILD_MANIFEST
    ) {
      throw new Error(`Output path is reserved: ${BUILD_MANIFEST}`);
    }
  }
}

export async function loadManifest(
  path: string,
): Promise<{ manifest?: BuildManifest; warning?: string }> {
  try {
    const value = JSON.parse(await readFile(path, "utf8")) as BuildManifest;
    if (
      value.schemaVersion !== 1 ||
      !value.generator ||
      typeof value.treeHash !== "string" ||
      typeof value.files !== "object"
    ) {
      throw new Error("unsupported schema");
    }
    return { manifest: value };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    return {
      warning: `Ignoring invalid build manifest ${path}: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function writeManifest(
  path: string,
  manifest: BuildManifest,
): Promise<void> {
  await atomicWriteFile(path, `${JSON.stringify(manifest, null, 2)}\n`);
}
