import {
  documentStyles,
  githubMarkdownCss,
  highlightCss,
} from "./styles.js";

interface DocumentParts {
  title: string;
  language: string;
  content: string;
  tableOfContents: string;
  tableOfContentsScript: string;
  codeBlockScript: string;
  highlight: boolean;
}

export function renderDocument(parts: DocumentParts): string {
  return `<!doctype html>
<html lang="${parts.language}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${parts.title}</title>
  <style>${githubMarkdownCss}</style>
  ${parts.highlight ? `<style>${highlightCss}</style>` : ""}
  <style>
${documentStyles}
  </style>
</head>
<body class="markdown-body">
<main class="markdown-content">
${parts.content}
</main>
${parts.tableOfContents}
${parts.tableOfContentsScript}
${parts.codeBlockScript}
</body>
</html>
`;
}
