import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import GithubSlugger from "github-slugger";
import hljs from "highlight.js/lib/common";
import { marked, Renderer, type MarkedOptions } from "marked";

const require = createRequire(import.meta.url);
const githubMarkdownCss = readFileSync(
  require.resolve("github-markdown-css/github-markdown.css"),
  "utf8",
);
const highlightCss = readFileSync(
  require.resolve("highlight.js/styles/github.css"),
  "utf8",
);

export interface RenderOptions {
  /** Text used for the HTML document title. */
  title?: string;
  /** Language assigned to the root HTML element. */
  language?: string;
  /** Enable syntax highlighting for fenced code blocks. Defaults to true. */
  highlight?: boolean;
  /** Add a table of contents generated from headings. Defaults to true. */
  tableOfContents?: boolean | TableOfContentsOptions;
  /** Options forwarded to marked. Async parsing is not supported. */
  markedOptions?: Omit<MarkedOptions, "async" | "renderer">;
}

export interface TableOfContentsOptions {
  /** Heading shown above the generated links. */
  title?: string;
  /** Shallowest heading level to include. Defaults to 2. */
  minDepth?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Deepest heading level to include. Defaults to 6. */
  maxDepth?: 1 | 2 | 3 | 4 | 5 | 6;
}

interface TableOfContentsItem {
  depth: number;
  id: string;
  text: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function plainTextFromHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, "")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

function renderTableOfContents(
  items: TableOfContentsItem[],
  title: string,
  minDepth: number,
): string {
  if (items.length === 0) return "";

  const links = items
    .map(
      ({ depth, id, text }) =>
        `    <li style="--toc-level: ${depth - minDepth}"><a href="#${escapeHtml(id)}">${escapeHtml(text)}</a></li>`,
    )
    .join("\n");
  const escapedTitle = escapeHtml(title);

  return `<nav class="table-of-contents" aria-label="${escapedTitle}">
  <h2>${escapedTitle}</h2>
  <ul>
${links}
  </ul>
</nav>
`;
}

function renderTableOfContentsScript(): string {
  return `<script>
(() => {
  const navigation = document.querySelector('.table-of-contents');
  if (!navigation) return;

  const links = [...navigation.querySelectorAll('a[href^="#"]')];
  const entries = links
    .map((link) => ({ link, heading: document.getElementById(link.getAttribute('href').slice(1)) }))
    .filter((entry) => entry.heading);
  if (entries.length === 0) return;

  let scheduled = false;
  const update = () => {
    scheduled = false;
    const marker = Math.min(160, window.innerHeight * 0.25);
    let active = entries[0];

    for (const entry of entries) {
      if (entry.heading.getBoundingClientRect().top > marker) break;
      active = entry;
    }

    for (const entry of entries) {
      if (entry === active) entry.link.setAttribute('aria-current', 'location');
      else entry.link.removeAttribute('aria-current');
    }
    const navigationRect = navigation.getBoundingClientRect();
    const activeRect = active.link.getBoundingClientRect();
    if (activeRect.top < navigationRect.top || activeRect.bottom > navigationRect.bottom) {
      navigation.scrollTop += activeRect.top - navigationRect.top - navigation.clientHeight / 2;
    }
  };
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(update);
  };

  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  update();
})();
</script>`;
}

/** Convert Markdown into a standalone HTML document styled like GitHub. */
export function markdownToHtml(
  markdown: string,
  options: RenderOptions = {},
): string {
  const title = escapeHtml(options.title ?? "Markdown document");
  const language = escapeHtml(options.language ?? "en");
  const highlight = options.highlight ?? true;
  const tocOptions =
    typeof options.tableOfContents === "object"
      ? options.tableOfContents
      : {};
  const tableOfContents = options.tableOfContents !== false;
  const tocTitle = tocOptions.title ?? "Table of contents";
  const tocMinDepth = tocOptions.minDepth ?? 2;
  const tocMaxDepth = tocOptions.maxDepth ?? 6;
  const tocItems: TableOfContentsItem[] = [];
  const slugger = new GithubSlugger();
  const renderer = new Renderer();

  renderer.heading = ({ tokens, depth }) => {
    const renderedText = renderer.parser.parseInline(tokens);
    const plainText = plainTextFromHtml(renderedText);
    const id = slugger.slug(plainText);

    if (tableOfContents && depth >= tocMinDepth && depth <= tocMaxDepth) {
      tocItems.push({ depth, id, text: plainText });
    }

    return `<h${depth} id="${escapeHtml(id)}">${renderedText}</h${depth}>\n`;
  };

  if (highlight) {
    renderer.code = ({ text, lang }) => {
      const requestedLanguage = lang?.trim().split(/\s+/, 1)[0];

      if (!requestedLanguage || !hljs.getLanguage(requestedLanguage)) {
        return `<pre><code>${escapeHtml(text)}</code></pre>\n`;
      }

      const result = hljs.highlight(text, {
        language: requestedLanguage,
        ignoreIllegals: true,
      });
      const className = escapeHtml(requestedLanguage);
      return `<pre><code class="hljs language-${className}">${result.value}</code></pre>\n`;
    };
  }

  const content = marked.parse(markdown, {
    ...options.markedOptions,
    renderer,
    async: false,
  });
  const toc = tableOfContents
    ? renderTableOfContents(tocItems, tocTitle, tocMinDepth)
    : "";
  const tocScript = toc ? renderTableOfContentsScript() : "";

  return `<!doctype html>
<html lang="${language}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>${githubMarkdownCss}</style>
  ${highlight ? `<style>${highlightCss}</style>` : ""}
  <style>
    body.markdown-body { box-sizing: border-box; min-width: 200px; width: calc(100% - 64px); max-width: none; margin: 0 32px; padding: 32px 0 72px; display: grid; grid-template-columns: minmax(0, 1fr) 300px; grid-template-areas: "content toc"; column-gap: 32px; align-items: start; }
    .markdown-content, .table-of-contents { box-sizing: border-box; }
    .markdown-content { grid-area: content; min-width: 0; padding: clamp(28px, 3vw, 52px); border: 1px solid var(--borderColor-muted, #d8dee4); border-radius: 8px; box-shadow: 0 1px 2px rgba(31, 35, 40, 0.04); }
    .markdown-content :is(h1, h2, h3, h4, h5, h6) { scroll-margin-top: 32px; }
    .table-of-contents { grid-area: toc; position: sticky; top: 24px; max-height: calc(100vh - 48px); overflow: auto; padding: 20px 16px; border: 1px solid var(--borderColor-muted, #d8dee4); border-radius: 8px; scrollbar-width: thin; scrollbar-color: var(--borderColor-default, #d0d7de) transparent; }
    .table-of-contents h2 { margin: 0 10px 12px; padding-bottom: 12px; color: var(--fgColor-default, #1f2328); font-size: 0.9375rem; font-weight: 700; line-height: 1.25; letter-spacing: 0.01em; border-bottom: 1px solid var(--borderColor-muted, #d8dee4); }
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
      .table-of-contents { position: static; width: auto; max-height: none; }
    }
    @media (max-width: 600px) { .markdown-content { padding: 24px 20px; border-radius: 6px; } }
    @media (prefers-reduced-motion: reduce) { .table-of-contents a { transition: none; } }
  </style>
</head>
<body class="markdown-body">
<main class="markdown-content">
${content}
</main>
${toc}
${tocScript}
</body>
</html>
`;
}
