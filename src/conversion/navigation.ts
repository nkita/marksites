import { basename, posix } from "node:path";
import type { FileBreadcrumb, FileTreeNode } from "../types.js";
import type { MarkdownFile } from "./types.js";

interface MutableDirectory {
  directories: Map<string, MutableDirectory>;
  files: MarkdownFile[];
}

function encodeRelativeHref(path: string): string {
  return path.split(posix.sep).map(encodeURIComponent).join("/");
}

export function createNavigation(files: MarkdownFile[]) {
  const root: MutableDirectory = { directories: new Map(), files: [] };
  for (const file of files) {
    const parts = file.relativePath.split("/");
    parts.pop();
    let directory = root;
    for (const part of parts) {
      let child = directory.directories.get(part);
      if (!child) {
        child = { directories: new Map(), files: [] };
        directory.directories.set(part, child);
      }
      directory = child;
    }
    directory.files.push(file);
  }
  const sort = (directory: MutableDirectory): void => {
    directory.directories = new Map(
      [...directory.directories].sort(([left], [right]) =>
        left.localeCompare(right, "en"),
      ),
    );
    directory.files.sort((left, right) =>
      basename(left.relativePath).localeCompare(
        basename(right.relativePath),
        "en",
      ),
    );
    for (const child of directory.directories.values()) sort(child);
  };
  sort(root);
  const indexes = new Map<string, MarkdownFile>();
  for (const file of files) {
    const directory = posix.dirname(file.relativePath);
    if (
      ["index.md", "index.markdown"].includes(
        posix.basename(file.relativePath).toLowerCase(),
      ) &&
      !indexes.has(directory)
    ) {
      indexes.set(directory, file);
    }
  }
  function render(
    directory: MutableDirectory,
    currentOutputPath: string,
  ): FileTreeNode[] {
    return [
      ...[...directory.directories].map(([name, child]) => ({
        type: "directory" as const,
        name,
        children: render(child, currentOutputPath),
      })),
      ...directory.files.map((file) => ({
        type: "file" as const,
        name: basename(file.relativePath),
        path: file.relativePath,
        modifiedAt: file.modifiedAt,
        href: encodeRelativeHref(
          posix.relative(posix.dirname(currentOutputPath), file.outputPath) ||
            posix.basename(file.outputPath),
        ),
        current: file.outputPath === currentOutputPath,
      })),
    ];
  }
  return {
    buildFileTree: (currentOutputPath: string) =>
      render(root, currentOutputPath),
    buildBreadcrumbs: (current: MarkdownFile) =>
      buildBreadcrumbs(indexes, current),
  };
}

function hrefBetween(current: string, target: string): string {
  return encodeRelativeHref(
    posix.relative(posix.dirname(current), target) || posix.basename(target),
  );
}

function buildBreadcrumbs(
  indexes: Map<string, MarkdownFile>,
  current: MarkdownFile,
): FileBreadcrumb[] {
  const result: FileBreadcrumb[] = [];
  const parts = current.relativePath.split("/");
  const fileName = parts.pop();
  let directory = "";
  for (const part of parts) {
    directory = directory ? `${directory}/${part}` : part;
    const index = indexes.get(directory);
    result.push({
      name: part,
      href: index
        ? hrefBetween(current.outputPath, index.outputPath)
        : undefined,
    });
  }
  if (fileName) result.push({ name: fileName, current: true });
  return result;
}
