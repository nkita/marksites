#!/usr/bin/env node

import { parseConvertArguments } from "./cli/arguments.js";
import { runConvertCommand } from "./cli/convert-command.js";

function usage(): never {
  console.error(
    "Usage:\n  marksites [input.md|input-directory] [output.html|output-directory] [--history-limit COUNT] [--no-diff] [--watch] [--verbose]",
  );
  process.exit(1);
}

async function main(): Promise<void> {
  if (process.argv[2] === "serve")
    throw new Error("The serve command is disabled");
  const parsed = parseConvertArguments(process.argv.slice(2));
  if (!parsed) usage();
  return runConvertCommand(parsed);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
