import {
  documentStyles,
  fileTreeStyles,
  githubMarkdownCss,
  highlightCss,
} from "./styles.js";

interface DocumentParts {
  title: string;
  header: string;
  headerStyles: string;
  headerScript: string;
  language: string;
  content: string;
  breadcrumbs: string;
  fileTree: string;
  fileSidebar: string;
  fileTreeScript: string;
  modifiedAtScript: string;
  sidebar: string;
  sidebarStyles: string;
  sidebarScript: string;
  tableOfContentsScript: string;
  codeBlockScript: string;
  highlight: boolean;
  annotations: string;
  annotationStyles: string;
  annotationScript: string;
}

export function renderDocument(parts: DocumentParts): string {
  const bodyClass = parts.fileTree
    ? "markdown-body has-file-tree"
    : "markdown-body";

  const trustedScript = (script: string): string =>
    script.replace("<script>", '<script data-marksites-script="true">');

  return `<!doctype html>
<html lang="${parts.language}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${parts.title}</title>
  <style>${githubMarkdownCss}</style>
  ${parts.highlight ? `<style>${highlightCss}</style>` : ""}
  <style>
${documentStyles}${parts.fileTree ? `\n${fileTreeStyles}` : ""}${parts.sidebarStyles}${parts.annotationStyles}${parts.headerStyles}
  </style>
</head>
<body class="${bodyClass}">
${parts.header}
${parts.fileSidebar}
<main class="markdown-content">
${parts.fileTree ? `<div class="file-navigation">
${parts.breadcrumbs}${parts.fileTree}</div>
` : parts.breadcrumbs}${parts.content}
</main>
${parts.sidebar}
${parts.annotations}
${trustedScript(parts.headerScript)}${trustedScript(parts.fileTreeScript)}${trustedScript(parts.modifiedAtScript)}${trustedScript(parts.sidebarScript)}${trustedScript(parts.tableOfContentsScript)}
${trustedScript(parts.codeBlockScript)}
${trustedScript(parts.annotationScript)}
</body>
</html>
`;
}
