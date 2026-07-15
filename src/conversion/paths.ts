import { access, readdir } from "node:fs/promises";
import { join, posix, relative, resolve, sep } from "node:path";
import type { MarkdownFile } from "./types.js";

export function isMarkdown(path: string): boolean {
  return /\.(md|markdown)$/i.test(path);
}

export function toHtmlPath(path: string): string {
  return path.replace(/\.(md|markdown)$/i, ".html");
}

export function toMetadataPath(path: string): string {
  const htmlPath = toHtmlPath(path);
  return posix.join(
    posix.dirname(htmlPath),
    `.${posix.basename(htmlPath, posix.extname(htmlPath))}.json`,
  );
}

export function toLegacyMetadataPaths(path: string): string[] {
  const htmlPath = toHtmlPath(path);
  const directory = posix.dirname(htmlPath);
  const name = posix.basename(htmlPath, posix.extname(htmlPath));
  return [
    posix.join(directory, `.${name}.marksites.json`),
    posix.join(directory, `${name}.annotations.json`),
  ];
}

export function toPosix(path: string): string {
  return path.split(sep).join(posix.sep);
}

export async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function firstExistingPath(
  paths: string[],
): Promise<string | undefined> {
  for (const path of paths) if (await pathExists(path)) return path;
  return undefined;
}

export async function findMarkdownFiles(
  root: string,
  excludedDirectory?: string,
): Promise<MarkdownFile[]> {
  const files: MarkdownFile[] = [];
  async function visit(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) =>
      left.isDirectory() !== right.isDirectory()
        ? left.isDirectory()
          ? -1
          : 1
        : left.name.localeCompare(right.name, "en"),
    );
    for (const entry of entries) {
      const absolute = join(directory, entry.name);
      if (entry.isDirectory()) {
        if (resolve(absolute) !== excludedDirectory) await visit(absolute);
      } else if (entry.isFile() && isMarkdown(entry.name)) {
        const relativePath = toPosix(relative(root, absolute));
        files.push({
          sourcePath: absolute,
          relativePath,
          outputPath: toHtmlPath(relativePath),
          metadataPath: toMetadataPath(relativePath),
        });
      }
    }
  }
  await visit(root);
  return files;
}
