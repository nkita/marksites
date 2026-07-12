import assert from "node:assert/strict";
import test from "node:test";
import { markdownToHtml } from "../dist/index.js";

test("renders a GitHub-style file tree with a current page", () => {
  const html = markdownToHtml("# Guide", {
    fileTree: {
      title: "Documentation",
      breadcrumbs: [
        { name: "docs", href: "../index.html" },
        { name: "guide" },
        { name: "getting-started.md", current: true },
      ],
      items: [
        { type: "file", name: "index.md", href: "../index.html" },
        {
          type: "directory",
          name: "guide",
          children: [
            {
              type: "file",
              name: "getting-started.md",
              href: "getting-started.html",
              current: true,
            },
          ],
        },
      ],
    },
  });

  assert.match(html, /class="markdown-body has-file-tree"/);
  assert.match(html, /class="file-tree"/);
  assert.match(html, /<summary>guide<\/summary>/);
  assert.match(html, /href="getting-started\.html" aria-current="page"/);
  assert.match(html, /grid-template-areas: "tree content toc"/);
  assert.match(html, /class="file-breadcrumbs"/);
  assert.match(html, /<a href="\.\.\/index\.html">docs<\/a>/);
  assert.match(html, /<span aria-current="page">getting-started\.md<\/span>/);
});

test("does not alter the document shell without file tree options", () => {
  const html = markdownToHtml("# Guide");

  assert.match(html, /<body class="markdown-body">/);
  assert.doesNotMatch(html, /class="file-tree"/);
  assert.doesNotMatch(html, /has-file-tree/);
});
