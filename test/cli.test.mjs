import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { convertDirectory } from "../dist/cli/directory.js";

const execFileAsync = promisify(execFile);
const cliPath = resolve("dist/cli.js");

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
  assert.match(
    home,
    /href="index\.html" data-file-name="index\.md" aria-current="page"/,
  );
  assert.match(
    guide,
    /href="start\.html" data-file-name="start\.md" aria-current="page"/,
  );
  assert.match(
    home,
    /<summary><svg class="folder-icon"[^>]*>[\s\S]*?<span>guide<\/span><\/summary>/,
  );
  assert.match(home, /class="file-breadcrumbs"/);
  assert.match(home, /class="file-tree-popover-toggle" data-file-tree-toggle/);
  assert.match(
    home,
    /<button type="button" class="file-tree-popover-toggle"[^>]*><span>index\.md<\/span><svg class="panel-toggle-icon"/,
  );
  assert.doesNotMatch(
    home,
    /class="file-breadcrumb-separator"[^>]*>\/<\/span>[\s\S]*?<span>index\.md<\/span>/,
  );
  assert.match(
    guide,
    /<span>guide<\/span>[\s\S]*<button type="button" class="file-tree-popover-toggle"[^>]*><span>start\.md<\/span><svg class="panel-toggle-icon"/,
  );
  assert.doesNotMatch(guide, />docs<\//);
});

test("copies local Markdown images to content-addressed assets", async () => {
  const root = await mkdtemp(join(tmpdir(), "marksites-images-"));
  const input = join(root, "docs"), output = join(root, "site");
  await mkdir(join(input, "guide", "images"), { recursive: true });
  await writeFile(join(input, "guide", "images", "screen.png"), "image-one");
  await writeFile(join(input, "guide", "page.md"), "![Screen](images/screen.png)\n");

  await convertDirectory(input, output);
  const first = await readFile(join(output, "guide", "page.html"), "utf8");
  const href = /<img src="([^"]+)" alt="Screen">/.exec(first)?.[1];
  assert.ok(href);
  assert.match(href, /^\.\.\/_marksites-assets\/[a-f0-9]{64}\.png$/);
  assert.equal(await readFile(join(output, "guide", href), "utf8"), "image-one");
  assert.match(first, /data-image-viewer/);
  assert.match(first, /data-image-zoom-in/);

  await writeFile(join(input, "guide", "images", "screen.png"), "image-two");
  const result = await convertDirectory(input, output);
  const second = await readFile(join(output, "guide", "page.html"), "utf8");
  assert.equal(result, 1);
  assert.notEqual(/<img src="([^"]+)" alt="Screen">/.exec(second)?.[1], href);
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

test("verbose reports per-document conversion details", async () => {
  const root = await mkdtemp(join(tmpdir(), "marksites-verbose-"));
  const input = join(root, "docs"), output = join(root, "site");
  await mkdir(input);
  await writeFile(join(input, "index.md"), "# Home\n");

  const verbose = await execFileAsync(process.execPath, [
    cliPath,
    input,
    output,
    "--verbose",
  ]);
  assert.match(verbose.stdout, /Converted index\.md -> index\.html/);

  const regular = await execFileAsync(process.execPath, [
    cliPath,
    input,
    output,
  ]);
  assert.doesNotMatch(regular.stdout, /Skipped index\.md/);
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

test("uses the current directory for omitted input and output", async () => {
  const project = await mkdtemp(join(tmpdir(), "marksites-defaults-"));
  await writeFile(join(project, "README.md"), "# Project\n");
  await mkdir(join(project, "node_modules", "dependency"), { recursive: true });
  await writeFile(
    join(project, "node_modules", "dependency", "README.md"),
    "# Dependency\n",
  );

  await execFileAsync(process.execPath, [cliPath], { cwd: project });

  assert.match(
    await readFile(join(project, "marksites", "README.html"), "utf8"),
    /Project/,
  );
  assert.equal(
    JSON.parse(
      await readFile(join(project, "marksites", ".README.json"), "utf8"),
    ).document,
    "README.md",
  );
  await assert.rejects(
    readFile(join(project, "node_modules", "dependency", "README.html")),
    /ENOENT/,
  );
});

test("serve uses the current directory when paths are omitted", async (t) => {
  const project = await mkdtemp(join(tmpdir(), "marksites-serve-defaults-"));
  await writeFile(join(project, "index.md"), "# Project\n");
  const child = spawn(process.execPath, [cliPath, "serve", "--port", "0"], {
    cwd: project,
    stdio: ["ignore", "pipe", "pipe"],
  });
  t.after(() => {
    if (!child.killed) child.kill("SIGTERM");
  });
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => (stderr += chunk));
  await new Promise((done, fail) => {
    const timeout = setTimeout(
      () => fail(new Error(`serve did not start: ${stderr}`)),
      5_000,
    );
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      if (!chunk.includes("marksites server:")) return;
      clearTimeout(timeout);
      done();
    });
    child.once("error", fail);
    child.once("exit", (code) => {
      if (code && code !== 0)
        fail(new Error(`serve exited ${code}: ${stderr}`));
    });
  });
  assert.match(
    await readFile(join(project, "marksites", "index.html"), "utf8"),
    /Project/,
  );
  child.kill("SIGTERM");
  await new Promise((done) => child.once("exit", done));
});

test("watch rebuilds changed and newly added Markdown files", async (t) => {
  const project = await mkdtemp(join(tmpdir(), "marksites-watch-"));
  await writeFile(join(project, "index.md"), "# Before\n");
  const child = spawn(
    process.execPath,
    [cliPath, ".", "site", "--watch", "--verbose"],
    {
    cwd: project,
    stdio: ["ignore", "pipe", "pipe"],
    },
  );
  t.after(() => { if (!child.killed) child.kill("SIGTERM"); });
  let stdout = "";
  await new Promise((done, fail) => {
    const timeout = setTimeout(() => fail(new Error("watch did not start")), 5_000);
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      if (chunk.includes("Watching ")) { clearTimeout(timeout); done(); }
    });
    child.once("error", fail);
  });
  await writeFile(join(project, "index.md"), "# After\n");
  await writeFile(join(project, "new.md"), "# New\n");
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    try {
      const [index, added] = await Promise.all([
        readFile(join(project, "site", "index.html"), "utf8"),
        readFile(join(project, "site", "new.html"), "utf8"),
      ]);
      if (index.includes("After") && added.includes("New")) break;
    } catch {}
    await new Promise((done) => setTimeout(done, 50));
  }
  assert.match(await readFile(join(project, "site", "index.html"), "utf8"), /After/);
  assert.match(await readFile(join(project, "site", "new.html"), "utf8"), /New/);
  assert.match(stdout, /Watch event (change|rename):/);
  assert.match(stdout, /Watch rebuild started/);
  child.kill("SIGTERM");
  await new Promise((done) => child.once("exit", done));
});
