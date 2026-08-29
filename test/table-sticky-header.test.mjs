import assert from "node:assert/strict";
import test from "node:test";
import { markdownToHtml } from "../dist/index.js";

test("adds a page-sticky header synchronized with interactive tables", () => {
  const html = markdownToHtml("| Name | Value |\n| --- | ---: |\n| one | 1 |\n");

  assert.match(html, /\.table-sticky-header \{[^}]*position: fixed;[^}]*top: 56px;/);
  assert.match(html, /floating\.setAttribute\('aria-hidden','true'\)/);
  assert.match(html, /headRect\.top<top&&tableRect\.bottom>top\+headRect\.height/);
  assert.match(html, /floatingTable\.style\.transform='translateX\(-'\+scrollHost\.scrollLeft\+'px\)'/);
  assert.match(html, /floating\.style\.width=Math\.min\(hostRect\.width,tableWidth\)\+'px'/);
  assert.doesNotMatch(html, /floating\.style\.width=hostRect\.width\+'px'/);
  assert.match(html, /new ResizeObserver\(update\)/);
  assert.match(html, /headers\[index\]\?\.click\(\)/);
  assert.match(html, /getAttribute\('aria-sort'\)/);
});

test("does not embed a sticky table header when the document has no table", () => {
  const html = markdownToHtml("Paragraph\n");

  assert.doesNotMatch(html, /table-sticky-header/);
  assert.doesNotMatch(html, /new ResizeObserver\(update\)/);
});
