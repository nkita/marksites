import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { convertDirectory } from "../dist/cli/directory.js";

const execFileAsync = promisify(execFile);

test("converts a Markdown directory while preserving its hierarchy", async () => {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "marksites-cli-"));
  const input = join(temporaryDirectory, "docs");
  const output = join(temporaryDirectory, "site");
  await mkdir(join(input, "guide"), { recursive: true });
  await writeFile(
    join(input, "index.md"),
    "# Home\n\n[Guide](guide/start.md)\n",
  );
  await writeFile(
    join(input, "guide", "start.md"),
    "# Guide\n\n[Home](../index.md)\n",
  );

  const count = await convertDirectory(input, output);
  const home = await readFile(join(output, "index.html"), "utf8");
  const guide = await readFile(join(output, "guide", "start.html"), "utf8");

  assert.equal(count, 2);
  assert.match(home, /href="guide\/start\.html"/);
  assert.match(guide, /href="\.\.\/index\.html"/);
  assert.match(home, /href="index\.html" aria-current="page"/);
  assert.match(guide, /href="start\.html" aria-current="page"/);
  assert.match(home, /<summary>guide<\/summary>/);
  assert.match(home, /class="file-breadcrumbs"/);
  assert.match(
    guide,
    /<a href="\.\.\/index\.html">docs<\/a>[\s\S]*<span>guide<\/span>[\s\S]*<span aria-current="page">start\.md<\/span>/,
  );
});

test("rejects Markdown files that map to the same HTML path", async () => {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "marksites-cli-"));
  const input = join(temporaryDirectory, "docs");
  await mkdir(input, { recursive: true });
  await writeFile(join(input, "guide.md"), "# Guide\n");
  await writeFile(join(input, "guide.markdown"), "# Other guide\n");

  await assert.rejects(
    convertDirectory(input, join(temporaryDirectory, "site")),
    /Multiple Markdown files map to: guide\.html/,
  );
});

test("rejects invalid serve options", async () => {
  await assert.rejects(
    execFileAsync(process.execPath, [
      "dist/cli.js",
      "serve",
      ".",
      "--port",
      "70000",
    ]),
    /Invalid port: 70000/,
  );
  await assert.rejects(
    execFileAsync(process.execPath, ["dist/cli.js", "serve", ".", "--unknown"]),
    /Unknown option: --unknown/,
  );
});
