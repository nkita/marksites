import { randomBytes } from "node:crypto";
import { marked, Renderer } from "marked";
import { emptyAnnotationDocument } from "../annotations/model.js";
import { createAnnotationsFeature } from "../features/annotations.js";
import { createCodeBlocksFeature } from "../features/code-blocks.js";
import { renderFileTreeScript } from "../features/file-tree.js";
import { createSidebarFeature } from "../features/sidebar.js";
import { createTableOfContentsFeature } from "../features/table-of-contents.js";

function scriptBody(script: string): string {
  return /^<script[^>]*>([\s\S]*)<\/script>$/.exec(script)?.[1] ?? "";
}

function generatedScriptBodies(): Set<string> {
  const codeRenderer = new Renderer();
  const code = createCodeBlocksFeature(codeRenderer, true);
  marked.parse("```js\nconst value = 1;\n```", {
    renderer: codeRenderer,
    async: false,
  });
  const tocRenderer = new Renderer();
  const toc = createTableOfContentsFeature(tocRenderer, {
    enabled: true,
    title: "Table of contents",
    minDepth: 2,
    maxDepth: 6,
  });
  marked.parse("## Heading", { renderer: tocRenderer, async: false });
  const renderedToc = toc.render();
  const annotations = createAnnotationsFeature(
    emptyAnnotationDocument("index.md"),
  );
  return new Set([
    scriptBody(code.renderScript()),
    scriptBody(renderFileTreeScript(true)),
    scriptBody(renderedToc.script),
    scriptBody(annotations.script),
    scriptBody(
      createSidebarFeature({
        tableOfContents: renderedToc.markup,
        tableOfContentsTitle: renderedToc.title,
        annotations: annotations.panel,
        annotationCount: annotations.count,
      }).script,
    ),
    scriptBody(
      createSidebarFeature({
        tableOfContents: "",
        tableOfContentsTitle: renderedToc.title,
        annotations: annotations.panel,
        annotationCount: annotations.count,
      }).script,
    ),
  ]);
}

const allowedScripts = generatedScriptBodies();

export function secureHtml(source: string): { body: string; csp: string } {
  const nonce = randomBytes(18).toString("base64");
  const body = source.replace(
    /<script data-marksites-script="true">([\s\S]*?)<\/script>/g,
    (whole, content: string) =>
      allowedScripts.has(content)
        ? `<script data-marksites-script="true" nonce="${nonce}">${content}</script>`
        : whole,
  );
  return {
    body,
    csp: `default-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'nonce-${nonce}'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'`,
  };
}
