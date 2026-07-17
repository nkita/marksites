import assert from "node:assert/strict";
import test from "node:test";
import { markdownToHtml } from "../dist/index.js";

test("highlights fenced code with a supported language", () => {
  const html = markdownToHtml("```javascript\nconst answer = 42;\n```\n");

  assert.match(html, /class="hljs language-javascript"/);
  assert.match(html, /hljs-keyword/);
  assert.match(html, /hljs-number/);
  assert.match(html, /data-code-action="copy"/);
  assert.match(html, /data-code-action="copy"[^>]*>[\s\S]*?class="action-icon copy-icon"/);
  assert.match(html, /data-code-action="wrap"[^>]*>[\s\S]*?class="action-icon wrap-icon"/);
  assert.match(html, /data-code-action="wrap"/);
  assert.match(html, /navigator\.clipboard/);
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
  assert.match(html, /data-code-action="copy"/);
});

test("omits code block controls when the document has no code blocks", () => {
  const html = markdownToHtml("# Document\n\nPlain text.");

  assert.doesNotMatch(html, /data-code-action/);
  assert.doesNotMatch(html, /navigator\.clipboard/);
});
