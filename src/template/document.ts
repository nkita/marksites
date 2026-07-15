import {
  documentStyles,
  fileTreeStyles,
  githubMarkdownCss,
  highlightCss,
} from "./styles.js";

interface DocumentParts {
  title: string;
  language: string;
  content: string;
  breadcrumbs: string;
  fileTree: string;
  fileTreeScript: string;
  tableOfContents: string;
  tableOfContentsScript: string;
  codeBlockScript: string;
  highlight: boolean;
}

export function renderDocument(parts: DocumentParts): string {
  const bodyClass = parts.fileTree
    ? "markdown-body has-file-tree"
    : "markdown-body";

  return `<!doctype html>
<html lang="${parts.language}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${parts.title}</title>
  <style>${githubMarkdownCss}</style>
  ${parts.highlight ? `<style>${highlightCss}</style>` : ""}
  <style>
${documentStyles}${parts.fileTree ? `\n${fileTreeStyles}` : ""}
  </style>
</head>
<body class="${bodyClass}">
${parts.fileTree}<main class="markdown-content">
${parts.breadcrumbs}${parts.content}
</main>
${parts.tableOfContents}
${parts.fileTreeScript}${parts.tableOfContentsScript}
${parts.codeBlockScript}
</body>
</html>
`;
}
