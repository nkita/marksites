import assert from "node:assert/strict";
import test from "node:test";
import { markdownToHtml } from "../dist/index.js";

test("renders Markdown as a standalone GitHub-styled document", () => {
  const html = markdownToHtml("# Hello\n\n- one\n- two", { title: "Example" });

  assert.match(html, /^<!doctype html>/);
  assert.match(html, /<html lang="ja">/);
  assert.match(html, /<title>Example<\/title>/);
  assert.match(html, /class="markdown-body"/);
  assert.match(html, /class="site-header"/);
  assert.doesNotMatch(html, /class="site-header-document"/);
  assert.match(html, /\.site-header-action\{[^}]*background:transparent;border:0;/);
  assert.match(html, /data-theme-toggle/);
  assert.match(html, /data-language-toggle/);
  assert.match(html, /data-language-label>JA<\/span>/);
  assert.match(html, /const languageParameter='lang',themeParameter='theme'/);
  assert.match(html, /body\.markdown-body\[data-theme="dark"\]/);
  assert.match(
    html,
    /body\.markdown-body,body\.markdown-body\.has-file-tree,body\.markdown-body\.has-file-tree\.file-sidebar-collapsed\{padding-top:88px\}/,
  );
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

test("renders an optional Markdown update timestamp", () => {
  const html = markdownToHtml("text", {
    modifiedAt: "2026-07-17T03:00:00.000Z",
  });

  assert.match(
    html,
    /<time class="document-modified" datetime="2026-07-17T03:00:00\.000Z">更新 2026-07-17 03:00:00<\/time>/,
  );
  assert.match(html, /date\.getFullYear\(\)/);
  assert.doesNotMatch(html, /timeZoneName/);
  assert.throws(
    () => markdownToHtml("text", { modifiedAt: "not-a-date" }),
    /Invalid modifiedAt timestamp/,
  );
});
