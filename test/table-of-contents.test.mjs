import assert from "node:assert/strict";
import test from "node:test";
import { markdownToHtml } from "../dist/index.js";

test("generates a table of contents with GitHub-style heading IDs", () => {
  const html = markdownToHtml(
    "# Document\n\n## Getting Started\n\n### API & usage\n\n## Getting Started\n",
  );

  assert.match(html, /class="table-of-contents sidebar-panel"/);
  assert.match(html, /href="#getting-started">Getting Started<\/a>/);
  assert.match(html, /href="#api--usage">API &amp; usage<\/a>/);
  assert.match(html, /href="#getting-started-1">Getting Started<\/a>/);
  assert.doesNotMatch(html, /href="#document"/);
  assert.match(html, /<h2 id="getting-started">/);
  assert.match(html, /<h2 id="getting-started-1">/);
  assert.match(html, /grid-template-columns: minmax\(0, 1fr\) 300px/);
  assert.match(html, /grid-template-areas: "content toc"/);
  assert.match(html, /body\.markdown-body/);
  assert.match(html, /padding: 32px 0 0/);
  assert.match(html, /\.markdown-content \{[^}]*margin-bottom: 72px/);
  assert.match(html, /position:sticky/);
  assert.match(html, /top:32px/);
  assert.match(html, /max-height:calc\(100vh - 64px\)/);
  assert.doesNotMatch(html, /\.toc-panel \{ min-height: 100%; \}/);
  assert.match(html, /class="markdown-content"/);
  assert.doesNotMatch(html, /background: #edf2f7/);
  assert.match(html, /aria-current/);
  assert.match(html, /requestAnimationFrame/);
  assert.match(html, /a\[aria-current="location"\]::before/);
  assert.match(html, /border-radius: 0 6px 6px 0/);
  assert.match(html, /class="document-sidebar"/);
  assert.match(html, /class="sidebar-tabs" role="tablist"/);
  assert.match(html, /data-sidebar-tab="toc">目次<\/button>/);
  assert.match(html, /class="panel-toggle-icon"/);
  assert.match(
    html,
    /\.sidebar-toggle\[aria-expanded="false"\] \.panel-toggle-icon/,
  );
  assert.match(
    html,
    /\.document-sidebar-body\{display:flex;min-height:0;flex:0 1 auto;flex-direction:column;overflow:hidden\}/,
  );
  assert.match(
    html,
    /\.sidebar-panels\{display:flex;min-height:0;flex:0 1 auto;align-items:flex-start;overflow:hidden\}/,
  );
  assert.match(html, /\.sidebar-panel\{[^}]*max-height:100%;min-height:0;overflow:auto/);
  assert.match(html, /matchMedia\('\(max-width: 900px\)'\)/);
  assert.match(html, /body\.hidden=!expanded/);
});

test("supports table of contents options", () => {
  const html = markdownToHtml("# Document\n\n## Section\n\n### Detail\n", {
    tableOfContents: { title: "目次", minDepth: 1, maxDepth: 2 },
  });

  assert.match(html, /data-sidebar-tab="toc">目次<\/button>/);
  assert.match(html, /href="#document"/);
  assert.match(html, /href="#section"/);
  assert.doesNotMatch(html, /href="#detail"/);
});

test("can disable the table of contents while retaining heading IDs", () => {
  const html = markdownToHtml("## Section", { tableOfContents: false });

  assert.doesNotMatch(html, /class="table-of-contents sidebar-panel"/);
  assert.doesNotMatch(html, /document\.querySelector\('\.table-of-contents'\)/);
  assert.match(html, /<h2 id="section">Section<\/h2>/);
});
