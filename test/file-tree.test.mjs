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
              path: "guide/getting-started.md",
              href: "getting-started.html",
              current: true,
              modifiedAt: "2026-07-17T03:00:00.000Z",
              commentCount: 3,
            },
          ],
        },
      ],
    },
  });

  assert.match(html, /class="markdown-body has-file-tree shortcut-hints-hidden"/);
  assert.match(html, /class="file-sidebar" id="file-sidebar"/);
  assert.match(html, /class="file-tree file-tree-sidebar"/);
  assert.match(html, /class="file-shortcut-hints"><span>次へ：<kbd>Shift\+J<\/kbd><\/span><span>前へ：<kbd>Shift\+K<\/kbd>/);
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
  assert.match(html, /data-sidebar-tab="toc"><span>目次<\/span>/);
  assert.doesNotMatch(html, /data-sidebar-tab="files"/);
  assert.doesNotMatch(html, /data-sidebar-tab="comments"/);
  assert.match(
    html,
    /<header class="site-header">[\s\S]*?<div class="site-header-brand">[\s\S]*?<div class="site-header-document-meta">[\s\S]*?<nav class="file-breadcrumbs"[\s\S]*?<nav class="file-tree file-tree-popover"/,
  );
  assert.doesNotMatch(html, /class="site-header-document-lead"/);
  assert.doesNotMatch(html, /<main class="markdown-content">[\s\S]*?class="file-breadcrumbs"/);
  assert.match(html, /<title>marksites \| getting-started\.md<\/title>/);
  assert.match(
    html,
    /<nav class="file-breadcrumbs"[\s\S]*?<span class="site-header-metadata-separator" aria-hidden="true"><\/span>\s*<div class="document-metadata"><time class="document-modified"[\s\S]*?<nav class="file-tree file-tree-popover"/,
  );
  assert.doesNotMatch(
    html,
    /<main class="markdown-content">[\s\S]*?class="document-metadata"/,
  );
  assert.match(html, /class="file-breadcrumbs"/);
  assert.match(html, /<a href="\.\.\/index\.html">docs<\/a>/);
  assert.match(html, /class="file-tree-popover-toggle" data-file-tree-toggle/);
  assert.match(html, /class="site-header-logo">marksites<\/strong>/);
  assert.match(html, /\.site-header-logo\{[^}]*color:#fff;[^}]*background:#24292f;[^}]*border-radius:6px/);
  assert.doesNotMatch(html, /class="file-sidebar-(?:open|close)"/);
  assert.match(html, /class="layout-file-sidebar-control" data-file-sidebar-open hidden/);
  assert.match(html, /class="layout-file-sidebar-control" data-file-sidebar-close hidden/);
  assert.match(html, /data-layout-menu-toggle/);
  assert.match(
    html,
    /<span class="file-breadcrumb-separator" aria-hidden="true">\/<\/span>\n  <button type="button" class="file-tree-popover-toggle"[^>]*><span>getting-started\.md<\/span><svg class="panel-toggle-icon"/,
  );
  assert.doesNotMatch(
    html,
    /<span aria-current="page">getting-started\.md<\/span>/,
  );
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
  assert.match(html, /key !== 'j' && key !== 'k'/);
  assert.match(html, /!event\.shiftKey/);
  assert.match(html, /details\.querySelector\('a\[aria-current="page"\]'\)/);
  assert.match(html, /location\.href = targetUrl\.href/);
  assert.match(html, /targetUrl\.searchParams\.set\(focusParameter, 'current'\)/);
  assert.match(html, /currentFile\.focus\(\{ preventScroll: true \}\)/);
  assert.match(html, /currentFile\.scrollIntoView\(\{ block: 'center' \}\)/);
  assert.match(html, /focusCurrentFile \? containsCurrentFile : openPaths\.has/);
  assert.match(html, /closest\('input, textarea, select, \[contenteditable\]/);
  assert.match(html, /data-file-tree-view="tree" aria-selected="true">ツリー/);
  assert.match(
    html,
    /data-file-tree-view="recent" aria-selected="false" tabindex="-1">更新順/,
  );
  assert.match(
    html,
    /class="file-tree-recent" data-file-tree-panel="recent" role="tabpanel" hidden/,
  );
  assert.match(
    html,
    /data-file-path="guide\/getting-started\.md" data-directory="guide\/" data-modified-at="2026-07-17T03:00:00\.000Z"/,
  );
  assert.match(
    html,
    /<time class="file-tree-recent-time" datetime="2026-07-17T03:00:00\.000Z">03:00<\/time><span class="file-tree-recent-label"><span class="file-tree-name"><span class="file-tree-name-text">getting-started\.md<\/span><\/span>[\s\S]*?<span class="file-tree-directory-tooltip" aria-hidden="true"><span class="file-tree-directory-tooltip-path"><svg class="folder-icon"[\s\S]*?<span>\/guide\/<\/span><\/span><\/span>/,
  );
  assert.doesNotMatch(html, /class="file-tree-directory-path"/);
  assert.match(html, /\.file-tree-recent-label \{ display: flex;/);
  assert.match(
    html,
    /\.file-tree-recent \{ position: relative; isolation: isolate; \}/,
  );
  assert.match(html, /\.file-tree-recent::before \{[^}]*z-index: -1;/);
  assert.doesNotMatch(html, /\.file-tree-date::before/);
  assert.match(html, /\.file-tree-recent-label \.file-tree-name \{ position: relative; top: -1px;[^}]*font-weight: 400;/);
  assert.match(html, /\.file-tree-recent-file a:hover \.file-tree-name \{ text-decoration: underline;/);
  assert.match(html, /data-recent-date-toggle aria-expanded="true"/);
  assert.match(html, /aria-label="ファイル1件">1<\/span><\/button>/);
  assert.match(html, /\.file-tree-recent-time \{ width: 32px;[^}]*font-variant-numeric: tabular-nums; text-align: right;/);
  assert.match(html, /const openRecentDates = new Set\(\)/);
  assert.match(html, /if \(latestRecentDate\) openRecentDates\.add\(latestRecentDate\)/);
  assert.match(html, /a\[aria-current="page"\]/);
  assert.match(html, /applyRecentDateState\(query !== ''\)/);
  assert.match(
    html,
    /a:hover \.file-tree-directory-tooltip[^}]*\{ display: flex;/,
  );
  assert.match(html, /\.file-tree-directory-tooltip::before \{[^}]*rotate\(45deg\)/);
  assert.match(html, /\.file-tree-directory-tooltip \{ position: fixed; z-index: 100;/);
  assert.match(html, /background: var\(--bgColor-default, #fff\); border: 1px solid/);
  assert.doesNotMatch(html, /tooltipTime/);
  assert.match(html, /rowTime\.textContent = pad\(date\.getHours\(\)\)\+'\:'\+pad\(date\.getMinutes\(\)\)/);
  assert.match(html, /\.file-tree-recent::before \{[^}]*top: 0; bottom: 0; left: 12px; width: 1px;/);
  assert.match(html, /\.file-tree-date \{[^}]*z-index: 1;[^}]*background: var\(--bgColor-default/);
  assert.doesNotMatch(html, /\.file-tree-date \{[^}]*box-shadow/);
  assert.match(html, /\.file-tree-recent-file \{ position: relative; margin-left: 22px; \}/);
  assert.match(html, /\.file-tree-recent-file a \{[^}]*margin-top: 0; margin-bottom: 0;[^}]*align-items: center;/);
  assert.match(html, /\.file-tree-recent-file \.file-tree-comment-count \{ margin-top: 0; \}/);
  assert.match(html, /querySelector\('\.file-tree-name-text'\)/);
  assert.match(html, /closest\('\.file-tree-recent'\)/);
  assert.match(html, /name\.getBoundingClientRect\(\)/);
  assert.match(html, /recent\.getBoundingClientRect\(\)/);
  assert.match(html, /recentRect\.right \+ 8/);
  assert.doesNotMatch(html, /nameRect\.right \+ 8/);
  assert.match(html, /innerWidth - tooltip\.offsetWidth - 8/);
  assert.match(html, /id="file-tree-popover"[^>]*hidden/);
  assert.doesNotMatch(html, /class="file-tree-toggle"/);
  assert.doesNotMatch(html, /file-tree-collapse-all/);
  assert.match(html, /\.file-tree-popover \{ position: absolute; z-index: 15/);
  assert.match(
    html,
    /\.file-sidebar \{ grid-area: files; position: fixed; z-index: 45;[^}]*width: 280px;[^}]*border-right: 1px solid/,
  );
  assert.doesNotMatch(html, /class="file-sidebar-toggle-icon"/);
  assert.doesNotMatch(html, /\.file-sidebar-(?:open|close) \{/);
  assert.match(
    html,
    /body\.markdown-body\.has-file-tree \.site-header\{padding-left:16px\}/,
  );
  assert.match(
    html,
    /\.file-tree-popover-toggle \{ position: relative; top: 1px;[^}]*height: 28px;[^}]*gap: 3px;[^}]*color: var\(--fgColor-accent/,
  );
  assert.match(html, /\.file-breadcrumb-separator \{[^}]*line-height: 28px;/);
  assert.match(
    html,
    /\.file-tree-popover-toggle \{[^}]*background: transparent;[^}]*border: 0/,
  );
  assert.match(html, /\.copy-file-path \.copy-icon \{ transform: none/);
  assert.match(html, /\.file-sidebar-header \{[^}]*padding: 0 12px;/);
  assert.match(
    html,
    /\.file-sidebar\[hidden\], \.layout-file-sidebar-control \{ display: none; \}/,
  );
  assert.match(html, /\.file-breadcrumbs ol \{[^}]*align-items: baseline/);
  assert.match(html, /\.file-breadcrumbs ol \{[^}]*flex: 0 1 auto/);
  assert.match(
    html,
    /\.file-breadcrumbs li \{[^}]*height: 28px;[^}]*line-height: 28px/,
  );
  assert.match(
    html,
    /\.copy-file-path \{[^}]*background: transparent;[^}]*border: 0/,
  );
  assert.match(
    html,
    /<time class="document-modified" datetime="2026-07-17T03:00:00\.000Z">更新 2026-07-17 03:00<\/time>/,
  );
  assert.match(html, /event\.preventDefault\(\)/);
  assert.match(
    html,
    /const label = open \? 'ファイルを閉じる' : 'ファイルを開く'/,
  );
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
  assert.match(html, /const viewParameter = 'file-view'/);
  assert.match(html, /url\.searchParams\.set\(viewParameter, 'recent'\)/);
  assert.match(html, /const rebuildRecentGroups/);
  assert.match(
    html,
    /file\.dataset\.filePath\.toLocaleLowerCase\(\)\.includes\(query\)/,
  );
  assert.match(
    html,
    /pageUrl\.searchParams\.get\(popoverParameter\) === 'open'/,
  );
  assert.match(html, /url\.searchParams\.set\(popoverParameter, 'open'\)/);
  assert.match(html, /url\.searchParams\.set\(sidebarParameter, 'closed'\)/);
  assert.doesNotMatch(
    html,
    /event\.target\.closest\('a'\)\) setPopoverOpen\(false\)/,
  );
  assert.match(html, /pageUrl\.searchParams\.getAll\(stateParameter\)/);
  assert.match(
    html,
    /history\.replaceState\(null, '', updateUrl\(new URL\(location\.href\)\)\)/,
  );
  assert.match(html, /input\.value !== ''/);
  assert.match(html, /event\.key === 'Escape' && !popover\.hidden/);
  assert.match(
    html,
    /event\.target\.closest\('\.site-header-document-meta,\.file-sidebar'\)/,
  );
  assert.match(html, /sidebarOpenButton\.hidden = open/);
  assert.match(html, /sidebarCloseButton\.hidden = !open/);
  assert.match(html, /popoverToggle\.disabled = open/);
  assert.match(html, /if \(open && !popover\.hidden\) setPopoverOpen\(false, false, false\)/);
  assert.match(
    html,
    /document\.body\.classList\.toggle\('file-sidebar-collapsed'/,
  );
  assert.match(html, /sidebarOpenButton\?\.addEventListener\('click'/);
  assert.match(html, /sidebarCloseButton\?\.addEventListener\('click'/);
  assert.match(html, /marksites:set-file-sidebar/);
  assert.match(html, /details\[data-folder-id=/);
  const scripts = [
    ...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g),
  ]
    .filter((match) => !/type="application\/json"/.test(match[0]))
    .map((match) => match[1]);
  for (const script of scripts) {
    assert.doesNotThrow(() => new Function(script));
  }
});

test("sorts recent files by update time and escapes their paths", () => {
  const html = markdownToHtml("# Guide", {
    fileTree: {
      items: [
        {
          type: "file",
          name: "older.md",
          path: "docs/older.md",
          href: "older.html",
          modifiedAt: "2026-07-26T19:00:00.000Z",
        },
        {
          type: "file",
          name: "newer.md",
          path: "src/<newer>.md",
          href: "newer.html",
          modifiedAt: "2026-07-27T20:00:00.000Z",
        },
      ],
    },
  });

  assert.ok(
    html.indexOf("src/&lt;newer&gt;.md") < html.indexOf("docs/older.md"),
  );
  assert.match(
    html,
    /<span class="file-tree-name"><span class="file-tree-name-text">newer\.md<\/span><\/span>[\s\S]*?<span class="file-tree-directory-tooltip" aria-hidden="true"><span class="file-tree-directory-tooltip-path"><svg class="folder-icon"[\s\S]*?<span>\/src\/<\/span>/,
  );
  assert.match(html, /2026年7月27日/);
  assert.match(html, /2026年7月26日/);
  assert.doesNotMatch(html, /data-file-path="src\/<newer>/);
  assert.throws(
    () =>
      markdownToHtml("# Guide", {
        fileTree: {
          items: [
            {
              type: "file",
              name: "invalid.md",
              href: "invalid.html",
              modifiedAt: "not-a-date",
            },
          ],
        },
      }),
    /Invalid file tree modifiedAt timestamp/,
  );
});

test("groups only consecutive recent files from the same directory", () => {
  const html = markdownToHtml("# Guide", {
    fileTree: {
      items: [
        {
          type: "file",
          name: "one.md",
          path: "src/one.md",
          href: "one.html",
          modifiedAt: "2026-07-27T20:00:00.000Z",
        },
        {
          type: "file",
          name: "two.md",
          path: "src/two.md",
          href: "two.html",
          modifiedAt: "2026-07-27T19:00:00.000Z",
        },
        {
          type: "file",
          name: "guide.md",
          path: "docs/guide.md",
          href: "guide.html",
          modifiedAt: "2026-07-27T18:00:00.000Z",
        },
        {
          type: "file",
          name: "three.md",
          path: "src/three.md",
          href: "three.html",
          modifiedAt: "2026-07-27T17:00:00.000Z",
        },
        {
          type: "file",
          name: "root-one.md",
          path: "root-one.md",
          href: "root-one.html",
          modifiedAt: "2026-07-27T16:00:00.000Z",
        },
        {
          type: "file",
          name: "root-two.md",
          path: "root-two.md",
          href: "root-two.html",
          modifiedAt: "2026-07-27T15:00:00.000Z",
        },
      ],
    },
  });

  assert.match(
    html,
    /class="file-tree-directory-group" data-recent-group="recent-0" aria-hidden="true"[\s\S]*?<span>\/src\/<\/span>/,
  );
  assert.equal((html.match(/class="file-tree-directory-group"/g) ?? []).length, 4);
  assert.match(
    html,
    /class="file-tree-recent-file is-grouped" data-file-path="src\/one\.md"[^>]*data-recent-group="recent-0"/,
  );
  assert.match(
    html,
    /class="file-tree-recent-file" data-file-path="src\/three\.md"[^>]*>[\s\S]*?class="file-tree-directory-tooltip" aria-hidden="true"[\s\S]*?<span>\/src\/<\/span>/,
  );
  assert.match(
    html,
    /class="file-tree-directory-group" data-recent-group="recent-1" aria-hidden="true"[\s\S]*?<span>\/<\/span>/,
  );
  assert.match(html, /\.file-tree-directory-group \{ display: none; \}/);
  assert.match(html, /candidate\.dataset\.directory !== first\.dataset\.directory/);
  assert.match(html, /file\.classList\.add\('is-grouped'\)/);
});

test("does not alter the document shell without file tree options", () => {
  const html = markdownToHtml("# Guide");

  assert.match(html, /<body class="markdown-body shortcut-hints-hidden">/);
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
                {
                  type: "file",
                  name: "two.md",
                  href: "two.html",
                  commentCount: 3,
                },
                {
                  type: "file",
                  name: "empty.md",
                  href: "empty.html",
                  commentCount: 0,
                },
              ],
            },
          ],
        },
      ],
    },
  });

  assert.match(
    html,
    /<span>docs<\/span><span class="file-tree-comment-count file-tree-directory-comment-count" aria-label="配下のコメント5件">5<\/span>/,
  );
  assert.match(
    html,
    /<span>nested<\/span><span class="file-tree-comment-count file-tree-directory-comment-count" aria-label="配下のコメント3件">3<\/span>/,
  );
  assert.doesNotMatch(html, /aria-label="コメント0件"/);
  assert.match(
    html,
    /\.file-tree details\[open\] > summary > \.file-tree-directory-comment-count \{ display: none; \}/,
  );
});
