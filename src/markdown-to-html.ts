import { marked, Renderer } from "marked";
import { createCodeBlocksFeature } from "./features/code-blocks.js";
import {
  renderBreadcrumbs,
  renderFileTree,
  renderFileTreeScript,
} from "./features/file-tree.js";
import { createTableOfContentsFeature } from "./features/table-of-contents.js";
import { renderDocument } from "./template/document.js";
import type { RenderOptions } from "./types.js";
import { escapeHtml } from "./utils/html.js";

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
  const renderer = new Renderer();
  const tableOfContents = createTableOfContentsFeature(renderer, {
    enabled: options.tableOfContents !== false,
    title: tocOptions.title ?? "Table of contents",
    minDepth: tocOptions.minDepth ?? 2,
    maxDepth: tocOptions.maxDepth ?? 6,
  });
  const codeBlocks = createCodeBlocksFeature(renderer, highlight);

  const content = marked.parse(markdown, {
    ...options.markedOptions,
    renderer,
    async: false,
  });
  const toc = tableOfContents.render();
  const fileTree = renderFileTree(options.fileTree);
  const fileTreeScript = renderFileTreeScript(fileTree !== "");
  const breadcrumbs = renderBreadcrumbs(options.fileTree?.breadcrumbs);

  return renderDocument({
    title,
    language,
    content,
    breadcrumbs,
    fileTree,
    fileTreeScript,
    tableOfContents: toc.markup,
    tableOfContentsScript: toc.script,
    codeBlockScript: codeBlocks.renderScript(),
    highlight,
  });
}
