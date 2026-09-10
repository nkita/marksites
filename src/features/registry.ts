import { marked, Renderer } from "marked";
import { emptyAnnotationDocument } from "../annotations/model.js";
import { createAnnotationsFeature } from "./annotations/index.js";
import { createCodeBlocksFeature } from "./code-blocks/index.js";
import { createDocumentViewFeature } from "./document-view/index.js";
import { createDocumentDiffFeature } from "./document-diff/index.js";
import {
  renderFileTreeScript,
  renderModifiedAtScript,
} from "./file-tree/index.js";
import { createHeaderFeature } from "./header/index.js";
import { createImageViewerFeature } from "./image-viewer/index.js";
import { createSidebarFeature } from "./sidebar/index.js";
import { createTableOfContentsFeature } from "./table-of-contents/index.js";
import { createTablesFeature } from "./tables/index.js";

export function scriptBody(script: string): string {
  return /^<script[^>]*>([\s\S]*)<\/script>$/.exec(script)?.[1] ?? "";
}

function createKnownFeatureScriptBodies(): Set<string> {
  const codeRenderer = new Renderer();
  const code = createCodeBlocksFeature(codeRenderer, true);
  marked.parse("```js\nconst value = 1;\n```", {
    renderer: codeRenderer,
    async: false,
  });
  const tocRenderer = new Renderer();
  const toc = createTableOfContentsFeature(tocRenderer, {
    enabled: true,
    title: "目次",
    minDepth: 2,
    maxDepth: 6,
  });
  marked.parse("## Heading", { renderer: tocRenderer, async: false });
  const renderedToc = toc.render();
  const annotations = createAnnotationsFeature(
    emptyAnnotationDocument("index.md"),
  );
  const tables = createTablesFeature(true);
  return new Set([
    scriptBody(code.renderScript()),
    scriptBody(createHeaderFeature().script),
    scriptBody(renderFileTreeScript(true)),
    scriptBody(renderModifiedAtScript(true)),
    scriptBody(renderedToc.script),
    scriptBody(annotations.script),
    scriptBody(createImageViewerFeature(true).script),
    ...tables.scripts.map(scriptBody),
    scriptBody(createDocumentViewFeature("same", false).script),
    scriptBody(createDocumentViewFeature("after", true).script),
    scriptBody(createDocumentDiffFeature("after", "before").script),
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

export const knownFeatureScriptBodies = createKnownFeatureScriptBodies();
