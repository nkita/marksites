import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { markdownToHtml } from "../dist/index.js";

const fixtures = [
  {
    name: "basic document",
    markdown: "# Title\n\nParagraph with [link](https://example.com).\n",
    options: {},
    hash: "b4590b39294195b660f2d525c1d788d34710c8002d90cd2eeef58525bc135d74",
  },
  {
    name: "interactive table",
    markdown:
      "# Data\n\n| Name | Value |\n| --- | ---: |\n| two | 2 |\n| ten | 10 |\n",
    options: {},
    hash: "5b4209ecaf9984e9bf49539c6301bb0c7e85277fbf9183e4d19488fa903d4a29",
  },
  {
    name: "disabled optional assets",
    markdown: "# One\n\n## Two\n",
    options: { tableOfContents: false, highlight: false },
    hash: "ef8bc331c15a5873dc507c31e7d8cde2016db13798d57b73943a98e4f094c11d",
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
    hash: "04185b67ae38bd74692109d5987e1929ccaf6e3d385ddcb2601b406872b74302",
  },
];

for (const fixture of fixtures) {
  test(`keeps ${fixture.name} fixture byte-compatible`, () => {
    const html = markdownToHtml(fixture.markdown, fixture.options);
    assert.equal(createHash("sha256").update(html).digest("hex"), fixture.hash);
  });
}
