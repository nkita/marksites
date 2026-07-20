import { createHash } from "node:crypto";
import type { Token } from "marked";
import { emptyAnnotationDocument } from "../annotations/model.js";
import { renderMarkdown } from "../markdown-to-html.js";

export const OUTPUT_COMPATIBILITY_VERSION = 5;

export function contentHash(value: string | Buffer): string {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function rewriteMarkdownHref(href: string): string {
  if (
    /^[a-z][a-z\d+.-]*:/i.test(href) ||
    href.startsWith("//") ||
    href.startsWith("/")
  ) {
    return href;
  }
  return href.replace(/\.(md|markdown)(?=([?#]|$))/i, ".html");
}

export function rewriteMarkdownLinks(token: Token): void {
  if (token.type === "link") token.href = rewriteMarkdownHref(token.href);
}

export function renderFingerprint(): string {
  const representativeHtml = renderMarkdown(
    "## Heading\n\n[Document](guide.md)\n\n```js\nconst value = 1;\n```\n",
    {
      title: "marksites-render-fingerprint",
      modifiedAt: "2026-01-01T00:00:00.000Z",
      fileTree: {
        title: "ファイル",
        items: [
          {
            type: "file",
            name: "index.md",
            href: "index.html",
            current: true,
          },
        ],
        breadcrumbs: [{ name: "docs" }, { name: "index.md", current: true }],
      },
      markedOptions: { walkTokens: rewriteMarkdownLinks },
    },
    emptyAnnotationDocument("index.md"),
  );
  return contentHash(`${OUTPUT_COMPATIBILITY_VERSION}\n${representativeHtml}`);
}
