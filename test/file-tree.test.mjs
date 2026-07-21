import assert from "node:assert/strict";
import test from "node:test";
import { markdownToHtml } from "../dist/index.js";

test("renders a GitHub-style file tree with a current page", () => {
  const html = markdownToHtml("# Guide\n\n## Start", {
    modifiedAt: "2026-07-17T03:00:00.000Z",
    fileTree: {
      title: "Documentation",
      breadcrumbs: [
        { name: "docs", href: "../index.html" },
        { name: "guide" },
        { name: "getting-started.md", current: true },
      ],
      items: [
        { type: "file", name: "index.md", href: "../index.html" },
        {
          type: "directory",
          name: "guide",
          children: [
            {
              type: "file",
              name: "getting-started.md",
              href: "getting-started.html",
              current: true,
              commentCount: 3,
            },
          ],
        },
      ],
    },
  });

  assert.match(html, /class="markdown-body has-file-tree"/);
  assert.match(html, /class="file-sidebar" id="file-sidebar"/);
  assert.match(html, /class="file-tree file-tree-sidebar"/);
  assert.match(html, /class="file-tree file-tree-popover"/);
  assert.match(
    html,
    /<summary><svg class="folder-icon"[^>]*>[\s\S]*?<span>guide<\/span><span class="file-tree-comment-count file-tree-directory-comment-count" aria-label="配下のコメント3件">3<\/span><\/summary>/,
  );
  assert.match(
    html,
    /href="getting-started\.html" data-file-name="getting-started\.md" aria-current="page"/,
  );
  assert.match(html, /grid-template-areas: "files content toc"/);
  assert.match(
    html,
    /file-sidebar-collapsed \{[^}]*grid-template-columns: minmax\(0, 1fr\) 300px; grid-template-areas: "content toc"/,
  );
  assert.match(html, /data-sidebar-tab="toc">目次<\/button>/);
  assert.doesNotMatch(html, /data-sidebar-tab="files"/);
  assert.doesNotMatch(html, /data-sidebar-tab="comments"/);
  assert.match(
    html,
    /<main class="markdown-content">[\s\S]*?<div class="file-navigation">[\s\S]*?<nav class="file-tree file-tree-popover"/,
  );
  assert.match(html, /class="file-breadcrumbs"/);
  assert.match(html, /<a href="\.\.\/index\.html">docs<\/a>/);
  assert.match(html, /class="file-tree-popover-toggle" data-file-tree-toggle/);
  assert.match(
    html,
    /class="file-sidebar-open" data-file-sidebar-open[^>]*hidden/,
  );
  assert.match(html, /data-file-sidebar-close/);
  assert.match(
    html,
    /data-file-sidebar-close[^>]*>[\s\S]*?<\/button>\n<aside class="file-sidebar"/,
  );
  assert.match(
    html,
    /<span class="file-breadcrumb-separator" aria-hidden="true">\/<\/span>\n  <button type="button" class="file-tree-popover-toggle"[^>]*><span>getting-started\.md<\/span><svg class="panel-toggle-icon"/,
  );
  assert.doesNotMatch(html, /<span aria-current="page">getting-started\.md<\/span>/);
  assert.match(
    html,
    /data-copy-file-path="docs\/guide\/getting-started\.md" aria-label="ファイルパスをコピー" title="ファイルパスをコピー"><svg class="action-icon copy-icon"[^>]*>[\s\S]*?<\/svg><\/button>/,
  );
  assert.match(html, /navigator\.clipboard && window\.isSecureContext/);
  assert.match(html, /catch \{[\s\S]*?if \(!copied\)/);
  assert.match(html, /document\.execCommand\('copy'\)/);
  assert.doesNotMatch(html, /<span data-copy-label>Copy path<\/span>/);
  assert.match(html, /copyPath\.title = 'コピーしました'/);
  assert.match(html, /class="file-tree-filter-input"/);
  assert.match(html, /id="file-tree-popover"[^>]*hidden/);
  assert.doesNotMatch(html, /class="file-tree-toggle"/);
  assert.doesNotMatch(html, /file-tree-collapse-all/);
  assert.match(html, /\.file-tree-popover \{ position: absolute; z-index: 15/);
  assert.match(
    html,
    /\.file-sidebar \{ grid-area: files; position: fixed; z-index: 45;[^}]*width: 280px;[^}]*border-right: 1px solid/,
  );
  assert.match(html, /class="file-sidebar-toggle-icon"/);
  assert.match(html, /\.file-sidebar-open \{ position: fixed; z-index: 50; top: 13px; left: 12px;[^}]*width: 30px; height: 30px/);
  assert.match(html, /\.file-sidebar-close \{ position: fixed; z-index: 50; top: 13px; left: 12px;[^}]*width: 30px; height: 30px/);
  assert.match(html, /\.file-sidebar-open \{[^}]*background: transparent; border: 0;/);
  assert.match(html, /\.file-sidebar-close \{[^}]*background: transparent; border: 0;/);
  assert.match(html, /body\.markdown-body\.has-file-tree \.site-header\{padding-left:56px\}/);
  assert.match(html, /\.file-tree-popover-toggle \{ position: relative; top: 1px;[^}]*height: 28px;[^}]*gap: 3px;[^}]*color: var\(--fgColor-accent/);
  assert.match(html, /\.file-breadcrumb-separator \{[^}]*line-height: 28px;/);
  assert.match(html, /\.file-tree-popover-toggle \{[^}]*background: transparent;[^}]*border: 0/);
  assert.match(html, /\.copy-file-path \.copy-icon \{ transform: none/);
  assert.match(html, /\.file-sidebar-header \{[^}]*padding: 0 12px;/);
  assert.match(html, /\.file-sidebar\[hidden\], \.file-sidebar-open\[hidden\], \.file-sidebar-close\[hidden\] \{ display: none; \}/);
  assert.match(html, /\.file-breadcrumbs ol \{[^}]*align-items: baseline/);
  assert.match(html, /\.file-breadcrumbs ol \{[^}]*flex: 0 1 auto/);
  assert.match(html, /\.file-breadcrumbs li \{[^}]*height: 28px;[^}]*line-height: 28px/);
  assert.match(html, /\.copy-file-path \{[^}]*background: transparent;[^}]*border: 0/);
  assert.match(html, /<time class="document-modified" datetime="2026-07-17T03:00:00\.000Z">更新 2026-07-17 03:00:00<\/time>/);
  assert.match(html, /event\.preventDefault\(\)/);
  assert.match(html, /const label = open \? 'ファイルを閉じる' : 'ファイルを開く'/);
  assert.match(html, /\.file-tree details \{ margin: 0; \}/);
  assert.match(html, /placeholder="ファイルを検索"/);
  assert.match(html, /data-file-name="getting-started\.md"/);
  assert.match(
    html,
    /class="file-tree-comment-count" aria-label="コメント3件">3<\/span>/,
  );
  assert.match(html, /\.file-tree-directory-comment-count \{ float: right;/);
  assert.match(
    html,
    /\.file-tree details\[open\] > summary > \.file-tree-directory-comment-count \{ display: none; \}/,
  );
  assert.match(html, /dataset\.fileName\.toLocaleLowerCase\(\)/);
  assert.match(html, /name\.includes\(query\)/);
  assert.match(html, /event\.key !== 'Escape'/);
  assert.match(html, /data-folder-id="[A-Za-z0-9_-]{6}"/);
  assert.doesNotMatch(html, /data-tree-path=/);
  assert.doesNotMatch(html, /<details open/);
  assert.match(html, /const stateParameter = 'open'/);
  assert.match(html, /const popoverParameter = 'marksites-files'/);
  assert.match(html, /const sidebarParameter = 'file-sidebar'/);
  assert.match(html, /pageUrl\.searchParams\.get\(popoverParameter\) === 'open'/);
  assert.match(html, /url\.searchParams\.set\(popoverParameter, 'open'\)/);
  assert.match(html, /url\.searchParams\.set\(sidebarParameter, 'closed'\)/);
  assert.doesNotMatch(html, /event\.target\.closest\('a'\)\) setPopoverOpen\(false\)/);
  assert.match(html, /pageUrl\.searchParams\.getAll\(stateParameter\)/);
  assert.match(html, /history\.replaceState\(null, '', updateUrl\(new URL\(location\.href\)\)\)/);
  assert.match(html, /input\.value !== ''/);
  assert.match(html, /event\.key === 'Escape' && !popover\.hidden/);
  assert.match(html, /event\.target\.closest\('\.file-navigation,\.file-sidebar'\)/);
  assert.match(html, /sidebarOpenButton\.hidden = open/);
  assert.match(html, /sidebarCloseButton\.hidden = !open/);
  assert.match(html, /document\.body\.classList\.toggle\('file-sidebar-collapsed'/);
  assert.match(html, /sidebarOpenButton\?\.addEventListener\('click'/);
  assert.match(html, /sidebarCloseButton\?\.addEventListener\('click'/);
  assert.match(html, /details\[data-folder-id=/);
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(
    (match) => match[1],
  );
  for (const script of scripts) {
    assert.doesNotThrow(() => new Function(script));
  }
});

test("does not alter the document shell without file tree options", () => {
  const html = markdownToHtml("# Guide");

  assert.match(html, /<body class="markdown-body">/);
  assert.doesNotMatch(html, /class="file-tree"/);
  assert.doesNotMatch(html, /class="file-sidebar"/);
  assert.doesNotMatch(html, /<body class="markdown-body has-file-tree">/);
  assert.doesNotMatch(html, /file-tree-filter-input/);
  assert.doesNotMatch(html, /file-tree-collapse-all/);
});

test("sums comment counts into ancestor directory badges", () => {
  const html = markdownToHtml("# Guide", {
    fileTree: {
      items: [
        {
          type: "directory",
          name: "docs",
          children: [
            { type: "file", name: "one.md", href: "one.html", commentCount: 2 },
            {
              type: "directory",
              name: "nested",
              children: [
                { type: "file", name: "two.md", href: "two.html", commentCount: 3 },
                { type: "file", name: "empty.md", href: "empty.html", commentCount: 0 },
              ],
            },
          ],
        },
      ],
    },
  });

  assert.match(html, /<span>docs<\/span><span class="file-tree-comment-count file-tree-directory-comment-count" aria-label="配下のコメント5件">5<\/span>/);
  assert.match(html, /<span>nested<\/span><span class="file-tree-comment-count file-tree-directory-comment-count" aria-label="配下のコメント3件">3<\/span>/);
  assert.doesNotMatch(html, /aria-label="コメント0件"/);
  assert.match(
    html,
    /\.file-tree details\[open\] > summary > \.file-tree-directory-comment-count \{ display: none; \}/,
  );
});
