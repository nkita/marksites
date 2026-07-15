#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile, stat } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { convertDirectoryDetailed } from "./conversion/directory.js";
import { convertFile } from "./conversion/single-file.js";
import type { ConversionResult } from "./conversion/types.js";
import { MARKSITES_RESERVED_PATH } from "./server/constants.js";
import { startMarksitesServer } from "./server/server.js";
import { openBrowser } from "./cli/open-browser.js";

function usage(): never {
  console.error(
    "Usage:\n  marksites [input.md|input-directory] [output.html|output-directory]\n  marksites serve [input-directory] [output-directory] [--host HOST] [--port PORT] [--open]",
  );
  process.exit(1);
}

function report(result: ConversionResult): void {
  console.log(
    `Converted ${result.converted}; skipped ${result.skipped}; deleted ${result.deleted}; annotation files created ${result.annotationsCreated}; moved ${result.annotationsMoved}`,
  );
  for (const path of result.orphanedAnnotations)
    console.warn(`Orphaned annotation JSON preserved: ${path}`);
}

async function serve(args: string[]): Promise<void> {
  const positional: string[] = [];
  let host = "127.0.0.1",
    port = 3000,
    shouldOpen = false;
  for (let index = 0; index < args.length; index++) {
    const argument = args[index]!;
    if (argument === "--open") {
      shouldOpen = true;
      continue;
    }
    if (argument === "--host" || argument === "--port") {
      const value = args[++index];
      if (!value) usage();
      if (argument === "--host") host = value;
      else {
        port = Number(value);
        if (!Number.isInteger(port) || port < 0 || port > 65535)
          throw new Error(`Invalid port: ${value}`);
      }
      continue;
    }
    if (argument.startsWith("--"))
      throw new Error(`Unknown option: ${argument}`);
    positional.push(argument);
  }
  if (positional.length > 2) usage();
  const inputArgument = positional[0] ?? ".";
  const input = resolve(inputArgument);
  if (!(await stat(input)).isDirectory())
    throw new Error(`serve input must be a directory: ${inputArgument}`);
  const initial = await convertDirectoryDetailed(input, positional[1]);
  report(initial);
  const output = initial.outputRoot;
  try {
    await access(join(output, MARKSITES_RESERVED_PATH));
    throw new Error(`Reserved output path exists: ${MARKSITES_RESERVED_PATH}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const manifest = JSON.parse(
    await readFile(join(output, ".marksites-build.json"), "utf8"),
  ) as {
    files: Record<string, { annotations: string; output: string }>;
  };
  const documents = new Map(
    Object.entries(manifest.files).map(([document, value]) => [
      document,
      value.annotations,
    ]),
  );
  const projectId = createHash("sha256")
    .update(input)
    .digest("hex")
    .slice(0, 16);
  const outputs = Object.values(manifest.files)
    .map((value) => value.output)
    .sort((left, right) => left.localeCompare(right, "en"));
  const entryPath = outputs.includes("index.html") ? "index.html" : outputs[0];
  const server = await startMarksitesServer({
    outputRoot: output,
    entryPath,
    host,
    port,
    projectId,
    projectName: basename(input),
    documents,
    onAnnotationsChange: async () => {
      await convertDirectoryDetailed(input, output);
    },
  });
  console.log(`marksites server: ${server.url}`);
  if (shouldOpen) {
    const opened = await openBrowser(server.url);
    if (!opened) {
      console.warn(
        `Could not open a browser automatically. Open ${server.url} manually.`,
      );
    }
  }
  await new Promise<void>((done, fail) => {
    let closing = false;
    const close = () => {
      if (closing) return;
      closing = true;
      server.close().then(done, fail);
    };
    process.once("SIGINT", close);
    process.once("SIGTERM", close);
  });
}

async function main(): Promise<void> {
  if (process.argv[2] === "serve") return serve(process.argv.slice(3));
  const inputArgument = process.argv[2] ?? ".";
  const input = resolve(inputArgument);
  const inputStat = await stat(input);
  const outputArgument = process.argv[3];
  if (inputStat.isDirectory()) {
    report(await convertDirectoryDetailed(input, outputArgument));
    return;
  }
  if (!inputStat.isFile())
    throw new Error(`Input is not a file or directory: ${inputArgument}`);
  console.log(`Created ${await convertFile(input, outputArgument)}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
