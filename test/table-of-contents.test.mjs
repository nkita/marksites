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
  assert.match(html, /href="#document">Document<\/a>/);
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
  assert.match(html, /height:calc\(100vh - 64px\);max-height:calc\(100vh - 64px\)/);
  assert.doesNotMatch(html, /\.toc-panel \{ min-height: 100%; \}/);
  assert.match(html, /class="markdown-content"/);
  assert.doesNotMatch(html, /background: #edf2f7/);
  assert.match(html, /aria-current/);
  assert.match(html, /requestAnimationFrame/);
  assert.match(html, /Math\.ceil\(window\.scrollY \+ window\.innerHeight\) >= document\.documentElement\.scrollHeight - 2/);
  assert.match(html, /if \(atDocumentEnd\) \{[\s\S]*active = available\.at\(-1\)/);
  assert.doesNotMatch(html, /a\[aria-current="location"\]::before/);
  assert.match(
    html,
    /class="toc-children"/,
  );
  assert.match(
    html,
    /\.toc-children > li::before[^}]*border-top: 1px solid/,
  );
  assert.match(html, /\.toc-children > li:last-child::after/);
  assert.doesNotMatch(html, /--toc-level/);
  assert.match(html, /border-radius: 4px/);
  assert.match(html, /\.sidebar-tab\{[^}]*text-align:left/);
  assert.doesNotMatch(html, /\.sidebar-tab\[aria-selected="true"\]::after/);
  assert.match(html, /\.toc-children \{ margin: 0 0 0 17px/);
  assert.match(html, /\.table-of-contents a \{[^}]*text-align: left/);
  assert.match(
    html,
    /a\[aria-current="location"\][^}]*background: var\(--bgColor-accent-muted, #ddf4ff\)/,
  );
  assert.doesNotMatch(
    html,
    /a\[aria-current="location"\][^}]*linear-gradient/,
  );
  assert.match(html, /class="document-sidebar"/);
  assert.match(html, /class="sidebar-tabs" role="tablist"/);
  assert.match(html, /data-sidebar-tab="toc"><span>目次<\/span><span class="toc-shortcut-hints"/);
  assert.match(html, /次へ：<kbd>J<\/kbd>[\s\S]*前へ：<kbd>K<\/kbd>/);
  assert.match(html, /key !== 'j' && key !== 'k'/);
  assert.match(html, /currentIndex \+ \(key === 'j' \? 1 : -1\)/);
  assert.match(html, /const targetIndex = entries\.indexOf\(entry\)/);
  assert.match(html, /if \(targetIndex === 0\) window\.scrollTo\(\{ top: 0 \}\)/);
  assert.match(html, /if \(keyboardIndex === null\) currentIndex =/);
  assert.match(html, /keyboardIndex === null \? null : entries\[keyboardIndex\]/);
  assert.match(html, /const releaseKeyboardNavigation = \(\) => \{ keyboardIndex = null; \}/);
  assert.match(html, /closest\('input, textarea, select, \[contenteditable\]/);
  assert.match(html, /class="panel-toggle-icon"/);
  assert.match(
    html,
    /\.document-sidebar-body\{display:flex;min-height:0;flex:1 1 auto;flex-direction:column;overflow:hidden\}/,
  );
  assert.match(
    html,
    /\.sidebar-panels\{display:flex;min-height:0;flex:1 1 auto;align-items:stretch;overflow:hidden\}/,
  );
  assert.match(html, /\.sidebar-panel\{[^}]*height:100%;min-height:0;overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain/);
  assert.match(html, /let currentLink = null/);
  assert.match(html, /active\.link !== currentLink/);
  assert.match(html, /navigation\.scrollTop \+= activeRect\.top - navigationRect\.top/);
  assert.match(html, /matchMedia\('\(max-width: 900px\)'\)/);
  assert.match(html, /data-layout-menu-toggle/);
  assert.match(html, /data-language-toggle[\s\S]*data-layout-menu-toggle/);
  assert.match(html, /data-layout-menu-toggle data-layout="all-visible"[^>]*>[\s\S]*?class="layout-option-icon" aria-hidden="true"/);
  assert.match(html, /data-layout="left-hidden"/);
  assert.match(html, /data-layout="right-hidden"/);
  assert.match(html, /data-layout="both-hidden"/);
  assert.match(html, /data-layout="all-visible"/);
  assert.match(html, /data-layout="all-visible"[^>]*>[\s\S]*?<kbd class="layout-shortcut" aria-hidden="true">Q<\/kbd>/);
  assert.match(html, /data-layout="both-hidden"[^>]*>[\s\S]*?<kbd class="layout-shortcut" aria-hidden="true">R<\/kbd>/);
  assert.match(html, /const index='qwer'\.indexOf\(event\.key\.toLowerCase\(\)\)/);
  assert.match(html, /\.layout-menu button::before\{width:12px;flex:none;[^}]*content:""/);
  assert.match(html, /\.layout-menu button\[aria-checked="true"\]::before\{content:"✓"\}/);
  assert.match(html, /layoutToggle\.dataset\.layout=current/);
  assert.match(html, /\.layout-menu-toggle \.layout-option-icon\{box-sizing:border-box;width:16px;height:16px/);
  assert.match(html, /\.layout-menu-toggle\[data-layout="both-hidden"\] \.layout-option-icon i:last-child\{opacity:\.18\}/);
  assert.match(
    html,
    /data-layout="all-visible"[^>]*>[\s\S]*すべて表示[\s\S]*data-layout="right-hidden"[^>]*>[\s\S]*左＋本文[\s\S]*data-layout="left-hidden"[^>]*>[\s\S]*本文＋右[\s\S]*data-layout="both-hidden"[^>]*>[\s\S]*本文のみ/,
  );
  assert.match(html, /\["すべて表示","Show all"\]/);
  assert.match(html, /\["本文のみ","Content only"\]/);
  assert.match(html, /body\.document-sidebar-collapsed\{grid-template-columns:minmax\(0,1fr\);grid-template-areas:"content"\}/);
  assert.match(html, /\.document-sidebar\.is-desktop-hidden\{display:none\}/);
  assert.doesNotMatch(html, /is-desktop-preview/);
  assert.match(html, /\.document-sidebar\.is-popup-open\{display:flex\}/);
  assert.match(html, /\.document-sidebar-backdrop\.is-popup-open\{[^}]*position:fixed/);
  assert.doesNotMatch(html, /showPreview|hidePreview/);
  assert.match(html, /event\.key==='Escape'/);
  assert.match(html, /backdrop\?\.addEventListener\('click'/);
  assert.match(html, /activate\(active,false,false\);sync\(\)/);
  assert.match(html, /const tabParameter='sidebar-tab',visibilityParameter='document-sidebar'/);
  assert.match(html, /pageUrl\.searchParams\.get\(tabParameter\)/);
  assert.match(html, /url\.searchParams\.set\(tabParameter,active\)/);
  assert.match(html, /history\.replaceState\(null,'',updateUrl\(new URL\(location\.href\)\)\)/);
  assert.match(html, /url\.searchParams\.set\(visibilityParameter,'closed'\)/);
  assert.match(html, /url\.protocol!==location\.protocol\|\|url\.host!==location\.host\|\|!url\.pathname\.endsWith\('\.html'\)/);
  assert.match(html, /marksites:set-document-sidebar/);
  assert.match(html, /marksites:set-file-sidebar/);
});

test("supports table of contents options", () => {
  const html = markdownToHtml("# Document\n\n## Section\n\n### Detail\n", {
    tableOfContents: { title: "目次", minDepth: 1, maxDepth: 2 },
  });

  assert.match(html, /data-sidebar-tab="toc"><span>目次<\/span>/);
  assert.match(html, /href="#document"/);
  assert.match(html, /href="#section"/);
  assert.doesNotMatch(html, /href="#detail"/);
});

test("can disable the table of contents while retaining heading IDs", () => {
  const html = markdownToHtml("## Section", { tableOfContents: false });

  assert.doesNotMatch(html, /class="table-of-contents sidebar-panel"/);
  assert.doesNotMatch(html, /document\.querySelector\('\.table-of-contents'\)/);
  assert.doesNotMatch(html, /class="site-header-action layout-menu-toggle"/);
  assert.match(html, /<h2 id="section">Section<\/h2>/);
});
