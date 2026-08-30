import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { markdownToHtml } from "../dist/index.js";

const fixtures = [
  {
    name: "basic document",
    markdown: "# Title\n\nParagraph with [link](https://example.com).\n",
    options: {},
    hash: "c56182b55ebe41798a273c5fd200513710c4abd0f7cf0ea78a4990c1df9d9c9c",
  },
  {
    name: "interactive table",
    markdown:
      "# Data\n\n| Name | Value |\n| --- | ---: |\n| two | 2 |\n| ten | 10 |\n",
    options: {},
    hash: "5bf332fb124e2db358a5bb932b15ead7207eca37c80f5c536ba597ed151f6356",
  },
  {
    name: "disabled optional assets",
    markdown: "# One\n\n## Two\n",
    options: { tableOfContents: false, highlight: false },
    hash: "24d7508e76c9c2152e1753482f4505a2ab709659b330f0a29a28998f46501d71",
  },
  {
    name: "directory navigation",
    markdown: "# Guide\n\n## Start\n",
    options: {
      title: "Guide",
      modifiedAt: "2026-01-02T03:04:05.000Z",
      fileTree: {
        breadcrumbs: [
          { name: "docs", href: "index.html" },
          { name: "guide.md", current: true },
        ],
        items: [
          {
            type: "directory",
            name: "docs",
            children: [
              {
                type: "file",
                name: "guide.md",
                href: "guide.html",
                current: true,
                modifiedAt: "2026-01-02T03:04:05.000Z",
                commentCount: 2,
              },
            ],
          },
        ],
      },
    },
    hash: "c9e5c314a1bea4ef8589b03609a9bd12a783d86014000230449d95878445879e",
  },
];

for (const fixture of fixtures) {
  test(`keeps ${fixture.name} fixture byte-compatible`, () => {
    const html = markdownToHtml(fixture.markdown, fixture.options);
    assert.equal(createHash("sha256").update(html).digest("hex"), fixture.hash);
  });
}
