import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { markdownToHtml } from "../dist/index.js";

const fixtures = [
  {
    name: "basic document",
    markdown: "# Title\n\nParagraph with [link](https://example.com).\n",
    options: {},
    hash: "97174f97fb6d5b5173ac2d8df5567de33a42e7a1b8f060f586aef32254a24b02",
  },
  {
    name: "interactive table",
    markdown:
      "# Data\n\n| Name | Value |\n| --- | ---: |\n| two | 2 |\n| ten | 10 |\n",
    options: {},
    hash: "63bbd5b47cd99e8f820a234edb288e7bae5db69dbcb51445d07d9f9c697a7d1d",
  },
  {
    name: "disabled optional assets",
    markdown: "# One\n\n## Two\n",
    options: { tableOfContents: false, highlight: false },
    hash: "8afe196bdf9897e18b271a12fecf985d69c1dbf36e55e2994e42592764f35f7a",
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
    hash: "a4a46c37df0c5d87042068219745c2078c0922386f06f15edb81fea2a7fdfea3",
  },
];

for (const fixture of fixtures) {
  test(`keeps ${fixture.name} fixture byte-compatible`, () => {
    const html = markdownToHtml(fixture.markdown, fixture.options);
    assert.equal(createHash("sha256").update(html).digest("hex"), fixture.hash);
  });
}
