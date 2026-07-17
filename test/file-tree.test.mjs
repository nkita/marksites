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
  assert.match(html, /class="file-tree"/);
  assert.match(
    html,
    /<summary><svg class="folder-icon"[^>]*>[\s\S]*?<span>guide<\/span><\/summary>/,
  );
  assert.match(
    html,
    /href="getting-started\.html" data-file-name="getting-started\.md" aria-current="page"/,
  );
  assert.match(html, /grid-template-areas: "content toc"/);
  assert.match(html, /data-sidebar-tab="toc">Outline<\/button>/);
  assert.doesNotMatch(html, /data-sidebar-tab="files"/);
  assert.doesNotMatch(html, /data-sidebar-tab="comments"/);
  assert.match(
    html,
    /<main class="markdown-content">[\s\S]*?<div class="file-navigation">[\s\S]*?<nav class="file-tree"/,
  );
  assert.match(html, /class="file-breadcrumbs"/);
  assert.match(html, /<a href="\.\.\/index\.html">docs<\/a>/);
  assert.match(html, /class="file-tree-popover-toggle" data-file-tree-toggle/);
  assert.match(html, /<span>Files<\/span><svg class="panel-toggle-icon"/);
  assert.match(html, /<span aria-current="page">getting-started\.md<\/span>/);
  assert.match(
    html,
    /data-copy-file-path="docs\/guide\/getting-started\.md" aria-label="Copy file path" title="Copy file path"><svg class="action-icon copy-icon"[^>]*>[\s\S]*?<\/svg><\/button>/,
  );
  assert.match(html, /navigator\.clipboard && location\.protocol !== 'file:'/);
  assert.match(html, /document\.execCommand\('copy'\)/);
  assert.doesNotMatch(html, /<span data-copy-label>Copy path<\/span>/);
  assert.match(html, /copyPath\.title = 'Copied'/);
  assert.match(html, /class="file-tree-filter-input"/);
  assert.match(html, /id="file-tree-popover"[^>]*hidden/);
  assert.doesNotMatch(html, /class="file-tree-toggle"/);
  assert.doesNotMatch(html, /file-tree-collapse-all/);
  assert.match(html, /\.file-tree \{ position: absolute; z-index: 15/);
  assert.match(html, /\.file-tree-popover-toggle \{[^}]*height: 28px;[^}]*gap: 5px/);
  assert.match(html, /\.file-breadcrumbs ol \{[^}]*align-items: baseline/);
  assert.match(html, /\.file-breadcrumbs ol \{[^}]*flex: 0 1 auto/);
  assert.match(html, /\.file-breadcrumbs li \{[^}]*height: 28px;[^}]*line-height: 28px/);
  assert.match(html, /\.copy-file-path \{[^}]*background: transparent;[^}]*border: 0/);
  assert.match(html, /<time class="document-modified" datetime="2026-07-17T03:00:00\.000Z">Updated 2026-07-17 03:00:00 UTC<\/time>/);
  assert.match(html, /event\.preventDefault\(\)/);
  assert.match(html, /const label = open \? 'Hide files' : 'Show files'/);
  assert.match(html, /\.file-tree details \{ margin: 0; \}/);
  assert.match(html, /placeholder="Filter files"/);
  assert.match(html, /data-file-name="getting-started\.md"/);
  assert.match(
    html,
    /class="file-tree-comment-count" aria-label="3 comments">3<\/span>/,
  );
  assert.match(html, /dataset\.fileName\.toLocaleLowerCase\(\)/);
  assert.match(html, /name\.includes\(query\)/);
  assert.match(html, /event\.key !== 'Escape'/);
  assert.match(html, /data-folder-id="[A-Za-z0-9_-]{6}"/);
  assert.doesNotMatch(html, /data-tree-path=/);
  assert.doesNotMatch(html, /<details open/);
  assert.match(html, /const stateParameter = 'open'/);
  assert.match(html, /const popoverParameter = 'marksites-files'/);
  assert.match(html, /pageUrl\.searchParams\.get\(popoverParameter\) === 'open'/);
  assert.match(html, /url\.searchParams\.set\(popoverParameter, 'open'\)/);
  assert.doesNotMatch(html, /event\.target\.closest\('a'\)\) setPopoverOpen\(false\)/);
  assert.match(html, /pageUrl\.searchParams\.getAll\(stateParameter\)/);
  assert.match(html, /history\.replaceState\(null, '', updateUrl\(new URL\(location\.href\)\)\)/);
  assert.match(html, /input\.value !== ''/);
  assert.match(html, /event\.key === 'Escape' && !tree\.hidden/);
  assert.match(html, /event\.target\.closest\('\.file-navigation'\)/);
});

test("does not alter the document shell without file tree options", () => {
  const html = markdownToHtml("# Guide");

  assert.match(html, /<body class="markdown-body">/);
  assert.doesNotMatch(html, /class="file-tree"/);
  assert.doesNotMatch(html, /has-file-tree/);
  assert.doesNotMatch(html, /file-tree-filter-input/);
  assert.doesNotMatch(html, /file-tree-collapse-all/);
});
