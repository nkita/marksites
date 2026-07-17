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

export async function convertFile(
  input: string,
  outputArgument?: string,
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
  await atomicWriteFile(
    output,
    renderMarkdown(
      markdown,
      {
        title: basename(input, extname(input)),
        modifiedAt: sourceStat.mtime.toISOString(),
      },
      annotations,
    ),
  );
  return output;
}
