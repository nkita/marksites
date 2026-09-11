import { marked, Renderer } from "marked";
import { createCodeBlocksFeature } from "./features/code-blocks/index.js";
import { createHeaderFeature } from "./features/header/index.js";
import { emptyAnnotationDocument } from "./annotations/model.js";
import { createAnnotationsFeature } from "./features/annotations/index.js";
import type { AnnotationDocument } from "./annotations/model.js";
import {
  renderBreadcrumbs,
  createFileTreeFeature,
  renderFileTreeScript,
  renderModifiedAt,
  renderModifiedAtScript,
} from "./features/file-tree/index.js";
import { createTableOfContentsFeature } from "./features/table-of-contents/index.js";
import { createSidebarFeature } from "./features/sidebar/index.js";
import { createImageViewerFeature } from "./features/image-viewer/index.js";
import { createDocumentDiffFeature } from "./features/document-diff/index.js";
import type { DocumentDiffVersion } from "./features/document-diff/index.js";
import { createDocumentViewFeature } from "./features/document-view/index.js";
import { createTablesFeature } from "./features/tables/index.js";
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
  _annotations?: AnnotationDocument,
  previousMarkdown?: string,
  preservedDiffContent?: string,
  previousVersions?: DocumentDiffVersion[],
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
  const { markup: fileTree, sidebar: fileSidebar } = createFileTreeFeature(
    options.fileTree,
  );
  const fileTreeScript = renderFileTreeScript(fileTree !== "");
  const modifiedAt = renderModifiedAt(options.modifiedAt);
  const documentDiffEnabled = options.documentDiff !== false;
  const documentDiff = !documentDiffEnabled
    ? {
        content: "",
        control: "",
        styles: "",
        script: "",
        hasChanges: false,
      }
    : createDocumentDiffFeature(
        markdown,
        previousMarkdown,
        options.markedOptions,
        preservedDiffContent,
        previousVersions,
      );
  const documentView = createDocumentViewFeature(
    markdown,
    documentDiff.hasChanges,
  );
  const breadcrumbs = fileTree
    ? renderBreadcrumbs(options.fileTree?.breadcrumbs)
    : `<nav class="file-breadcrumbs" aria-label="ファイルパス"><span aria-current="page">${escapeHtml(rawTitle)}</span></nav>\n`;
  // Selection tools historically shared the annotations feature. Keep the
  // non-comment tools active with an empty, non-editable document.
  const selectionFeature = createAnnotationsFeature(
    emptyAnnotationDocument(currentFileName ?? rawTitle),
  );
  const imageViewer = createImageViewerFeature(/<img\b/i.test(content));
  const tables = createTablesFeature(/<table\b/i.test(content));
  const sidebar = createSidebarFeature({
    tableOfContents: toc.markup,
    tableOfContentsTitle: toc.title,
    annotations: "",
    annotationCount: 0,
  });
  const header = createHeaderFeature({
    documentNavigation: breadcrumbs,
    documentMetadata: modifiedAt,
    fileTree,
    hasFileSidebar: fileSidebar !== "",
    hasDocumentSidebar: sidebar.markup !== "",
  });

  return renderDocument({
    title,
    language,
    content,
    highlight,
    regions: {
      header: header.markup,
      fileSidebar,
      documentControls: `${documentView.control}${documentDiff.control}`,
      sourceContent: documentView.content,
      diffContent: documentDiffEnabled
        ? `<main class="document-diff-content" aria-label="文書の差分" hidden>\n${documentDiff.content}</main>`
        : "",
      sidebar: sidebar.markup,
      overlays: `${selectionFeature.markup}<div hidden>${selectionFeature.panel}</div>${imageViewer.markup}`,
    },
    assets: {
      styles: [
        sidebar.styles,
        `${selectionFeature.styles}\n.selection-actions [data-selection-action="comment"]{display:none}`,
        imageViewer.styles,
        header.styles,
        documentView.styles,
        documentDiff.styles,
        tables.styles,
      ],
      scripts: [
        header.script,
        documentView.script,
        documentDiff.script,
        fileTreeScript,
        renderModifiedAtScript(modifiedAt !== ""),
        sidebar.script,
        toc.script,
        `\n${codeBlocks.renderScript()}\n`,
        `${selectionFeature.script}\n`,
        ...(imageViewer.script ? [`${imageViewer.script}\n`] : []),
        ...tables.scripts.map((script) => `${script}\n`),
      ],
    },
  });
}
