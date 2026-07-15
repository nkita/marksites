import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { convertFile } from "../dist/cli/directory.js";

test("embeds annotations without allowing script element escape", async () => {
  const root = await mkdtemp(join(tmpdir(), "marksites-annotations-"));
  const input = join(root, "note.md"),
    output = join(root, "note.html");
  await writeFile(input, "# Note\n\nSelected text\n");
  await writeFile(
    join(root, "note.annotations.json"),
    JSON.stringify({
      schemaVersion: 1,
      document: "note.md",
      revision: 1,
      annotations: [
        {
          id: "one",
          selection: {
            exact: "Selected text",
            prefix: "",
            suffix: "",
            headingId: null,
            startOffset: 0,
            endOffset: 13,
          },
          comment: { body: "</script><script>alert(1)</script>", author: null },
          status: "open",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    }),
  );
  await convertFile(input, output);
  assert.equal(
    JSON.parse(await readFile(join(root, ".note.json"), "utf8")).revision,
    1,
  );
  await assert.rejects(
    readFile(join(root, "note.annotations.json"), "utf8"),
    /ENOENT/,
  );
  const html = await readFile(output, "utf8");
  assert.match(html, /\\u003c\/script\\u003e/);
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
  assert.match(html, /Add comment<\/button>/);
  const executableScripts = [
    ...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g),
  ]
    .filter((match) => !/type="application\/json"/.test(match[0]))
    .map((match) => match[1]);
  for (const script of executableScripts) {
    assert.doesNotThrow(() => new Function(script));
  }
});

test("migrates the previous marksites metadata filename", async () => {
  const root = await mkdtemp(join(tmpdir(), "marksites-metadata-"));
  const input = join(root, "guide.md");
  await writeFile(input, "# Guide\n");
  await writeFile(
    join(root, ".guide.marksites.json"),
    JSON.stringify({
      schemaVersion: 1,
      document: "guide.md",
      revision: 2,
      annotations: [],
    }),
  );
  await convertFile(input, join(root, "guide.html"));
  const migrated = JSON.parse(
    await readFile(join(root, ".guide.json"), "utf8"),
  );
  assert.equal(migrated.revision, 2);
  await assert.rejects(
    readFile(join(root, ".guide.marksites.json"), "utf8"),
    /ENOENT/,
  );
});
