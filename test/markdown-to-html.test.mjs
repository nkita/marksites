import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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

test("keeps representative standalone HTML byte-compatible", () => {
  const markdown = [
    "# Guide",
    "",
    "## Start",
    "",
    "~~~js",
    "const value = 1;",
    "~~~",
    "",
  ].join("\n");
  const html = markdownToHtml(markdown, {
    title: "Refactor fixture",
    modifiedAt: "2026-07-20T01:02:03.000Z",
    fileTree: {
      breadcrumbs: [
        { name: "docs", href: "index.html" },
        { name: "guide.md", current: true },
      ],
      items: [
        {
          type: "directory",
          name: "docs",
          children: [
            {
              type: "file",
              name: "guide.md",
              href: "guide.html",
              current: true,
              commentCount: 2,
            },
          ],
        },
      ],
    },
  });

  assert.equal(
    createHash("sha256").update(html).digest("hex"),
    "a60a18267102678ed7e775161a883a05d33810dbfec40b2f3b06631f4619724d",
  );
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
