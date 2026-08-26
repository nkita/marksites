import {
  documentStyles,
  fileTreeStyles,
  githubMarkdownCss,
  highlightCss,
  highlightThemeStyles,
} from "./styles.js";

interface DocumentParts {
  title: string;
  language: string;
  content: string;
  highlight: boolean;
  regions: {
    header: string;
    fileSidebar: string;
    documentControls: string;
    sourceContent: string;
    diffContent: string;
    sidebar: string;
    overlays: string;
  };
  assets: {
    styles: string[];
    scripts: string[];
  };
}

export function renderDocument(parts: DocumentParts): string {
  const bodyClass = parts.regions.fileSidebar
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
  ${parts.highlight ? `<style>${highlightCss}\n${highlightThemeStyles}</style>` : ""}
  <style>
${documentStyles}${parts.regions.fileSidebar ? `\n${fileTreeStyles}` : ""}${parts.assets.styles.join("")}
  </style>
</head>
<body class="${bodyClass}">
${parts.regions.header}
${parts.regions.fileSidebar}
<div class="document-content">
<div class="document-content-actions" role="toolbar" aria-label="文書表示と操作">
${parts.regions.documentControls}
</div>
<main class="markdown-content">
${parts.content}
</main>
${parts.regions.sourceContent}
${parts.regions.diffContent}
</div>
${parts.regions.sidebar}
${parts.regions.overlays}
${parts.assets.scripts.map(trustedScript).join("")}
</body>
</html>
`;
}
