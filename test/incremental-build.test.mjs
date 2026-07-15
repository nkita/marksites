import assert from "node:assert/strict";
import {
  mkdir,
  mkdtemp,
  readFile,
  rename,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { convertDirectoryDetailed } from "../dist/cli/directory.js";

test("creates sidecars and skips unchanged HTML", async () => {
  const root = await mkdtemp(join(tmpdir(), "marksites-incremental-"));
  const input = join(root, "docs"),
    output = join(root, "site");
  await mkdir(input);
  await writeFile(join(input, "index.md"), "# Home\n");
  const first = await convertDirectoryDetailed(input, output);
  const before = (await stat(join(output, "index.html"))).mtimeMs;
  const annotations = await readFile(join(output, ".index.json"), "utf8");
  const second = await convertDirectoryDetailed(input, output);
  assert.equal(first.converted, 1);
  assert.equal(first.annotationsCreated, 1);
  assert.equal(second.converted, 0);
  assert.equal(second.skipped, 1);
  assert.equal((await stat(join(output, "index.html"))).mtimeMs, before);
  assert.equal(
    await readFile(join(output, ".index.json"), "utf8"),
    annotations,
  );
});

test("moves annotations on an unambiguous rename", async () => {
  const root = await mkdtemp(join(tmpdir(), "marksites-rename-"));
  const input = join(root, "docs"),
    output = join(root, "site");
  await mkdir(input);
  await writeFile(join(input, "old.md"), "# Same\n");
  await convertDirectoryDetailed(input, output);
  const data = JSON.parse(await readFile(join(output, ".old.json"), "utf8"));
  data.revision = 1;
  await writeFile(join(output, ".old.json"), JSON.stringify(data));
  await rename(join(input, "old.md"), join(input, "new.md"));
  const result = await convertDirectoryDetailed(input, output);
  const moved = JSON.parse(await readFile(join(output, ".new.json"), "utf8"));
  assert.equal(result.annotationsMoved, 1);
  assert.equal(moved.document, "new.md");
  assert.equal(moved.revision, 1);
  await assert.rejects(readFile(join(output, "old.html"), "utf8"), /ENOENT/);
});

test("records a fingerprint derived from the rendered document", async () => {
  const root = await mkdtemp(join(tmpdir(), "marksites-fingerprint-"));
  const input = join(root, "docs"),
    output = join(root, "site");
  await mkdir(input);
  await writeFile(join(input, "index.md"), "# Home\n");
  await convertDirectoryDetailed(input, output);
  const manifest = JSON.parse(
    await readFile(join(output, ".marksites-build.json"), "utf8"),
  );
  assert.match(manifest.generator.renderFingerprint, /^sha256:[a-f0-9]{64}$/);
});

test("honors nested gitignore files and skips generated directories", async () => {
  const root = await mkdtemp(join(tmpdir(), "marksites-ignore-"));
  const input = join(root, "project"),
    output = join(root, "site");
  await mkdir(join(input, "nested"), { recursive: true });
  await mkdir(join(input, "ignored-directory"), { recursive: true });
  await mkdir(join(input, "previous-output"), { recursive: true });
  await writeFile(
    join(input, ".gitignore"),
    "ignored.md\nignored-directory/\n",
  );
  await writeFile(join(input, "included.md"), "# Included\n");
  await writeFile(join(input, "ignored.md"), "# Ignored\n");
  await writeFile(join(input, "ignored-directory", "hidden.md"), "# Hidden\n");
  await writeFile(join(input, "nested", ".gitignore"), "*.md\n!important.md\n");
  await writeFile(join(input, "nested", "ignored.md"), "# Nested ignored\n");
  await writeFile(join(input, "nested", "important.md"), "# Important\n");
  await writeFile(
    join(input, "previous-output", ".marksites-build.json"),
    "{}",
  );
  await writeFile(
    join(input, "previous-output", "generated.md"),
    "# Generated\n",
  );

  const result = await convertDirectoryDetailed(input, output);

  assert.equal(result.converted, 2);
  assert.match(
    await readFile(join(output, "included.html"), "utf8"),
    /Included/,
  );
  assert.match(
    await readFile(join(output, "nested", "important.html"), "utf8"),
    /Important/,
  );
  for (const path of [
    join(output, "ignored.html"),
    join(output, "ignored-directory", "hidden.html"),
    join(output, "nested", "ignored.html"),
    join(output, "previous-output", "generated.html"),
  ]) {
    await assert.rejects(readFile(path, "utf8"), /ENOENT/);
  }
});
