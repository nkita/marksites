import assert from "node:assert/strict";
import test from "node:test";
import { markdownToHtml } from "../dist/index.js";

test("renders Markdown as a standalone GitHub-styled document", () => {
  const html = markdownToHtml("# Hello\n\n- one\n- two", { title: "Example" });

  assert.match(html, /^<!doctype html>/);
  assert.match(html, /<title>Example<\/title>/);
  assert.match(html, /class="markdown-body"/);
  assert.match(html, /<h1 id="hello">Hello<\/h1>/);
  assert.match(html, /<li>one<\/li>/);
  assert.match(html, /\.markdown-body/);
});

test("escapes document metadata", () => {
  const html = markdownToHtml("text", {
    title: "<script>alert(1)</script>",
    language: 'en"><script>',
  });

  assert.doesNotMatch(html, /<title><script>/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /lang="en&quot;&gt;&lt;script&gt;"/);
});

test("highlights fenced code with a supported language", () => {
  const html = markdownToHtml("```javascript\nconst answer = 42;\n```\n");

  assert.match(html, /class="hljs language-javascript"/);
  assert.match(html, /hljs-keyword/);
  assert.match(html, /hljs-number/);
});

test("safely renders unsupported languages as plain code", () => {
  const html = markdownToHtml("```unknown\n<script>alert(1)</script>\n```\n");

  assert.doesNotMatch(html, /class="hljs/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});

test("can disable syntax highlighting and its theme", () => {
  const html = markdownToHtml("```javascript\nconst answer = 42;\n```\n", {
    highlight: false,
  });

  assert.doesNotMatch(html, /class="hljs/);
  assert.doesNotMatch(html, /\.hljs-keyword/);
  assert.match(html, /class="language-javascript"/);
});

test("generates a table of contents with GitHub-style heading IDs", () => {
  const html = markdownToHtml(
    "# Document\n\n## Getting Started\n\n### API & usage\n\n## Getting Started\n",
  );

  assert.match(html, /class="table-of-contents"/);
  assert.match(html, /href="#getting-started">Getting Started<\/a>/);
  assert.match(html, /href="#api--usage">API &amp; usage<\/a>/);
  assert.match(html, /href="#getting-started-1">Getting Started<\/a>/);
  assert.doesNotMatch(html, /href="#document"/);
  assert.match(html, /<h2 id="getting-started">/);
  assert.match(html, /<h2 id="getting-started-1">/);
  assert.match(html, /grid-template-columns: minmax\(0, 1fr\) 300px/);
  assert.match(html, /grid-template-areas: "content toc"/);
  assert.match(html, /body\.markdown-body/);
  assert.match(html, /position: sticky/);
  assert.match(html, /class="markdown-content"/);
  assert.doesNotMatch(html, /background: #edf2f7/);
  assert.match(html, /aria-current/);
  assert.match(html, /requestAnimationFrame/);
  assert.match(html, /a\[aria-current="location"\]::before/);
  assert.match(html, /border-radius: 0 6px 6px 0/);
});

test("supports table of contents options", () => {
  const html = markdownToHtml("# Document\n\n## Section\n\n### Detail\n", {
    tableOfContents: { title: "目次", minDepth: 1, maxDepth: 2 },
  });

  assert.match(html, /<h2>目次<\/h2>/);
  assert.match(html, /href="#document"/);
  assert.match(html, /href="#section"/);
  assert.doesNotMatch(html, /href="#detail"/);
});

test("can disable the table of contents while retaining heading IDs", () => {
  const html = markdownToHtml("## Section", { tableOfContents: false });

  assert.doesNotMatch(html, /class="table-of-contents"/);
  assert.doesNotMatch(html, /document\.querySelector\('\.table-of-contents'\)/);
  assert.match(html, /<h2 id="section">Section<\/h2>/);
});
