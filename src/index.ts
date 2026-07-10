import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { marked, type MarkedOptions } from "marked";

const require = createRequire(import.meta.url);
const githubMarkdownCss = readFileSync(
  require.resolve("github-markdown-css/github-markdown.css"),
  "utf8",
);

export interface RenderOptions {
  /** Text used for the HTML document title. */
  title?: string;
  /** Language assigned to the root HTML element. */
  language?: string;
  /** Options forwarded to marked. Async parsing is not supported. */
  markedOptions?: Omit<MarkedOptions, "async">;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Convert Markdown into a standalone HTML document styled like GitHub. */
export function markdownToHtml(
  markdown: string,
  options: RenderOptions = {},
): string {
  const title = escapeHtml(options.title ?? "Markdown document");
  const language = escapeHtml(options.language ?? "en");
  const content = marked.parse(markdown, {
    ...options.markedOptions,
    async: false,
  });

  return `<!doctype html>
<html lang="${language}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>${githubMarkdownCss}</style>
  <style>
    body { box-sizing: border-box; min-width: 200px; max-width: 980px; margin: 0 auto; padding: 45px; }
    @media (max-width: 767px) { body { padding: 15px; } }
  </style>
</head>
<body class="markdown-body">
${content}
</body>
</html>
`;
}
