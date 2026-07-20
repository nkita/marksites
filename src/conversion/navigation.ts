import { basename, posix } from "node:path";
import { countActiveAnnotations } from "../annotations/model.js";
import type { FileBreadcrumb, FileTreeNode } from "../types.js";
import type { MarkdownFile } from "./types.js";

interface MutableDirectory {
  directories: Map<string, MutableDirectory>;
  files: MarkdownFile[];
}

function encodeRelativeHref(path: string): string {
  return path.split(posix.sep).map(encodeURIComponent).join("/");
}

export function buildFileTree(
  files: MarkdownFile[],
  currentOutputPath: string,
): FileTreeNode[] {
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
  function render(directory: MutableDirectory): FileTreeNode[] {
    return [
      ...[...directory.directories]
        .sort(([left], [right]) => left.localeCompare(right, "en"))
        .map(([name, child]) => ({
          type: "directory" as const,
          name,
          children: render(child),
        })),
      ...[...directory.files]
        .sort((left, right) =>
          basename(left.relativePath).localeCompare(
            basename(right.relativePath),
            "en",
          ),
        )
        .map((file) => ({
          type: "file" as const,
          name: basename(file.relativePath),
          href: encodeRelativeHref(
            posix.relative(posix.dirname(currentOutputPath), file.outputPath) ||
              posix.basename(file.outputPath),
          ),
          current: file.outputPath === currentOutputPath,
          commentCount: file.annotations
            ? countActiveAnnotations(file.annotations)
            : 0,
        })),
    ];
  }
  return render(root);
}

function hrefBetween(current: string, target: string): string {
  return encodeRelativeHref(
    posix.relative(posix.dirname(current), target) || posix.basename(target),
  );
}

export function buildBreadcrumbs(
  files: MarkdownFile[],
  current: MarkdownFile,
): FileBreadcrumb[] {
  const findIndex = (directory: string) =>
    files.find(
      (file) =>
        posix.dirname(file.relativePath) === directory &&
        ["index.md", "index.markdown"].includes(
          posix.basename(file.relativePath).toLowerCase(),
        ),
    );
  const result: FileBreadcrumb[] = [];
  const parts = current.relativePath.split("/");
  const fileName = parts.pop();
  let directory = "";
  for (const part of parts) {
    directory = directory ? `${directory}/${part}` : part;
    const index = findIndex(directory);
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
