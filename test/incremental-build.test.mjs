import assert from "node:assert/strict";
import {
  mkdir,
  mkdtemp,
  readFile,
  rename,
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
  assert.match(html, /document-diff-inline-delete">Before<\/del>/);
  assert.match(html, /document-diff-inline-insert">After<\/ins>/);
  assert.equal(await readFile(join(output, history), "utf8"), "# Home\n\nAfter.\n");
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

test("rebuilds every file when a file-tree comment count changes", async () => {
  const root = await mkdtemp(join(tmpdir(), "marksites-comment-count-"));
  const input = join(root, "docs"),
    output = join(root, "site");
  await mkdir(input);
  await writeFile(join(input, "a.md"), "# A\n");
  await writeFile(join(input, "b.md"), "# B\n");
  await convertDirectoryDetailed(input, output);

  const metadata = JSON.parse(await readFile(join(output, ".a.json"), "utf8"));
  metadata.revision = 1;
  metadata.annotations.push({
    id: "comment-one",
    selection: {
      exact: "",
      prefix: "",
      suffix: "",
      headingId: null,
      startOffset: 0,
      endOffset: 0,
    },
    comment: { body: "Document comment", author: null },
    status: "open",
    createdAt: "2026-07-16T00:00:00.000Z",
    updatedAt: "2026-07-16T00:00:00.000Z",
  });
  metadata.annotations.push({
    ...metadata.annotations[0],
    id: "comment-archived",
    status: "archived",
  });
  await writeFile(join(output, ".a.json"), JSON.stringify(metadata));

  const result = await convertDirectoryDetailed(input, output);
  assert.equal(result.converted, 2);
  assert.equal(result.skipped, 0);
  for (const outputFile of ["a.html", "b.html"]) {
    const html = await readFile(join(output, outputFile), "utf8");
    assert.match(
      html,
      /data-file-name="a\.md"[^>]*>[\s\S]*?aria-label="コメント1件">1<\/span>/,
    );
    const bLink = /<a[^>]*data-file-name="b\.md"[^>]*>[\s\S]*?<\/a>/.exec(
      html,
    )?.[0];
    assert.ok(bLink);
    assert.doesNotMatch(bLink, /file-tree-comment-count/);
  }

  const archivedMetadata = JSON.parse(
    await readFile(join(output, ".a.json"), "utf8"),
  );
  archivedMetadata.revision = 2;
  archivedMetadata.annotations[0].status = "archived";
  await writeFile(join(output, ".a.json"), JSON.stringify(archivedMetadata));
  const archivedResult = await convertDirectoryDetailed(input, output);
  assert.equal(archivedResult.converted, 2);
  for (const outputFile of ["a.html", "b.html"]) {
    const html = await readFile(join(output, outputFile), "utf8");
    const aLink = /<a[^>]*data-file-name="a\.md"[^>]*>[\s\S]*?<\/a>/.exec(
      html,
    )?.[0];
    assert.ok(aLink);
    assert.doesNotMatch(aLink, /file-tree-comment-count/);
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
