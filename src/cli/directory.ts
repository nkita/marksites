import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
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
import type { Token } from "marked";
import { markdownToHtml } from "../index.js";
import type { FileBreadcrumb, FileTreeNode } from "../types.js";

interface MarkdownFile {
  sourcePath: string;
  relativePath: string;
  outputPath: string;
}

interface MutableDirectory {
  directories: Map<string, MutableDirectory>;
  files: MarkdownFile[];
}

function isMarkdown(path: string): boolean {
  return /\.(md|markdown)$/i.test(path);
}

function toPosix(path: string): string {
  return path.split(sep).join(posix.sep);
}

function toHtmlPath(path: string): string {
  return path.replace(/\.(md|markdown)$/i, ".html");
}

function encodeRelativeHref(path: string): string {
  return path
    .split(posix.sep)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function rewriteMarkdownHref(href: string): string {
  if (/^[a-z][a-z\d+.-]*:/i.test(href) || href.startsWith("//") || href.startsWith("/")) {
    return href;
  }

  return href.replace(/\.(md|markdown)(?=([?#]|$))/i, ".html");
}

function rewriteMarkdownLinks(token: Token): void {
  if (token.type === "link") token.href = rewriteMarkdownHref(token.href);
}

async function findMarkdownFiles(
  root: string,
  excludedDirectory?: string,
): Promise<MarkdownFile[]> {
  const files: MarkdownFile[] = [];

  async function visit(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => {
      if (left.isDirectory() !== right.isDirectory()) {
        return left.isDirectory() ? -1 : 1;
      }
      return left.name.localeCompare(right.name, "en");
    });

    for (const entry of entries) {
      const absolutePath = join(directory, entry.name);
      if (entry.isDirectory()) {
        if (absolutePath !== excludedDirectory) await visit(absolutePath);
      } else if (entry.isFile() && isMarkdown(entry.name)) {
        const relativePath = toPosix(relative(root, absolutePath));
        files.push({
          sourcePath: absolutePath,
          relativePath,
          outputPath: toHtmlPath(relativePath),
        });
      }
    }
  }

  await visit(root);
  return files;
}

function buildFileTree(
  files: MarkdownFile[],
  currentOutputPath: string,
): FileTreeNode[] {
  const root: MutableDirectory = { directories: new Map(), files: [] };

  for (const file of files) {
    const parts = file.relativePath.split(posix.sep);
    const fileName = parts.pop();
    if (!fileName) continue;
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
    const directories: FileTreeNode[] = [...directory.directories.entries()]
      .sort(([left], [right]) => left.localeCompare(right, "en"))
      .map(([name, child]) => ({
        type: "directory",
        name,
        children: render(child),
      }));
    const markdownFiles: FileTreeNode[] = [...directory.files]
      .sort((left, right) =>
        basename(left.relativePath).localeCompare(
          basename(right.relativePath),
          "en",
        ),
      )
      .map((file) => {
        const href = posix.relative(
          posix.dirname(currentOutputPath),
          file.outputPath,
        );
        return {
          type: "file",
          name: basename(file.relativePath),
          href: encodeRelativeHref(href || posix.basename(file.outputPath)),
          current: file.outputPath === currentOutputPath,
        };
      });
    return [...directories, ...markdownFiles];
  }

  return render(root);
}

function hrefBetween(currentOutputPath: string, targetOutputPath: string): string {
  const href = posix.relative(
    posix.dirname(currentOutputPath),
    targetOutputPath,
  );
  return encodeRelativeHref(href || posix.basename(targetOutputPath));
}

function buildBreadcrumbs(
  files: MarkdownFile[],
  current: MarkdownFile,
  rootName: string,
): FileBreadcrumb[] {
  const findIndex = (directory: string): MarkdownFile | undefined =>
    files.find((file) => {
      const expectedDirectory = posix.dirname(file.relativePath);
      const name = posix.basename(file.relativePath).toLowerCase();
      return (
        expectedDirectory === directory &&
        (name === "index.md" || name === "index.markdown")
      );
    });
  const rootIndex = findIndex(".");
  const breadcrumbs: FileBreadcrumb[] = [
    {
      name: rootName,
      href: rootIndex
        ? hrefBetween(current.outputPath, rootIndex.outputPath)
        : undefined,
    },
  ];
  const parts = current.relativePath.split(posix.sep);
  const fileName = parts.pop();
  let directory = "";

  for (const part of parts) {
    directory = directory ? `${directory}/${part}` : part;
    const index = findIndex(directory);
    breadcrumbs.push({
      name: part,
      href: index ? hrefBetween(current.outputPath, index.outputPath) : undefined,
    });
  }

  if (fileName) breadcrumbs.push({ name: fileName, current: true });
  return breadcrumbs;
}

export async function convertFile(
  input: string,
  outputArgument?: string,
): Promise<string> {
  if (!isMarkdown(input)) {
    throw new Error(`Input file must use .md or .markdown: ${input}`);
  }

  const output = outputArgument
    ? resolve(outputArgument)
    : input.slice(0, -extname(input).length) + ".html";
  const markdown = await readFile(input, "utf8");
  const title = basename(input, extname(input));
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, markdownToHtml(markdown, { title }), "utf8");
  return output;
}

export async function convertDirectory(
  input: string,
  outputArgument?: string,
): Promise<number> {
  const output = outputArgument
    ? resolve(outputArgument)
    : resolve(dirname(input), `${basename(input)}-html`);
  const outputRelativeToInput = relative(input, output);
  const outputIsInsideInput =
    outputRelativeToInput !== "" &&
    !outputRelativeToInput.startsWith(`..${sep}`) &&
    outputRelativeToInput !== ".." &&
    !isAbsolute(outputRelativeToInput);
  const files = await findMarkdownFiles(
    input,
    outputIsInsideInput ? output : undefined,
  );

  if (files.length === 0) {
    throw new Error(`No Markdown files found in: ${input}`);
  }

  const outputPaths = new Set<string>();
  for (const file of files) {
    if (outputPaths.has(file.outputPath)) {
      throw new Error(`Multiple Markdown files map to: ${file.outputPath}`);
    }
    outputPaths.add(file.outputPath);
  }

  for (const file of files) {
    const markdown = await readFile(file.sourcePath, "utf8");
    const destination = join(output, ...file.outputPath.split(posix.sep));
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(
      destination,
      markdownToHtml(markdown, {
        title: basename(file.relativePath, extname(file.relativePath)),
        fileTree: {
          title: basename(input),
          items: buildFileTree(files, file.outputPath),
          breadcrumbs: buildBreadcrumbs(files, file, basename(input)),
        },
        markedOptions: { walkTokens: rewriteMarkdownLinks },
      }),
      "utf8",
    );
  }

  return files.length;
}
