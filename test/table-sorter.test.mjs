import assert from "node:assert/strict";
import test from "node:test";
import { markdownToHtml } from "../dist/index.js";

test("adds stable three-state column sorting to Markdown tables", () => {
  const html = markdownToHtml("| Name | Value |\n| --- | ---: |\n| ten | 10 |\n| two | 2 |\n");

  assert.match(html, /\.table-sort-indicator/);
  assert.match(html, /top: 50%;[^}]*align-items: center;[^}]*justify-content: center;/);
  assert.match(html, /class="table-sort-chevron-up"/);
  assert.match(html, /class="table-sort-chevron-down"/);
  assert.doesNotMatch(html, /indicator\.textContent=/);
  assert.match(html, /new Intl\.Collator\(undefined,\{numeric:true,sensitivity:'base'\}\)/);
  assert.match(html, /header\.setAttribute\('aria-sort'/);
  assert.match(html, /direction===1\?-1:direction===-1\?0:1/);
  assert.match(html, /body\.append\(\.\.\.rows\)/);
  assert.match(html, /order\.get\(left\)-order\.get\(right\)/);
  assert.match(html, /event\.key!=='Enter'&&event\.key!==' '/);
});

test("does not embed table sorting when the document has no table", () => {
  const html = markdownToHtml("Paragraph\n");

  assert.doesNotMatch(html, /table-sort-indicator/);
  assert.doesNotMatch(html, /is-column-sortable/);
});
