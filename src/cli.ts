#!/usr/bin/env node

import { stat } from "node:fs/promises";
import { resolve } from "node:path";
import { convertDirectory, convertFile } from "./cli/directory.js";

function usage(): never {
  console.error(
    "Usage: marksites <input.md|input-directory> [output.html|output-directory]",
  );
  process.exit(1);
}

async function main(): Promise<void> {
  const inputArgument = process.argv[2];
  if (!inputArgument) usage();

  const input = resolve(inputArgument);
  const inputStat = await stat(input);
  const outputArgument = process.argv[3];

  if (inputStat.isDirectory()) {
    const count = await convertDirectory(input, outputArgument);
    console.log(`Created ${count} HTML file${count === 1 ? "" : "s"}`);
    return;
  }

  if (!inputStat.isFile()) {
    throw new Error(`Input is not a file or directory: ${inputArgument}`);
  }

  const output = await convertFile(input, outputArgument);
  console.log(`Created ${output}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
