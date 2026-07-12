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

export const documentStyles = `    body.markdown-body { box-sizing: border-box; min-width: 200px; width: calc(100% - 64px); max-width: none; margin: 0 32px; padding: 32px 0 72px; display: grid; grid-template-columns: minmax(0, 1fr) 300px; grid-template-areas: "content toc"; column-gap: 32px; align-items: start; }
    .markdown-content, .table-of-contents { box-sizing: border-box; }
    .markdown-content { grid-area: content; min-width: 0; padding: clamp(28px, 3vw, 52px); border: 1px solid var(--borderColor-muted, #d8dee4); border-radius: 8px; box-shadow: 0 1px 2px rgba(31, 35, 40, 0.04); }
    .markdown-content :is(h1, h2, h3, h4, h5, h6) { scroll-margin-top: 32px; }
    .code-block { margin-bottom: 16px; overflow: hidden; border: 1px solid var(--borderColor-muted, #d8dee4); border-radius: 8px; }
    .code-toolbar { display: flex; min-height: 38px; align-items: center; justify-content: space-between; padding: 0 8px 0 14px; color: var(--fgColor-muted, #59636e); background: var(--bgColor-muted, #f6f8fa); border-bottom: 1px solid var(--borderColor-muted, #d8dee4); }
    .code-language { font-size: 0.75rem; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; }
    .code-tools { display: flex; gap: 2px; }
    .code-tool { display: inline-flex; min-height: 30px; align-items: center; padding: 4px 8px; color: inherit; font: inherit; font-size: 0.75rem; background: transparent; border: 0; border-radius: 5px; cursor: pointer; }
    .code-tool:hover { color: var(--fgColor-default, #1f2328); background: var(--button-default-bgColor-hover, #eaeef2); }
    .code-tool:focus-visible { outline: 2px solid var(--focus-outlineColor, #0969da); outline-offset: -2px; }
    .code-tool[aria-pressed="true"] { color: var(--fgColor-accent, #0969da); background: var(--bgColor-accent-muted, #ddf4ff); }
    .code-block pre { margin: 0; border-radius: 0; }
    .code-block pre code { display: block; }
    .code-block.is-wrapped pre code { white-space: pre-wrap; overflow-wrap: anywhere; }
    .table-of-contents { grid-area: toc; position: sticky; top: 24px; max-height: calc(100vh - 48px); overflow: auto; padding: 20px 16px; border: 1px solid var(--borderColor-muted, #d8dee4); border-radius: 8px; scrollbar-width: thin; scrollbar-color: var(--borderColor-default, #d0d7de) transparent; }
    .toc-header { display: flex; align-items: center; justify-content: space-between; }
    .table-of-contents h2 { margin: 0 10px 12px; padding-bottom: 12px; color: var(--fgColor-default, #1f2328); font-size: 0.9375rem; font-weight: 700; line-height: 1.25; letter-spacing: 0.01em; border-bottom: 1px solid var(--borderColor-muted, #d8dee4); }
    .toc-toggle { display: none; padding: 5px 9px; color: var(--fgColor-accent, #0969da); font: inherit; font-size: 0.8125rem; font-weight: 600; background: transparent; border: 0; border-radius: 5px; cursor: pointer; }
    .toc-toggle:hover { background: var(--bgColor-muted, #f6f8fa); }
    .toc-toggle:focus-visible { outline: 2px solid var(--focus-outlineColor, #0969da); outline-offset: -2px; }
    .table-of-contents ul { margin: 0; padding: 0; list-style: none; }
    .table-of-contents li { margin: 2px 0 2px calc(var(--toc-level) * 12px); }
    .table-of-contents a { position: relative; display: block; padding: 6px 10px; color: var(--fgColor-muted, #59636e); font-size: 0.875rem; line-height: 1.4; overflow-wrap: anywhere; text-decoration: none; border-radius: 0 6px 6px 0; transition: color 120ms ease, background-color 120ms ease; }
    .table-of-contents a::before { position: absolute; top: 0; bottom: 0; left: 0; width: 2px; background: transparent; content: ""; }
    .table-of-contents a:hover { color: var(--fgColor-default, #1f2328); background: var(--bgColor-muted, #f6f8fa); text-decoration: none; }
    .table-of-contents a:focus-visible { outline: 2px solid var(--focus-outlineColor, #0969da); outline-offset: -2px; }
    .table-of-contents a[aria-current="location"] { color: var(--fgColor-accent, #0969da); font-weight: 600; background: linear-gradient(90deg, var(--bgColor-accent-muted, #ddf4ff), transparent); }
    .table-of-contents a[aria-current="location"]::before { background: var(--borderColor-accent-emphasis, #0969da); }
    @media (max-width: 900px) {
      body.markdown-body { width: calc(100% - 24px); max-width: none; margin: 0 12px; padding: 12px 0 32px; grid-template-columns: minmax(0, 1fr); grid-template-areas: "toc" "content"; gap: 16px; }
      .table-of-contents { z-index: 10; top: 8px; width: auto; max-height: calc(100vh - 16px); padding: 12px; background: var(--bgColor-default, #fff); box-shadow: 0 4px 12px rgba(31, 35, 40, 0.08); }
      .table-of-contents h2 { margin: 0; padding: 0; border: 0; }
      .toc-toggle { display: inline-flex; }
      .toc-panel { margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--borderColor-muted, #d8dee4); }
    }
    @media (max-width: 600px) { .markdown-content { padding: 24px 20px; border-radius: 6px; } }
    @media (prefers-reduced-motion: reduce) { .table-of-contents a { transition: none; } }`;
