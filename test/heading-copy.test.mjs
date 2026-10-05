import assert from "node:assert/strict";
import test from "node:test";
import { markdownToHtml } from "../dist/index.js";

test("adds hierarchical path copying to preview headings", () => {
  const html = markdownToHtml("# 章\n\n## 節\n\n### 項\n\n## 次の節\n", {
    fileTree: {
      breadcrumbs: [
        { name: "docs" },
        { name: "guide.md", current: true },
      ],
      items: [],
    },
  });

  assert.match(html, /class="markdown-content" data-document-path="docs\/guide\.md"/);
  assert.match(html, /querySelectorAll\('h1,h2,h3,h4,h5,h6'\)/);
  assert.match(html, /while\(ancestors\.length&&ancestors\.at\(-1\)\.level>=level\)ancestors\.pop\(\)/);
  assert.match(html, /path\+'#'\+\[\.\.\.ancestors\.map\(item=>item\.label\),label\]\.join\('>'\)/);
  assert.match(html, /className='heading-action-button heading-copy-button'/);
  assert.match(html, /className='heading-action-button heading-link-button'/);
  assert.match(html, /url\.hash=heading\.id/);
  assert.match(html, /await copy\(url\.href\)/);
  assert.match(html, /見出しURLをコピー/);
  assert.match(html, /heading-link-icon\\" viewBox=\\"0 0 24 24\\"/);
  assert.match(html, /\.heading-action-button svg\{width:14px;height:14px[^}]*\}\.markdown-content \.heading-action-button \.heading-link-icon\{stroke-width:2\.5\}/);
  assert.match(html, /navigator\.clipboard&&window\.isSecureContext/);
  assert.match(html, /document\.execCommand\('copy'\)/);
  assert.match(html, /h6\):hover \.heading-action-button[^}]*opacity:1;visibility:visible/);
  assert.doesNotMatch(html, /<h1 id="章">章<button/);
});
