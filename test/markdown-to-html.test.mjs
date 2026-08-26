import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { markdownToHtml } from "../dist/index.js";

test("renders Markdown as a standalone GitHub-styled document", () => {
  const html = markdownToHtml("# Hello\n\n- one\n- two", { title: "Example" });

  assert.match(html, /^<!doctype html>/);
  assert.match(html, /<html lang="ja">/);
  assert.match(html, /<title>marksites \| Example<\/title>/);
  assert.match(html, /class="markdown-body"/);
  assert.match(html, /class="site-header"/);
  assert.match(html, /class="site-header-brand"/);
  assert.doesNotMatch(html, /class="site-header-document-lead"/);
  assert.match(html, /\.site-header-action\{[^}]*background:transparent;border:0;/);
  assert.match(html, /data-theme-toggle/);
  assert.match(html, /data-language-toggle/);
  assert.match(html, /data-document-preview-toggle/);
  assert.match(html, /data-document-source-toggle/);
  assert.match(html, /<main class="markdown-source-content" aria-label="Markdown原文" hidden><pre><code><span class="markdown-source-line"># Hello<\/span>/);
  assert.match(html, /const parameter='document-view'/);
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
    "f8ad229e94376f4814010ecdb2ed9c3f566b7bda7c27b59216d6626d9da31a7f",
  );
});

test("embeds escaped Markdown source for offline view switching", () => {
  const markdown = "# Source\n\n<script>alert('x')</script> & value\n";
  const html = markdownToHtml(markdown);

  assert.match(
    html,
    /<main class="markdown-source-content"[^>]*><pre><code><span class="markdown-source-line"># Source<\/span><span class="markdown-source-line"><\/span><span class="markdown-source-line">&lt;script&gt;alert\(&#39;x&#39;\)&lt;\/script&gt; &amp; value<\/span><\/code><\/pre><\/main>/,
  );
  assert.match(html, /current\.hidden=!showCurrent/);
  assert.match(html, /intent==='markdown'\|\|intent==='diff'/);
  assert.match(html, /document\.body\.dataset\.documentView==='markdown'/);
  assert.match(html, /\.table-of-contents a\[href\^="#"\]/);
  assert.match(html, /\["Previewを表示","Show preview"\]/);
  assert.match(html, /counter-increment:markdown-source-line/);
  assert.match(html, /\.markdown-source-content\{[^}]*border:0;border-radius:0;box-shadow:none/);
  assert.match(html, /\.markdown-source-content pre\{[^}]*border:0;border-radius:0/);
  assert.match(html, /replacementButton\.disabled=!showCurrent/);
  assert.match(html, /previewButton\.addEventListener\('click',\(\)=>apply\('current'\)\)/);
  assert.match(html, /\.document-content\{[^}]*border:1px solid[^}]*overflow:hidden\}/);
  assert.match(html, /\.document-content>\.markdown-content,\.document-content>\.document-diff-content\{margin:0;border:0/);
  assert.match(html, /\.document-replacement-menu\{margin-left:auto\}/);
  assert.match(html, /\.document-content-action\{border-radius:6px\}/);
  assert.match(html, /\.document-content>\.markdown-source-content\{padding-top:0\}/);
  assert.match(html, /\.markdown-source-line::before\{position:sticky;[^}]*left:0;/);
  assert.doesNotMatch(html, /data-document-source-wrap/);
  assert.match(html, /\.markdown-source-content pre::before\{position:sticky;left:47px;[^}]*height:12px;/);
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
    /<time class="document-modified" datetime="2026-07-17T03:00:00\.000Z">更新 2026-07-17 03:00<\/time>/,
  );
  assert.match(
    html,
    /class="file-breadcrumbs"[\s\S]*?<span class="site-header-metadata-separator" aria-hidden="true"><\/span>\s*<div class="document-metadata"><time class="document-modified"/,
  );
  assert.match(html, /date\.getFullYear\(\)/);
  assert.doesNotMatch(html, /pad\(date\.getSeconds\(\)\)/);
  assert.doesNotMatch(html, /timeZoneName/);
  assert.throws(
    () => markdownToHtml("text", { modifiedAt: "not-a-date" }),
    /Invalid modifiedAt timestamp/,
  );
});

test("places the update timestamp beside the file path", () => {
  const html = markdownToHtml("intro\n\n## Details\n\nbody", {
    modifiedAt: "2026-07-17T03:00:00.000Z",
  });

  assert.match(
    html,
    /class="file-breadcrumbs"[\s\S]*?<span class="site-header-metadata-separator" aria-hidden="true"><\/span>\s*<div class="document-metadata"><time class="document-modified"/,
  );
  assert.match(
    html,
    /\.site-header-metadata-separator\{width:1px;height:16px;[^}]*background:var\(--borderColor-default/,
  );
  assert.match(
    html,
    /\.site-header-document-meta \.document-metadata\{display:flex;height:28px;flex:none;align-items:center;margin:0\}/,
  );
  assert.match(
    html,
    /\.site-header-document-meta \.file-tree-popover-toggle\{top:0\}/,
  );
  assert.match(
    html,
    /\.site-header-metadata-separator,\.site-header-document-meta \.document-metadata\{display:none\}/,
  );
  assert.doesNotMatch(
    html,
    /<main class="markdown-content">[\s\S]*?class="document-metadata"/,
  );
});
