import assert from "node:assert/strict";
import test from "node:test";
import { renderMarkdown } from "../dist/markdown-to-html.js";

test("renders block changes and places the toggle before the theme control", () => {
  const html = renderMarkdown(
    "# Guide\n\nCurrent paragraph.\n\nAdded paragraph.\n",
    {},
    undefined,
    "# Guide\n\nPrevious paragraph.\n",
  );

  assert.match(
    html,
    /data-document-diff-toggle[\s\S]*?data-theme-toggle/,
  );
  assert.match(html, /document-diff-inline-delete">Previous<\/del>/);
  assert.match(html, /document-diff-inline-insert">Current<\/ins>/);
  assert.match(html, /<\/ins> paragraph\.<\/p>/);
  assert.match(html, /<p>Added paragraph\.<\/p>/);
  assert.match(html, /<h1 id="diff-guide">Guide<\/h1>/);
  assert.match(html, /const parameter='document-view'/);
  assert.match(html, /url\.searchParams\.set\(parameter,intent\)/);
  assert.match(html, /pathname\.endsWith\('\.html'\)/);
  assert.doesNotMatch(html, /data-document-view="diff"\] \.document-sidebar/);
});

test("highlights only changed words in a corresponding paragraph", () => {
  const html = renderMarkdown(
    "共通の文章を新しい表現に変更します。\n",
    {},
    undefined,
    "共通の文章を古い表現に変更します。\n",
  );

  assert.match(html, /共通の文章を<del class="document-diff-inline-delete">古い<\/del><ins class="document-diff-inline-insert">新しい<\/ins>表現に変更します。/);
  assert.doesNotMatch(html, /class="document-diff-block/);
});

test("keeps links interactive while showing label and destination changes", () => {
  const html = renderMarkdown(
    "Read [new guide](https://new.example/docs).\n",
    {},
    undefined,
    "Read [old guide](https://old.example/docs).\n",
  );

  assert.match(html, /<a href="https:\/\/new\.example\/docs"><del[^>]*>old<\/del><ins[^>]*>new<\/ins> guide<\/a>/);
  assert.match(html, /aria-label="リンク先の変更"/);
  assert.match(html, /https:\/\/old\.example\/docs<\/del>/);
  assert.match(html, /https:\/\/new\.example\/docs<\/ins>/);
  const diffContent = /<main class="document-diff-content"[^>]*>([\s\S]*?)<\/main>/.exec(html)?.[1];
  assert.ok(diffContent);
  assert.doesNotMatch(diffContent, /\[new guide\]\(https:\/\/new\.example\/docs\)/);
});

test("renders whole added and deleted links as inline elements", () => {
  const added = renderMarkdown(
    "Before [guide](https://example.com)\n",
    {},
    undefined,
    "Before \n",
  );
  const deleted = renderMarkdown(
    "Before \n",
    {},
    undefined,
    "Before [guide](https://example.com)\n",
  );

  assert.match(added, /<ins[^>]*><a href="https:\/\/example\.com">guide<\/a><\/ins>/);
  assert.match(deleted, /<del[^>]*><a href="https:\/\/example\.com"[^>]*aria-disabled="true"[^>]*>guide<\/a><\/del>/);
});

test("renders list item changes without breaking list boundaries", () => {
  const html = renderMarkdown(
    "- first\n- replacement\n- added\n",
    {},
    undefined,
    "- first\n- previous\n",
  );

  const diffContent = /<main class="document-diff-content"[^>]*>([\s\S]*?)<\/main>/.exec(html)?.[1];
  assert.ok(diffContent);
  assert.match(diffContent, /<li>first<\/li>/);
  assert.match(diffContent, /document-diff-inline-delete">previous<\/del>/);
  assert.match(diffContent, /document-diff-inline-insert">replacement<\/ins>/);
  assert.match(diffContent, /document-diff-structural-insert">added<\/li>/);
});

test("renders fine-grained heading, quote, table, and code changes", () => {
  const previous = [
    "## Old heading",
    "",
    "> Previous quote.",
    "",
    "| Name | Value |",
    "| --- | --- |",
    "| mode | old |",
    "",
    "```js",
    "const value = 'old';",
    "keep();",
    "```",
    "",
  ].join("\n");
  const current = previous
    .replace("Old heading", "New heading")
    .replace("Previous quote", "Current quote")
    .replace("| mode | old |", "| mode | new |")
    .replace(
      "const value = 'old';",
      "const value = 'new';\ninserted();",
    );
  const html = renderMarkdown(current, {}, undefined, previous);
  const diffContent = /<main class="document-diff-content"[^>]*>([\s\S]*?)<\/main>/.exec(html)?.[1];

  assert.ok(diffContent);
  assert.match(diffContent, /<h2 id="diff-new-heading">[\s\S]*document-diff-inline-delete">Old/);
  assert.match(diffContent, /<blockquote>[\s\S]*document-diff-inline-insert">Current/);
  assert.match(diffContent, /<td>[\s\S]*document-diff-inline-delete">old/);
  assert.match(diffContent, /class="document-diff-code"[\s\S]*document-diff-inline-insert">new/);
  assert.match(diffContent, /document-diff-structural-insert">inserted\(\);/);
  assert.match(diffContent, /<span>keep\(\);<\/span>/);
});

test("keeps completely added and deleted content at block level", () => {
  const html = renderMarkdown(
    "# Guide\n\nUnchanged.\n\nEntirely new block.\n",
    {},
    undefined,
    "# Guide\n\nEntirely removed block.\n\nUnchanged.\n",
  );

  assert.match(html, /document-diff-block document-diff-delete/);
  assert.match(html, /document-diff-block document-diff-insert/);
});

test("disables the toggle when no previous visible content changed", () => {
  const initial = renderMarkdown("# Guide\n");
  const unchanged = renderMarkdown(
    "# Guide\n",
    {},
    undefined,
    "# Guide\n",
  );

  for (const html of [initial, unchanged]) {
    assert.match(
      html,
      /data-document-diff-toggle[^>]*aria-label="前回からの変更はありません"[^>]*disabled/,
    );
    assert.doesNotMatch(html, /class="document-diff-block/);
  }
});
