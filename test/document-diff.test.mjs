import assert from "node:assert/strict";
import test from "node:test";
import { renderMarkdown } from "../dist/markdown-to-html.js";
import { align, similarity } from "../dist/features/document-diff/alignment.js";
import {
  knownFeatureScriptBodies,
  scriptBody,
} from "../dist/features/registry.js";
import { createDocumentDiffFeature } from "../dist/features/document-diff/index.js";

function compare(previous, current) {
  const html = renderMarkdown(current, {}, undefined, previous);
  const content =
    /<main class="document-diff-content"[^>]*>([\s\S]*?)<\/main>/.exec(html)[1];
  const left = [
    ...content.matchAll(
      /<section class="document-diff-cell document-diff-previous[^"]*"[^>]*>([\s\S]*?)<\/section>/g,
    ),
  ]
    .map((m) => m[1])
    .join("");
  const right = [
    ...content.matchAll(
      /<section class="document-diff-cell document-diff-current[^"]*"[^>]*>([\s\S]*?)<\/section>/g,
    ),
  ]
    .map((m) => m[1])
    .join("");
  return { html, content, left, right };
}

test("renders previous and current versions separately with changed words", () => {
  const { html, left, right } = compare(
    "# Guide\n\nPrevious paragraph.\n",
    "# Guide\n\nCurrent paragraph.\n\nAdded paragraph.\n",
  );
  assert.match(left, /document-diff-inline-delete">Previous<\/del>/);
  assert.doesNotMatch(left, /Current|Added/);
  assert.match(right, /document-diff-inline-insert">Current<\/ins>/);
  assert.doesNotMatch(right, /Previous/);
  assert.match(left, /id="diff-old-guide"/);
  assert.match(right, /id="diff-guide"/);
  assert.match(
    html,
    /data-document-preview-toggle[\s\S]*data-document-source-toggle[\s\S]*data-document-diff-toggle/,
  );
  assert.doesNotMatch(
    /<header class="site-header">[\s\S]*?<\/header>/.exec(html)[0],
    /data-document-diff-toggle/,
  );
  assert.match(html, /data-document-diff-toggle[^>]*><span>差分<\/span><kbd aria-hidden="true">3<\/kbd><\/button>/);
  assert.match(html, /\["差分","Diff"\]/);
  assert.doesNotMatch(html, /data-document-diff-icon|data-document-current-icon/);
  assert.doesNotMatch(
    html,
    /text-decoration:line-through|text-decoration-style:double/,
  );
});

test("retains unchanged Japanese text in both columns", () => {
  const { left, right } = compare(
    "共通の文章を古い表現に変更します。",
    "共通の文章を新しい表現に変更します。",
  );
  assert.match(left, /共通の文章を<del[^>]*>古い<\/del>表現に変更します。/);
  assert.match(right, /共通の文章を<ins[^>]*>新しい<\/ins>表現に変更します。/);
});

test("preserves each version's link destination and formatting", () => {
  const { left, right } = compare(
    "Read [old guide](https://old.example/docs).",
    "Read [new guide](https://new.example/docs).",
  );
  assert.match(left, /href="https:\/\/old.example\/docs"/);
  assert.match(right, /href="https:\/\/new.example\/docs"/);
  assert.match(left, /<del[^>]*>old<\/del> guide/);
  assert.match(right, /<ins[^>]*>new<\/ins> guide/);
  assert.doesNotMatch(left, /new.example/);
  assert.doesNotMatch(right, /old.example/);
});

test("aligns inserted items and code lines against empty slots", () => {
  const { left, right } = compare(
    "- first\n- last\n\n```js\nconst value = 'old';\nkeep();\n```",
    "- first\n- added\n- last\n\n```js\nconst value = 'new';\ninserted();\nkeep();\n```",
  );
  assert.match(left, /document-diff-empty/);
  assert.doesNotMatch(left, /added|inserted/);
  assert.match(right, /added/);
  assert.match(right, /inserted\(\);/);
  assert.match(left, /document-diff-inline-delete">old/);
  assert.match(right, /document-diff-inline-insert">new/);
  assert.equal(
    (left.match(/data-diff-line/g) || []).length,
    (right.match(/data-diff-line/g) || []).length,
  );
});

test("aligns table rows and quote paragraphs while retaining structure", () => {
  const old =
    "> Previous quote.\n\n| Name | Value |\n| --- | --- |\n| mode | old |\n| last | unchanged |";
  const current =
    "> Current quote.\n\n| Name | Value |\n| --- | --- |\n| mode | new |\n| added | row |\n| last | unchanged |";
  const { left, right } = compare(old, current);
  assert.match(left, /<blockquote>/);
  assert.match(right, /<table>/);
  assert.match(left, /document-diff-inline-delete">old/);
  assert.match(right, /document-diff-inline-insert">new/);
  assert.doesNotMatch(left, /added/);
  assert.equal(
    (left.match(/data-diff-line/g) || []).length,
    (right.match(/data-diff-line/g) || []).length,
  );
});

test("shows whole additions and deletions on their own side", () => {
  const { left, right, content } = compare(
    "# Guide\n\nRemoved block.\n\nUnchanged.",
    "# Guide\n\nUnchanged.\n\nAdded block.",
  );
  assert.match(left, /document-diff-block document-diff-delete/);
  assert.match(right, /document-diff-block document-diff-insert/);
  assert.doesNotMatch(left, /Added/);
  assert.doesNotMatch(right, /Removed/);
  assert.match(
    content,
    /document-diff-cell document-diff-current document-diff-empty/,
  );
});

test("keeps duplicate heading IDs unique within each version", () => {
  const { content } = compare("# Same\n\n# Same", "# Same\n\n# Same\n\nAdded");
  const ids = [...content.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(ids.length, new Set(ids).size);
  assert.ok(ids.includes("diff-same-1"));
  assert.ok(ids.includes("diff-old-same-1"));
});

test("preserves complex list and quote contents through fallback", () => {
  const old = "- [ ] Task\n  - nested\n\n> ### Quote\n>\n> `old`";
  const { left, right } = compare(
    old,
    old.replace("Task", "New task").replace("old", "new"),
  );
  assert.match(left, /type="checkbox"/);
  assert.match(left, /nested/);
  assert.match(right, /Quote/);
  assert.match(right, /<code>new<\/code>/);
});

test("retains ordered list numbering around alignment placeholders", () => {
  const { left, right } = compare(
    "3. first\n4. last",
    "3. first\n4. inserted\n5. last",
  );
  assert.match(left, /value="3"/);
  assert.match(left, /value="4"/);
  assert.doesNotMatch(left, /value="5"/);
  assert.match(right, /value="5"/);
});

test("keeps table keys paired when descriptions change substantially", () => {
  const { left, right } = compare(
    "| Key | Value |\n| --- | --- |\n| mode | short |",
    "| Key | Value |\n| --- | --- |\n| mode | Completely different and much longer description |",
  );
  assert.doesNotMatch(left + right, /class="document-diff-empty"/);
  assert.match(left, /<td>mode<\/td>/);
  assert.match(right, /<td>mode<\/td>/);
});

test("rewrites changed relative links through conversion options", () => {
  const feature = createDocumentDiffFeature(
    "Read [new guide](new.md)",
    "Read [old guide](old.md)",
    {
      walkTokens(token) {
        if (token.type === "link")
          token.href = token.href.replace(/\.md$/, ".html");
      },
    },
  );
  assert.match(feature.content, /href="old.html"/);
  assert.match(feature.content, /href="new.html"/);
});

test("uses similarity without shifting unchanged anchors and bounds large comparisons", () => {
  assert.deepEqual(
    align(["alpha", "keep"], ["insert", "alpha", "keep"], similarity),
    [
      [undefined, "insert"],
      ["alpha", "alpha"],
      ["keep", "keep"],
    ],
  );
  const pairs = align(Array(501).fill("a"), Array(501).fill("b"), similarity);
  assert.equal(pairs.length, 1002);
});

test("authorizes the offline alignment script and disables absent diffs", () => {
  const feature = createDocumentDiffFeature("new", "old");
  assert.ok(knownFeatureScriptBodies.has(scriptBody(feature.script)));
  for (const previous of [undefined, "# Guide"]) {
    const { html } = compare(previous, "# Guide");
    assert.match(html, /data-document-diff-toggle[^>]*disabled/);
    assert.doesNotMatch(html, /class="document-diff-row"/);
  }
});
