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
  highlight: boolean;
  regions: {
    header: string;
    breadcrumbs: string;
    fileTree: string;
    fileSidebar: string;
    sidebar: string;
    overlays: string;
  };
  assets: {
    styles: string[];
    scripts: string[];
  };
}

export function renderDocument(parts: DocumentParts): string {
  const bodyClass = parts.regions.fileTree
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
${documentStyles}${parts.regions.fileTree ? `\n${fileTreeStyles}` : ""}${parts.assets.styles.join("")}
  </style>
</head>
<body class="${bodyClass}">
${parts.regions.header}
${parts.regions.fileSidebar}
<main class="markdown-content">
${parts.regions.fileTree ? `<div class="file-navigation">
${parts.regions.breadcrumbs}${parts.regions.fileTree}</div>
` : parts.regions.breadcrumbs}${parts.content}
</main>
${parts.regions.sidebar}
${parts.regions.overlays}
${parts.assets.scripts.map(trustedScript).join("")}
</body>
</html>
`;
}
