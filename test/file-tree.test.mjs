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
              commentCount: 3,
            },
          ],
        },
      ],
    },
  });

  assert.match(html, /class="markdown-body has-file-tree"/);
  assert.match(html, /class="file-tree"/);
  assert.match(html, /<summary>guide<\/summary>/);
  assert.match(
    html,
    /href="getting-started\.html" data-file-name="getting-started\.md" aria-current="page"/,
  );
  assert.match(html, /grid-template-areas: "tree content toc"/);
  assert.match(html, /class="file-breadcrumbs"/);
  assert.match(html, /<a href="\.\.\/index\.html">docs<\/a>/);
  assert.match(html, /<span aria-current="page">getting-started\.md<\/span>/);
  assert.match(html, /class="file-tree-filter-input"/);
  assert.match(html, /class="file-tree-toggle"/);
  assert.doesNotMatch(html, /file-tree-toggle-label/);
  assert.match(html, /aria-controls="file-tree-panel"/);
  assert.match(html, /panel\.hidden = !expanded/);
  assert.match(html, /<h2>\s*<button type="button" class="file-tree-toggle"/);
  assert.match(html, /<span>Documentation<\/span>/);
  assert.doesNotMatch(html, /file-tree-collapse-all/);
  assert.match(
    html,
    /\.file-tree-panel \{ margin-top: 12px; padding-top: 12px; border-top:/,
  );
  assert.match(
    html,
    /\.file-tree-toggle \{ box-sizing: border-box; display: flex; width: 100%/,
  );
  assert.match(html, /placeholder="Filter files"/);
  assert.match(html, /data-file-name="getting-started\.md"/);
  assert.match(
    html,
    /class="file-tree-comment-count" aria-label="3 comments">3<\/span>/,
  );
  assert.match(html, /dataset\.fileName\.toLocaleLowerCase\(\)/);
  assert.match(html, /name\.includes\(query\)/);
  assert.match(html, /event\.key !== 'Escape'/);
});

test("does not alter the document shell without file tree options", () => {
  const html = markdownToHtml("# Guide");

  assert.match(html, /<body class="markdown-body">/);
  assert.doesNotMatch(html, /class="file-tree"/);
  assert.doesNotMatch(html, /has-file-tree/);
  assert.doesNotMatch(html, /file-tree-filter-input/);
  assert.doesNotMatch(html, /file-tree-collapse-all/);
});
