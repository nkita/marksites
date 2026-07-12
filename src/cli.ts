#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import { markdownToHtml } from "./index.js";

function usage(): never {
  console.error("Usage: marksites <input.md> [output.html]");
  process.exit(1);
}

const input = process.argv[2];
if (!input) usage();

const output = process.argv[3] ?? input.replace(/\.(md|markdown)$/i, "") + ".html";
const markdown = await readFile(input, "utf8");
const title = basename(input).replace(/\.(md|markdown)$/i, "");
await writeFile(output, markdownToHtml(markdown, { title }), "utf8");
console.log(`Created ${output}`);
