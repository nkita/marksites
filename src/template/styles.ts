import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export const githubMarkdownCss = readFileSync(
  require.resolve("github-markdown-css/github-markdown.css"),
  "utf8",
);

export const highlightCss = readFileSync(
  require.resolve("highlight.js/styles/github.css"),
  "utf8",
);

export const highlightThemeStyles = `body[data-theme="dark"] .hljs{color:var(--codeBlock-fgColor);background:var(--codeBlock-bgColor)}
body[data-theme="dark"] :is(.hljs-doctag,.hljs-keyword,.hljs-meta .hljs-keyword,.hljs-template-tag,.hljs-template-variable,.hljs-type,.hljs-variable.language_){color:var(--color-prettylights-syntax-keyword)}
body[data-theme="dark"] :is(.hljs-title,.hljs-title.class_,.hljs-title.function_){color:var(--color-prettylights-syntax-entity)}
body[data-theme="dark"] :is(.hljs-attr,.hljs-attribute,.hljs-literal,.hljs-meta,.hljs-number,.hljs-operator,.hljs-variable,.hljs-selector-attr,.hljs-selector-class,.hljs-selector-id){color:var(--color-prettylights-syntax-constant)}
body[data-theme="dark"] :is(.hljs-regexp,.hljs-string,.hljs-meta .hljs-string){color:var(--color-prettylights-syntax-string)}
body[data-theme="dark"] :is(.hljs-built_in,.hljs-symbol){color:var(--color-prettylights-syntax-variable)}
body[data-theme="dark"] :is(.hljs-comment,.hljs-code,.hljs-formula){color:var(--color-prettylights-syntax-comment)}
body[data-theme="dark"] :is(.hljs-name,.hljs-quote,.hljs-selector-tag,.hljs-selector-pseudo){color:var(--color-prettylights-syntax-entity-tag)}`;

export const documentStyles = `    body.markdown-body { box-sizing: border-box; min-width: 200px; width: calc(100% - 64px); max-width: none; margin: 0 32px; padding: 32px 0 0; display: grid; grid-template-columns: minmax(0, 1fr) 300px; grid-template-areas: "content toc"; column-gap: 32px; align-items: start; }
    .markdown-content, .document-sidebar { box-sizing: border-box; }
    .markdown-content { grid-area: content; min-width: 0; margin-bottom: 72px; padding: clamp(28px, 3vw, 52px); border: 1px solid var(--borderColor-muted, #d8dee4); border-radius: 8px; box-shadow: 0 1px 2px rgba(31, 35, 40, 0.04); }
    .markdown-content :is(h1, h2, h3, h4, h5, h6) { scroll-margin-top: 32px; }
    .document-metadata { display: flex; justify-content: flex-end; margin: -12px 0 28px; padding-bottom: 14px; border-bottom: 1px solid var(--borderColor-muted, #d8dee4); }
    .document-modified { margin-left: auto; color: var(--fgColor-muted, #59636e); font-size: 0.75rem; line-height: 28px; white-space: nowrap; }
    .code-block { margin-bottom: 16px; overflow: hidden; border: 1px solid var(--borderColor-muted, #d8dee4); border-radius: 8px; }
    .code-toolbar { display: flex; min-height: 38px; align-items: center; justify-content: space-between; padding: 0 8px 0 14px; color: var(--fgColor-muted, #59636e); background: var(--bgColor-muted, #f6f8fa); border-bottom: 1px solid var(--borderColor-muted, #d8dee4); }
    .code-language { font-size: 0.75rem; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; }
    .code-tools { display: flex; gap: 2px; }
    .code-tool { display: inline-flex; min-height: 30px; align-items: center; justify-content: center; gap: 5px; padding: 4px 8px; color: inherit; font: inherit; font-size: 0.75rem; line-height: 1; background: transparent; border: 0; border-radius: 5px; cursor: pointer; }
    .code-tool-label, [data-copy-label] { display: inline-flex; align-items: center; line-height: 1; }
    .code-tool:hover { color: var(--fgColor-default, #1f2328); background: var(--button-default-bgColor-hover, #eaeef2); }
    .code-tool:focus-visible { outline: 2px solid var(--focus-outlineColor, #0969da); outline-offset: -2px; }
    .code-tool[aria-pressed="true"] { color: var(--fgColor-accent, #0969da); background: var(--bgColor-accent-muted, #ddf4ff); }
    .code-block pre { margin: 0; border-radius: 0; }
    .code-block pre, .code-block pre code { color: var(--codeBlock-fgColor, #24292f); background: var(--codeBlock-bgColor, #fff); }
    .code-block pre code { display: block; }
    .code-block.is-wrapped pre code { white-space: pre-wrap; overflow-wrap: anywhere; }
    .panel-toggle-icon { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; transition: transform 120ms ease; }
    .action-icon { display: block; width: 14px; height: 14px; flex: none; fill: none; stroke: currentColor; stroke-width: 1.25; stroke-linecap: round; stroke-linejoin: round; }
    .table-of-contents ul { margin: 0; padding: 0; list-style: none; }
    .table-of-contents li { margin: 2px 0 2px calc(var(--toc-level) * 12px); }
    .table-of-contents a { position: relative; display: block; padding: 6px 10px; color: var(--fgColor-muted, #59636e); font-size: 0.875rem; line-height: 1.4; overflow-wrap: anywhere; text-decoration: none; border-radius: 0 6px 6px 0; transition: color 120ms ease, background-color 120ms ease; }
    .table-of-contents a::before { position: absolute; top: 0; bottom: 0; left: 0; width: 2px; background: transparent; content: ""; }
    .table-of-contents a:hover { color: var(--fgColor-default, #1f2328); background: var(--bgColor-muted, #f6f8fa); text-decoration: none; }
    .table-of-contents a:focus-visible { outline: 2px solid var(--focus-outlineColor, #0969da); outline-offset: -2px; }
    .table-of-contents a[aria-current="location"] { color: var(--fgColor-accent, #0969da); font-weight: 600; background: linear-gradient(90deg, var(--bgColor-accent-muted, #ddf4ff), transparent); }
    .table-of-contents a[aria-current="location"]::before { background: var(--borderColor-accent-emphasis, #0969da); }
    @media (max-width: 900px) {
      body.markdown-body { width: calc(100% - 24px); max-width: none; margin: 0 12px; padding: 12px 0 0; grid-template-columns: minmax(0, 1fr); grid-template-areas: "toc" "content"; gap: 16px; }
      .markdown-content { margin-bottom: 32px; }
    }
    @media (max-width: 600px) { .markdown-content { padding: 24px 20px; border-radius: 6px; } }
    @media (prefers-reduced-motion: reduce) { .table-of-contents a, .panel-toggle-icon { transition: none; } }`;

export const fileTreeStyles = `    body.markdown-body.has-file-tree { width: 100%; margin: 0; padding: 32px 32px 0 0; grid-template-columns: 280px minmax(0, 1fr) 300px; grid-template-areas: "files content toc"; column-gap: 32px; }
    body.markdown-body.has-file-tree.file-sidebar-collapsed { width: calc(100% - 64px); margin: 0 32px; padding: 32px 0 0; grid-template-columns: minmax(0, 1fr) 300px; grid-template-areas: "content toc"; }
    .file-sidebar { grid-area: files; position: fixed; z-index: 45; top: 0; bottom: 0; left: 0; box-sizing: border-box; display: flex; width: 280px; min-height: 0; flex-direction: column; color: var(--fgColor-default, #1f2328); background: var(--bgColor-default, #fff); border: 0; border-right: 1px solid var(--borderColor-muted, #d8dee4); border-radius: 0; overflow: hidden; }
    .file-sidebar-header { display: flex; min-height: 52px; flex: none; align-items: center; gap: 9px; padding: 0 12px; font-size: 0.875rem; font-weight: 700; border-bottom: 1px solid var(--borderColor-muted, #d8dee4); }
    .file-sidebar-header > span { min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .file-sidebar[hidden], .file-sidebar-open[hidden], .file-sidebar-close[hidden] { display: none; }
    .file-sidebar-close { position: fixed; z-index: 50; top: 13px; left: 12px; display: inline-flex; width: 30px; height: 30px; flex: none; align-items: center; justify-content: center; padding: 0; color: var(--fgColor-muted, #59636e); background: transparent; border: 0; border-radius: 6px; cursor: pointer; }
    .file-sidebar-close:hover { color: var(--fgColor-default, #1f2328); background: var(--button-default-bgColor-hover, #eaeef2); }
    .file-sidebar-close:focus-visible { outline: 2px solid var(--focus-outlineColor, #0969da); outline-offset: -2px; }
    .file-navigation { position: relative; margin: -12px 0 28px; }
    .file-breadcrumbs { display: flex; align-items: center; gap: 8px; margin: 0; padding-bottom: 14px; border-bottom: 1px solid var(--borderColor-muted, #d8dee4); }
    .file-breadcrumbs ol { display: flex; min-width: 0; min-height: 28px; flex: 0 1 auto; flex-wrap: wrap; align-items: baseline; gap: 6px; margin: 0; padding: 0; list-style: none; }
    .file-breadcrumbs li { display: inline-block; min-width: 0; height: 28px; color: var(--fgColor-muted, #59636e); font-size: 0.875rem; line-height: 28px; }
    .file-breadcrumbs li + li::before { margin-right: 6px; color: var(--fgColor-muted, #818b98); content: "/"; }
    .file-breadcrumb-separator { height: 28px; margin-right: -2px; color: var(--fgColor-muted, #818b98); font-size: 0.875rem; line-height: 28px; }
    .file-breadcrumbs a { display: inline-block; height: 28px; color: var(--fgColor-accent, #0969da); font-weight: 500; line-height: 28px; text-decoration: none; vertical-align: baseline; }
    .file-breadcrumbs a:hover { text-decoration: underline; }
    .file-breadcrumbs [aria-current="page"] { color: var(--fgColor-default, #1f2328); font-weight: 600; white-space: nowrap; }
    .file-sidebar-open { position: fixed; z-index: 50; top: 13px; left: 12px; display: inline-flex; width: 30px; height: 30px; flex: none; align-items: center; justify-content: center; padding: 0; color: var(--fgColor-muted, #59636e); background: transparent; border: 0; border-radius: 6px; cursor: pointer; }
    .file-tree-popover-toggle { position: relative; top: 1px; display: inline-flex; height: 28px; min-width: 0; flex: none; align-items: center; justify-content: center; gap: 3px; padding: 0; color: var(--fgColor-accent, #0969da); font: inherit; font-size: 0.875rem; font-weight: 600; line-height: 28px; background: transparent; border: 0; border-radius: 4px; cursor: pointer; }
    .file-tree-popover-toggle span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .file-sidebar-toggle-icon { display: block; width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 1.2; stroke-linecap: round; stroke-linejoin: round; }
    .file-sidebar-open:hover { color: var(--fgColor-default, #1f2328); background: var(--button-default-bgColor-hover, #eaeef2); }
    .file-sidebar-open:focus-visible, .file-tree-popover-toggle:focus-visible { outline: 2px solid var(--focus-outlineColor, #0969da); outline-offset: 2px; }
    .file-tree-popover-toggle:hover { color: var(--fgColor-accent, #0969da); text-decoration: underline; background: transparent; }
    .file-tree-popover-toggle .panel-toggle-icon { width: 13px; height: 13px; flex: none; transform: translateY(1px); }
    .copy-file-path .copy-icon { transform: none; }
    .file-tree-popover-toggle[aria-expanded="true"] .panel-toggle-icon { transform: translateY(1px) rotate(180deg); }
    .copy-file-path { display: inline-flex; width: 28px; height: 28px; flex: none; align-items: center; justify-content: center; padding: 0; color: var(--fgColor-muted, #59636e); background: transparent; border: 0; border-radius: 5px; cursor: pointer; }
    .copy-file-path:hover { color: var(--fgColor-default, #1f2328); background: var(--button-default-bgColor-hover, #eaeef2); }
    .copy-file-path:focus-visible { outline: 2px solid var(--focus-outlineColor, #0969da); outline-offset: 2px; }
    .file-tree { box-sizing: border-box; overflow: auto; padding: 12px; color: var(--fgColor-default, #1f2328); background: var(--bgColor-default, #fff); scrollbar-width: thin; scrollbar-color: var(--borderColor-default, #d0d7de) transparent; }
    .file-tree-sidebar { min-height: 0; flex: 1; padding: 10px 12px 16px; }
    .file-tree-popover { position: absolute; z-index: 15; top: calc(100% + 6px); left: 0; width: min(360px, calc(100vw - 48px)); max-height: min(520px, calc(100vh - 96px)); border: 1px solid var(--borderColor-default, #d0d7de); border-radius: 8px; box-shadow: 0 8px 24px rgba(31,35,40,.16); }
    .file-tree-filter { margin: 0 0 8px; }
    .file-tree-filter-input { box-sizing: border-box; width: 100%; min-height: 32px; padding: 5px 9px; color: var(--fgColor-default, #1f2328); font: inherit; font-size: 0.8125rem; line-height: 1.4; background: var(--bgColor-default, #fff); border: 1px solid var(--borderColor-default, #d0d7de); border-radius: 6px; outline: none; }
    .file-tree-filter-input::placeholder { color: var(--fgColor-muted, #59636e); }
    .file-tree-filter-input:focus { border-color: var(--borderColor-accent-emphasis, #0969da); box-shadow: 0 0 0 2px var(--bgColor-accent-muted, #ddf4ff); }
    .file-tree-filter-empty { margin: 10px 4px 2px; color: var(--fgColor-muted, #59636e); font-size: 0.8125rem; text-align: center; }
    .file-tree ul { margin: 0; padding: 0; list-style: none; }
    .file-tree details { margin: 0; }
    .file-tree details > ul { margin-left: 10px; padding-left: 10px; border-left: 1px solid var(--borderColor-muted, #d8dee4); }
    .file-tree summary { padding: 5px 7px; color: var(--fgColor-default, #1f2328); font-size: 0.875rem; font-weight: 600; line-height: 1.35; border-radius: 5px; cursor: pointer; user-select: none; }
    .folder-icon { display: inline-block; width: 14px; height: 14px; margin-right: 5px; vertical-align: -2px; fill: none; stroke: currentColor; stroke-width: 1.25; stroke-linecap: round; stroke-linejoin: round; }
    .file-tree summary:hover { background: var(--bgColor-muted, #f6f8fa); }
    .file-tree summary::marker { color: var(--fgColor-muted, #59636e); }
    .file-tree a { display: flex; margin: 1px 0; padding: 5px 8px; align-items: center; gap: 6px; overflow: hidden; color: var(--fgColor-muted, #59636e); font-size: 0.875rem; line-height: 1.35; text-decoration: none; white-space: nowrap; border-radius: 5px; }
    .file-tree-name { min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; }
    .file-tree-comment-count { display: inline-flex; min-width: 18px; height: 18px; flex: none; align-items: center; justify-content: center; padding: 0 5px; color: var(--fgColor-muted, #59636e); font-size: 0.6875rem; font-weight: 600; line-height: 18px; background: var(--bgColor-neutral-muted, #818b981f); border-radius: 9px; }
    .file-tree a[aria-current="page"] .file-tree-comment-count { color: var(--fgColor-accent, #0969da); background: var(--bgColor-default, #fff); }
    .file-tree a:hover { color: var(--fgColor-default, #1f2328); background: var(--bgColor-muted, #f6f8fa); text-decoration: none; }
    .file-tree a:focus-visible { outline: 2px solid var(--focus-outlineColor, #0969da); outline-offset: -2px; }
    .file-tree a[aria-current="page"] { color: var(--fgColor-accent, #0969da); font-weight: 600; background: var(--bgColor-accent-muted, #ddf4ff); }
    @media (max-width: 900px) {
      body.markdown-body.has-file-tree, body.markdown-body.has-file-tree.file-sidebar-collapsed { width: calc(100% - 24px); margin: 0 12px; padding: 12px 0 0; grid-template-columns: minmax(0, 1fr); grid-template-areas: "toc" "content"; gap: 16px; }
      .file-sidebar { width: min(280px, calc(100vw - 24px)); box-shadow: 8px 0 24px rgba(31,35,40,.18); }
    }
    @media (max-width: 600px) { .file-tree-popover { width: calc(100vw - 40px); max-height: calc(100vh - 80px); } }
    `;
