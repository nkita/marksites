import assert from "node:assert/strict";
import test from "node:test";

import { diffBlocks } from "../dist/features/document-diff/blocks.js";

test("diffBlocks preserves matching Markdown blocks", () => {
  assert.deepEqual(diffBlocks("# Title\n\nOld\n", "# Title\n\nNew\n"), [
    { kind: "same", raw: "# Title", tokenType: "heading" },
    { kind: "delete", raw: "Old\n", tokenType: "paragraph" },
    { kind: "insert", raw: "New\n", tokenType: "paragraph" },
  ]);
});

test("diffBlocks ignores trailing whitespace when matching", () => {
  assert.deepEqual(diffBlocks("Paragraph  \n", "Paragraph\n"), [
    { kind: "same", raw: "Paragraph\n", tokenType: "paragraph" },
  ]);
});

test("diffBlocks handles empty documents", () => {
  assert.deepEqual(diffBlocks("", "# Added\n"), [
    { kind: "insert", raw: "# Added\n", tokenType: "heading" },
  ]);
});
