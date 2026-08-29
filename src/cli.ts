#!/usr/bin/env node

import {
  parseConvertArguments,
  parseServeArguments,
} from "./cli/arguments.js";
import { runConvertCommand } from "./cli/convert-command.js";
import { runServeCommand } from "./cli/serve-command.js";

function usage(): never {
  console.error(
    "Usage:\n  marksites [input.md|input-directory] [output.html|output-directory] [--watch] [--verbose]\n  marksites serve [input-directory] [output-directory] [--host HOST] [--port PORT] [--open] [--watch] [--verbose]",
  );
  process.exit(1);
}

async function main(): Promise<void> {
  if (process.argv[2] === "serve") {
    const parsed = parseServeArguments(process.argv.slice(3));
    if (!parsed) usage();
    return runServeCommand(parsed);
  }
  const parsed = parseConvertArguments(process.argv.slice(2));
  if (!parsed) usage();
  return runConvertCommand(parsed);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
