import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { markdownToHtml } from "../dist/index.js";

const fixtures = [
  {
    name: "basic document",
    markdown: "# Title\n\nParagraph with [link](https://example.com).\n",
    options: {},
    hash: "d0c8b1084efc1d57dd86f6eef2b1b7db5700ff1a68cfc2153b0fefc2054478c4",
  },
  {
    name: "interactive table",
    markdown:
      "# Data\n\n| Name | Value |\n| --- | ---: |\n| two | 2 |\n| ten | 10 |\n",
    options: {},
    hash: "cbfae3dd4fcab4eb4538d64b2eaf1810a041d5e6e6a1c366c0d729416aa52822",
  },
  {
    name: "disabled optional assets",
    markdown: "# One\n\n## Two\n",
    options: { tableOfContents: false, highlight: false },
    hash: "afbff822b1af5bbbedb88ec5a2998b07557b103518b0c5429bb3f97fac6e8699",
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
    hash: "edc61f88daf55524182f8410ca00f803e917d33648667d80cab2f1e697a7ba92",
  },
];

for (const fixture of fixtures) {
  test(`keeps ${fixture.name} fixture byte-compatible`, () => {
    const html = markdownToHtml(fixture.markdown, fixture.options);
    assert.equal(createHash("sha256").update(html).digest("hex"), fixture.hash);
  });
}
