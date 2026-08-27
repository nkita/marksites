import assert from "node:assert/strict";
import test from "node:test";
import { markdownToHtml } from "../dist/index.js";

test("adds offline column resizing controls when Markdown contains a table", () => {
  const html = markdownToHtml("| Name | Value |\n| --- | ---: |\n| one | 1 |\n");

  assert.match(html, /<table>[\s\S]*<th>Name<\/th>/);
  assert.match(html, /\.table-column-resizer \{[^}]*cursor: col-resize;/);
  assert.match(html, /table\.is-column-resizable \{[^}]*max-width: none;[^}]*overflow: visible;/);
  assert.doesNotMatch(html, /table\.is-column-resizable \{[^}]*min-width: 100%/);
  assert.match(html, /document\.querySelectorAll\('\.markdown-content table'\)/);
  assert.match(html, /className='table-resizable-container'/);
  assert.match(html, /container\.append\(handle\)/);
  assert.match(html, /handle\.style\.left=offset\+'px'/);
  assert.match(html, /handle\.style\.height=table\.offsetHeight\+'px'/);
  assert.match(html, /table\.is-column-resizable \{[^}]*margin-bottom: 0;/);
  assert.doesNotMatch(html, /cell\.append\(handle\)/);
  assert.match(html, /handle\.addEventListener\('pointerdown'/);
  assert.match(html, /handle\.setPointerCapture\(event\.pointerId\)/);
  assert.match(html, /event\.key==='ArrowLeft'/);
  assert.match(html, /const minimum=48/);
});

test("does not embed the table resizer when the document has no table", () => {
  const html = markdownToHtml("# Heading\n\nParagraph\n");

  assert.doesNotMatch(html, /table-column-resizer/);
  assert.doesNotMatch(html, /is-resizing-table-column/);
});
