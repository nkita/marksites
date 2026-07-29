import { marked, Renderer } from "marked";
import { createCodeBlocksFeature } from "./features/code-blocks/index.js";
import { createHeaderFeature } from "./features/header/index.js";
import { createAnnotationsFeature } from "./features/annotations/index.js";
import type { AnnotationDocument } from "./annotations/model.js";
import {
  renderBreadcrumbs,
  renderFileSidebar,
  renderFileTree,
  renderFileTreeScript,
  renderModifiedAt,
  renderModifiedAtScript,
} from "./features/file-tree/index.js";
import { createTableOfContentsFeature } from "./features/table-of-contents/index.js";
import { createSidebarFeature } from "./features/sidebar/index.js";
import { createImageViewerFeature } from "./features/image-viewer/index.js";
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
  const currentFileName = options.fileTree?.breadcrumbs?.find(
    (breadcrumb) => breadcrumb.current,
  )?.name;
  const title = escapeHtml(`marksites | ${currentFileName ?? rawTitle}`);
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
    ? renderBreadcrumbs(options.fileTree?.breadcrumbs)
    : `<nav class="file-breadcrumbs" aria-label="ファイルパス"><span aria-current="page">${escapeHtml(rawTitle)}</span></nav>\n`;
  const header = createHeaderFeature({
    documentNavigation: breadcrumbs,
    fileTree,
  });
  const annotationFeature = createAnnotationsFeature(annotations);
  const imageViewer = createImageViewerFeature(/<img\b/i.test(content));
  const sidebar = createSidebarFeature({
    tableOfContents: toc.markup,
    tableOfContentsTitle: toc.title,
    annotations: annotationFeature.panel,
    annotationCount: annotationFeature.count,
  });

  return renderDocument({
    title,
    language,
    content,
    highlight,
    regions: {
      header: header.markup,
      fileSidebar,
      metadata: modifiedAt
        ? `<div class="document-metadata">${modifiedAt}</div>\n`
        : "",
      sidebar: sidebar.markup,
      overlays: `${annotationFeature.markup}${imageViewer.markup}`,
    },
    assets: {
      styles: [
        sidebar.styles,
        annotationFeature.styles,
        imageViewer.styles,
        header.styles,
      ],
      scripts: [
        header.script,
        fileTreeScript,
        renderModifiedAtScript(modifiedAt !== ""),
        sidebar.script,
        toc.script,
        `\n${codeBlocks.renderScript()}\n`,
        `${annotationFeature.script}\n`,
        ...(imageViewer.script ? [`${imageViewer.script}\n`] : []),
      ],
    },
  });
}
