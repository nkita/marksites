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
  assert.match(html, /url\.searchParams\.set\(parameter,'diff'\)/);
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

test("keeps structural list changes at valid block boundaries", () => {
  const html = renderMarkdown(
    "- first\n- replacement\n- added\n",
    {},
    undefined,
    "- first\n- previous\n",
  );

  assert.match(html, /document-diff-block document-diff-delete/);
  assert.match(html, /document-diff-block document-diff-insert/);
  const diffContent = /<main class="document-diff-content"[^>]*>([\s\S]*?)<\/main>/.exec(html)?.[1];
  assert.ok(diffContent);
  assert.doesNotMatch(diffContent, /document-diff-inline/);
  assert.doesNotMatch(diffContent, /<\/ins><\/li>/);
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
