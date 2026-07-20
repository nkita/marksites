import { marked, Renderer } from "marked";
import { createCodeBlocksFeature } from "./features/code-blocks.js";
import { createHeaderFeature } from "./features/header.js";
import { createAnnotationsFeature } from "./features/annotations.js";
import type { AnnotationDocument } from "./annotations/model.js";
import {
  renderBreadcrumbs,
  renderFileSidebar,
  renderFileTree,
  renderFileTreeScript,
  renderModifiedAt,
  renderModifiedAtScript,
} from "./features/file-tree.js";
import { createTableOfContentsFeature } from "./features/table-of-contents.js";
import { createSidebarFeature } from "./features/sidebar.js";
import { renderDocument } from "./template/document.js";
import type { RenderOptions } from "./types.js";
import { escapeHtml } from "./utils/html.js";

/** Convert Markdown into a standalone HTML document styled like GitHub. */
export function markdownToHtml(
  markdown: string,
  options: RenderOptions = {},
): string {
  return renderMarkdown(markdown, options);
}

export function renderMarkdown(
  markdown: string,
  options: RenderOptions = {},
  annotations?: AnnotationDocument,
): string {
  const rawTitle = options.title ?? "Markdown文書";
  const title = escapeHtml(rawTitle);
  const language = escapeHtml(options.language ?? "ja");
  const highlight = options.highlight ?? true;
  const tocOptions =
    typeof options.tableOfContents === "object" ? options.tableOfContents : {};
  const renderer = new Renderer();
  const tableOfContents = createTableOfContentsFeature(renderer, {
    enabled: options.tableOfContents !== false,
    title: tocOptions.title ?? "目次",
    minDepth: tocOptions.minDepth ?? 2,
    maxDepth: tocOptions.maxDepth ?? 6,
  });
  const codeBlocks = createCodeBlocksFeature(renderer, highlight);
  const header = createHeaderFeature();

  const content = marked.parse(markdown, {
    ...options.markedOptions,
    renderer,
    async: false,
  });
  const toc = tableOfContents.render();
  const fileTree = renderFileTree(options.fileTree);
  const fileSidebar = renderFileSidebar(options.fileTree);
  const fileTreeScript = renderFileTreeScript(fileTree !== "");
  const modifiedAt = renderModifiedAt(options.modifiedAt);
  const breadcrumbs = fileTree
    ? renderBreadcrumbs(options.fileTree?.breadcrumbs, options.modifiedAt)
    : modifiedAt
      ? `<div class="document-metadata">${modifiedAt}</div>\n`
      : "";
  const annotationFeature = createAnnotationsFeature(annotations);
  const sidebar = createSidebarFeature({
    tableOfContents: toc.markup,
    tableOfContentsTitle: toc.title,
    annotations: annotationFeature.panel,
    annotationCount: annotationFeature.count,
  });

  return renderDocument({
    title,
    header: header.markup,
    headerStyles: header.styles,
    headerScript: header.script,
    language,
    content,
    breadcrumbs,
    fileTree,
    fileSidebar,
    fileTreeScript,
    modifiedAtScript: renderModifiedAtScript(modifiedAt !== ""),
    sidebar: sidebar.markup,
    sidebarStyles: sidebar.styles,
    sidebarScript: sidebar.script,
    tableOfContentsScript: toc.script,
    codeBlockScript: codeBlocks.renderScript(),
    highlight,
    annotations: annotationFeature.markup,
    annotationStyles: annotationFeature.styles,
    annotationScript: annotationFeature.script,
  });
}
