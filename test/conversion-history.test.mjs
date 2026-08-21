import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { readHistory, removeHistory } from "../dist/conversion/history.js";

test("ignores history paths outside the generated history directory", async () => {
  const parent = await mkdtemp(join(tmpdir(), "marksites-history-path-"));
  const output = join(parent, "site");
  const outside = join(parent, "keep.md");
  await writeFile(outside, "keep");

  assert.equal(await readHistory(output, "../keep.md"), undefined);
  await removeHistory(output, "../keep.md");
  assert.equal(await readFile(outside, "utf8"), "keep");
});
