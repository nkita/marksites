import assert from "node:assert/strict";
import {
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  stat,
  utimes,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { convertDirectoryDetailed } from "../dist/cli/directory.js";
import packageMetadata from "../package.json" with { type: "json" };

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

test("stores one previous Markdown version and embeds its diff", async () => {
  const root = await mkdtemp(join(tmpdir(), "marksites-history-"));
  const input = join(root, "docs"),
    output = join(root, "site"),
    source = join(input, "index.md");
  await mkdir(input);
  await writeFile(source, "# Home\n\nBefore.\n");
  await convertDirectoryDetailed(input, output);
  const firstManifest = JSON.parse(
    await readFile(join(output, ".marksites-build.json"), "utf8"),
  );
  const history = firstManifest.files["index.md"].history;
  assert.match(history, /^\.marksites-history\/[a-f0-9]{64}\.md$/);
  assert.equal(await readFile(join(output, history), "utf8"), "# Home\n\nBefore.\n");

  await writeFile(source, "# Home\n\nAfter.\n");
  await convertDirectoryDetailed(input, output);
  const html = await readFile(join(output, "index.html"), "utf8");
  assert.match(html, /document-diff-delete"><p>Before\.<\/p>/);
  assert.match(html, /document-diff-insert"><p>After\.<\/p>/);
  assert.equal(await readFile(join(output, history), "utf8"), "# Home\n\nAfter.\n");
  const secondManifest = JSON.parse(
    await readFile(join(output, ".marksites-build.json"), "utf8"),
  );
  const previousHistory = secondManifest.files["index.md"].previousHistory;
  assert.match(
    previousHistory,
    /^\.marksites-history\/[a-f0-9]{64}\.previous\.md$/,
  );
  assert.equal(
    await readFile(join(output, previousHistory), "utf8"),
    "# Home\n\nBefore.\n",
  );

  secondManifest.generator.version = "0.0.0-stale";
  await writeFile(
    join(output, ".marksites-build.json"),
    JSON.stringify(secondManifest),
  );
  await convertDirectoryDetailed(input, output);
  const rebuiltHtml = await readFile(join(output, "index.html"), "utf8");
  assert.match(rebuiltHtml, /document-diff-delete"><p>Before\.<\/p>/);
  assert.match(rebuiltHtml, /document-diff-insert"><p>After\.<\/p>/);

  await writeFile(source, "# Home\n\nLatest.\n");
  await convertDirectoryDetailed(input, output);
  const latestHtml = await readFile(join(output, "index.html"), "utf8");
  assert.match(latestHtml, /document-diff-inline-delete">After<\/del>/);
  assert.match(latestHtml, /document-diff-inline-insert">Latest<\/ins>/);
  assert.match(latestHtml, /data-document-diff-version/);
  assert.match(latestHtml, /document-diff-delete"><p>Before\.<\/p>/);
});

test("rebuilds HTML when only the Markdown update time changes", async () => {
  const root = await mkdtemp(join(tmpdir(), "marksites-mtime-"));
  const input = join(root, "docs"),
    output = join(root, "site"),
    source = join(input, "index.md");
  await mkdir(input);
  await writeFile(source, "# Home\n");
  await convertDirectoryDetailed(input, output);

  const modifiedAt = new Date("2026-07-17T03:00:00.000Z");
  await utimes(source, modifiedAt, modifiedAt);
  const result = await convertDirectoryDetailed(input, output);
  const manifest = JSON.parse(
    await readFile(join(output, ".marksites-build.json"), "utf8"),
  );

  assert.equal(result.converted, 1);
  assert.equal(manifest.files["index.md"].modifiedAt, modifiedAt.toISOString());
  assert.match(
    await readFile(join(output, "index.html"), "utf8"),
    /更新 2026-07-17 03:00/,
  );
});

test("preserves an embedded diff while migrating old history on a forced rebuild", async () => {
  const root = await mkdtemp(join(tmpdir(), "marksites-history-migration-"));
  const input = join(root, "docs"),
    output = join(root, "site"),
    source = join(input, "index.md"),
    manifestPath = join(output, ".marksites-build.json");
  await mkdir(input);
  await writeFile(source, "# Home\n\nBefore.\n");
  await convertDirectoryDetailed(input, output);
  await writeFile(source, "# Home\n\nAfter.\n");
  await convertDirectoryDetailed(input, output);

  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  await rm(join(output, manifest.files["index.md"].previousHistory));
  for (const version of manifest.files["index.md"].historyVersions)
    await rm(join(output, version.path));
  delete manifest.files["index.md"].previousHistory;
  delete manifest.files["index.md"].historyVersions;
  manifest.generator.version = "0.0.0-stale";
  await writeFile(manifestPath, JSON.stringify(manifest));

  await convertDirectoryDetailed(input, output);
  const html = await readFile(join(output, "index.html"), "utf8");
  assert.match(html, /document-diff-delete"><p>Before\.<\/p>/);
  assert.match(html, /document-diff-insert"><p>After\.<\/p>/);
  const migrated = JSON.parse(await readFile(manifestPath, "utf8"));
  assert.equal(migrated.files["index.md"].previousHistory, undefined);
});

test("keeps the configured number of past versions for current comparisons", async () => {
  const root = await mkdtemp(join(tmpdir(), "marksites-history-limit-"));
  const input = join(root, "docs"),
    output = join(root, "site"),
    source = join(input, "index.md"),
    manifestPath = join(output, ".marksites-build.json");
  await mkdir(input);
  for (const version of ["A", "B", "C", "D"]) {
    await writeFile(source, `# ${version}\n`);
    await convertDirectoryDetailed(input, output, { historyLimit: 2 });
  }

  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const versions = manifest.files["index.md"].historyVersions;
  assert.equal(manifest.historyLimit, 2);
  assert.equal(versions.length, 3);
  assert.equal(
    await readFile(join(output, versions[0].path), "utf8"),
    "# B\n",
  );
  const html = await readFile(join(output, "index.html"), "utf8");
  assert.equal(
    (/<div data-document-diff-active>([\s\S]*?)<\/div><template/.exec(html)?.[1]
      .match(/<option value=/g) ?? []).length,
    2,
  );
  assert.match(html, /document-diff-inline-delete">B<\/del>/);
  assert.match(html, /document-diff-inline-delete">C<\/del>/);
  assert.doesNotMatch(html, /document-diff-inline-delete">A<\/del>/);
});

test("rebuilds every page when a file-tree update time changes", async () => {
  const root = await mkdtemp(join(tmpdir(), "marksites-tree-mtime-"));
  const input = join(root, "docs"),
    output = join(root, "site"),
    source = join(input, "a.md");
  await mkdir(input);
  await writeFile(source, "# A\n");
  await writeFile(join(input, "b.md"), "# B\n");
  await convertDirectoryDetailed(input, output);

  const modifiedAt = new Date("2026-07-27T20:00:00.000Z");
  await utimes(source, modifiedAt, modifiedAt);
  const result = await convertDirectoryDetailed(input, output);

  assert.equal(result.converted, 2);
  assert.equal(result.skipped, 0);
  for (const outputFile of ["a.html", "b.html"]) {
    const html = await readFile(join(output, outputFile), "utf8");
    assert.match(
      html,
      /data-file-path="a\.md" data-directory="" data-modified-at="2026-07-27T20:00:00\.000Z"/,
    );
  }
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
  assert.equal(manifest.generator.version, packageMetadata.version);
  assert.match(manifest.generator.renderFingerprint, /^sha256:[a-f0-9]{64}$/);
});

test("rebuilds every file when the generator output changes", async () => {
  const root = await mkdtemp(join(tmpdir(), "marksites-generator-change-"));
  const input = join(root, "docs"),
    output = join(root, "site");
  await mkdir(input);
  await writeFile(join(input, "a.md"), "# A\n");
  await writeFile(join(input, "b.md"), "# B\n");
  await convertDirectoryDetailed(input, output);

  const manifestPath = join(output, ".marksites-build.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.generator.renderFingerprint = "sha256:stale-render-output";
  await writeFile(manifestPath, JSON.stringify(manifest));

  const result = await convertDirectoryDetailed(input, output);
  assert.equal(result.converted, 2);
  assert.equal(result.skipped, 0);
});

test("rebuilds every file when the generator version changes", async () => {
  const root = await mkdtemp(join(tmpdir(), "marksites-generator-version-"));
  const input = join(root, "docs"),
    output = join(root, "site");
  await mkdir(input);
  await writeFile(join(input, "a.md"), "# A\n");
  await writeFile(join(input, "b.md"), "# B\n");
  await convertDirectoryDetailed(input, output);

  const manifestPath = join(output, ".marksites-build.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.generator.version = "0.0.0-stale";
  await writeFile(manifestPath, JSON.stringify(manifest));

  const result = await convertDirectoryDetailed(input, output);
  assert.equal(result.converted, 2);
  assert.equal(result.skipped, 0);
});

test("rebuilds every file when the output compatibility version changes", async () => {
  const root = await mkdtemp(join(tmpdir(), "marksites-output-version-"));
  const input = join(root, "docs"), output = join(root, "site");
  await mkdir(input);
  await writeFile(join(input, "a.md"), "# A\n");
  await writeFile(join(input, "b.md"), "# B\n");
  await convertDirectoryDetailed(input, output);

  const manifestPath = join(output, ".marksites-build.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.generator.outputCompatibilityVersion -= 1;
  await writeFile(manifestPath, JSON.stringify(manifest));

  const result = await convertDirectoryDetailed(input, output);
  assert.equal(result.converted, 2);
  assert.equal(result.skipped, 0);
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
