import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { markdownToHtml } from "../dist/index.js";

test("renders Markdown as a standalone GitHub-styled document", () => {
  const html = markdownToHtml("# Hello\n\n- one\n- two", { title: "Example" });

  assert.match(html, /^<!doctype html>/);
  assert.match(html, /<html lang="ja">/);
  assert.match(html, /<title>marksites \| Example<\/title>/);
  assert.match(html, /class="markdown-body shortcut-hints-hidden"/);
  assert.match(html, /class="site-header"/);
  assert.match(html, /data-shortcut-hints-toggle[^>]*aria-pressed="false"/);
  assert.match(html, /body\.shortcut-hints-hidden :is\(\.toc-shortcut-hints,\.file-shortcut-hints,\.document-view-shortcut-hint,\.layout-shortcut\)\{display:none\}/);
  assert.match(html, /shortcutParameter='shortcuts'/);
  assert.match(html, /pageUrl\.searchParams\.get\(shortcutParameter\)==='visible'/);
  assert.match(html, /classList\.toggle\('shortcut-hints-hidden',!visible\)/);
  assert.match(html, /if\(shortcuts\)url\.searchParams\.set\(shortcutParameter,'visible'\)/);
  assert.match(html, /class="site-header-brand"/);
  assert.doesNotMatch(html, /class="site-header-document-lead"/);
  assert.match(html, /\.site-header-action\{[^}]*background:transparent;border:0;/);
  assert.match(html, /data-theme-toggle/);
  assert.match(html, /data-language-toggle/);
  assert.match(html, /data-document-preview-toggle/);
  assert.match(html, /data-document-source-toggle/);
  assert.match(html, /class="document-view-shortcut-hint"><span>右へ移動：<kbd>L<\/kbd><\/span><span>左へ移動：<kbd>H<\/kbd>/);
  assert.doesNotMatch(html, /data-document-source-toggle[^>]*>[\s\S]*?<kbd aria-hidden="true">2<\/kbd>/);
  assert.match(html, /<main class="markdown-source-content" aria-label="Markdown原文" hidden><pre><code><span class="markdown-source-line is-heading" id="markdown-source-hello"># Hello<\/span>/);
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

test("keeps selection tools while hiding the disabled comment controls", () => {
  const html = markdownToHtml("# Document\n\nText\n");
  assert.doesNotMatch(html, /data-sidebar-tab="comments"/);
  assert.match(html, /data-selection-action="copy"/);
  assert.match(html, /data-selection-action="replace"/);
  assert.match(html, /data-selection-action="ai"/);
  assert.match(
    html,
    /data-selection-action="copy"[\s\S]*data-selection-action="ai"[\s\S]*data-selection-action="replace"/,
  );
  assert.match(
    html,
    /\.selection-actions \[data-selection-action="comment"\]\{display:none\}/,
  );
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
    "790817230865d19f3a2bc2380da6c514d41d9e81f87d72f87f90e227c156966a",
  );
});

test("embeds escaped Markdown source for offline view switching", () => {
  const markdown = "# Source\n\n<script>alert('x')</script> & value\n";
  const html = markdownToHtml(markdown);

  assert.match(
    html,
    /<main class="markdown-source-content"[^>]*><pre><code><span class="markdown-source-line is-heading" id="markdown-source-source"># Source<\/span><span class="markdown-source-line"><\/span><span class="markdown-source-line is-html">&lt;script&gt;alert\(&#39;x&#39;\)&lt;\/script&gt; &amp; value<\/span><\/code><\/pre><\/main>/,
  );
  assert.match(html, /current\.hidden=!showCurrent/);
  assert.match(html, /intent==='markdown'\|\|intent==='diff'/);
  assert.match(html, /\["プレビューを表示","Show preview"\]/);
  assert.match(html, /counter-increment:markdown-source-line/);
  assert.match(html, /\.markdown-source-content\{[^}]*border:0;border-radius:0;box-shadow:none/);
  assert.match(html, /\.markdown-source-content pre\{[^}]*border:0;border-radius:0/);
  assert.doesNotMatch(html, /data-replacement-menu|replacementButton/);
  assert.match(html, /previewButton\.addEventListener\('click',\(\)=>apply\('current'\)\)/);
  assert.match(html, /views=available\?\['current','markdown','diff'\]:\['current','markdown'\]/);
  assert.match(html, /currentIndex\+\(key==='l'\?1:-1\)/);
  assert.match(html, /\.document-view-shortcut-hint\{order:1;[^}]*margin-left:auto/);
  assert.match(html, /event\.target\.closest\('input,textarea,select,\[contenteditable\]/);
  assert.match(html, /\.document-content\{[^}]*border:1px solid[^}]*overflow:hidden\}/);
  assert.match(html, /\.document-content>\.markdown-content,\.document-content>\.document-diff-content\{margin:0;border:0/);
  assert.match(html, /\.document-content-action\{border-radius:6px\}/);
  assert.match(html, /\.document-content>\.markdown-source-content\{padding-top:0\}/);
  assert.match(html, /\.markdown-source-line::before\{position:sticky;[^}]*left:0;/);
  assert.doesNotMatch(html, /data-document-source-wrap/);
  assert.match(html, /\.markdown-source-content pre\{[^}]*overflow:hidden/);
  assert.match(html, /\.markdown-source-content code\{[^}]*min-width:0[^}]*white-space:normal/);
  assert.match(html, /\.markdown-source-line\{[^}]*padding:0 20px 0 56px[^}]*overflow-wrap:anywhere;scroll-margin-top:96px;white-space:pre-wrap/);
  assert.match(html, /\.markdown-source-line\{padding-right:12px;padding-left:48px;background:linear-gradient\(to right,[^}]*39px 40px,transparent 40px\)/);
  assert.match(html, /\.markdown-source-line::before\{position:sticky;[^}]*margin-left:-56px;margin-right:8px/);
  assert.match(html, /\.markdown-source-content pre::before\{position:sticky;left:47px;[^}]*height:12px;/);
  assert.match(html, /@media\(hover:hover\)\{\.markdown-source-line:hover\{background:linear-gradient\(to right,color-mix\(in srgb,var\(--bgColor-accent-muted,#ddf4ff\) 35%,var\(--bgColor-default,#fff\)\) 0 47px/);
  assert.match(html, /\.markdown-source-line:hover::before\{background:color-mix\(in srgb,var\(--bgColor-accent-muted,#ddf4ff\) 35%,var\(--bgColor-default,#fff\)\)\}/);
  assert.match(html, /@media\(hover:hover\) and \(max-width:600px\)\{\.markdown-source-line:hover\{background:linear-gradient\(to right,[^}]*39px 40px/);
});

test("adds safe Markdown syntax styling to the source view", () => {
  const markdown = [
    "# **Rich** source",
    "",
    "> Quote with [guide](guide.md)",
    "",
    "- [x] task with `code` and ~~old~~ text",
    "",
    "| Name | Value |",
    "| --- | --- |",
    "",
    "```js",
    "const unsafe = '<script>';",
    "```",
    "",
    "[unsafe](javascript:alert(1))",
    "",
    "## Section",
  ].join("\n");
  const html = markdownToHtml(markdown);

  assert.match(html, /class="markdown-source-line is-heading" id="markdown-source-rich-source"># <strong class="markdown-source-strong">\*\*Rich\*\*<\/strong> source/);
  assert.match(html, /class="markdown-source-line is-quote">&gt; Quote with <a class="markdown-source-link" href="guide\.html">\[guide\]\(guide\.md\)<\/a>/);
  assert.match(html, /class="markdown-source-line is-list is-task">- \[x\] task with <span class="markdown-source-code-span">`code`<\/span> and <del class="markdown-source-delete">~~old~~<\/del> text/);
  assert.match(html, /class="markdown-source-line is-table">\| Name \| Value \|/);
  assert.match(html, /class="markdown-source-line is-code-block is-code-fence">```js/);
  assert.match(html, /class="markdown-source-line is-code-block">const unsafe = &#39;&lt;script&gt;&#39;;/);
  assert.match(html, /class="markdown-source-link is-disabled">\[unsafe\]\(javascript:alert\(1\)\)<\/span>/);
  assert.doesNotMatch(html, /class="markdown-source-link" href="javascript:/);
  assert.match(html, /\.markdown-source-line\.is-quote\{[^}]*background:linear-gradient/);
  assert.match(html, /\.markdown-source-line\.is-code-block\{[^}]*background:linear-gradient/);
  assert.match(html, /<span class="markdown-source-line is-heading" id="markdown-source-section">## Section<\/span>/);
  assert.match(html, /document\.body\.dataset\.documentView === 'markdown' \? 'markdown-source-'/);
  assert.match(html, /\['diff', 'markdown'\]\.includes\(document\.body\.dataset\.documentView\)/);
  assert.doesNotMatch(html, /if\(document\.body\.dataset\.documentView==='markdown'\)apply\('current'\)/);
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
