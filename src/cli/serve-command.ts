import { createHash } from "node:crypto";
import { access, readFile, stat } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { convertDirectoryDetailed } from "../conversion/directory.js";
import { watchConversionInput } from "../conversion/watch.js";
import { MARKSITES_RESERVED_PATH } from "../server/constants.js";
import { startMarksitesServer } from "../server/server.js";
import type { ServeArguments } from "./arguments.js";
import { openBrowser } from "./open-browser.js";
import { reportConversion } from "./reporting.js";

interface ConversionManifest {
  files: Record<string, { annotations: string; output: string }>;
}

async function readConversionManifest(output: string): Promise<ConversionManifest> {
  return JSON.parse(
    await readFile(join(output, ".marksites-build.json"), "utf8"),
  ) as ConversionManifest;
}

async function assertAvailableInternalPath(output: string): Promise<void> {
  try {
    await access(join(output, MARKSITES_RESERVED_PATH));
    throw new Error(`Reserved output path exists: ${MARKSITES_RESERVED_PATH}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

export async function runServeCommand(parsed: ServeArguments): Promise<void> {
  const {
    positional,
    host,
    port,
    open: shouldOpen,
    watch: shouldWatch,
    verbose,
    historyLimit,
  } = parsed;
  const inputArgument = positional[0] ?? ".";
  const input = resolve(inputArgument);
  if (!(await stat(input)).isDirectory())
    throw new Error(`serve input must be a directory: ${inputArgument}`);
  const conversionOptions = {
    onLog: verbose ? (message: string) => console.log(message) : undefined,
    historyLimit,
  };
  const initial = await convertDirectoryDetailed(input, positional[1], conversionOptions);
  reportConversion(initial);
  const output = initial.outputRoot;
  await assertAvailableInternalPath(output);
  const manifest = await readConversionManifest(output);
  const documents = new Map(
    Object.entries(manifest.files).map(([document, value]) => [document, value.annotations]),
  );
  const projectId = createHash("sha256").update(input).digest("hex").slice(0, 16);
  const outputs = Object.values(manifest.files)
    .map((value) => value.output)
    .sort((left, right) => left.localeCompare(right, "en"));
  const server = await startMarksitesServer({
    outputRoot: output,
    entryPath: outputs.includes("index.html") ? "index.html" : outputs[0],
    host,
    port,
    fallbackPort: port === undefined,
    projectId,
    projectName: basename(input),
    documents,
    onAnnotationsChange: async () => {
      await convertDirectoryDetailed(input, output, conversionOptions);
    },
  });
  console.log(`marksites server: ${server.url}`);
  const watcher = shouldWatch
    ? await watchConversionInput(input, output, async () => {
        const result = await convertDirectoryDetailed(input, output, conversionOptions);
        reportConversion(result);
        const nextManifest = await readConversionManifest(output);
        documents.clear();
        for (const [document, value] of Object.entries(nextManifest.files))
          documents.set(document, value.annotations);
      }, conversionOptions)
    : undefined;
  if (watcher) console.log(`Watching ${input}`);
  if (shouldOpen && !(await openBrowser(server.url)))
    console.warn(`Could not open a browser automatically. Open ${server.url} manually.`);
  await new Promise<void>((done, fail) => {
    let closing = false;
    const close = () => {
      if (closing) return;
      closing = true;
      watcher?.close();
      server.close().then(done, fail);
    };
    process.once("SIGINT", close);
    process.once("SIGTERM", close);
  });
}
