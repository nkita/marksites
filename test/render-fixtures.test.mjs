import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { markdownToHtml } from "../dist/index.js";

const fixtures = [
  {
    name: "basic document",
    markdown: "# Title\n\nParagraph with [link](https://example.com).\n",
    options: {},
    hash: "8f65b57a076c2df88d728b757f33448701e1fc8c72b12d4dc92b3233bfa1ea82",
  },
  {
    name: "interactive table",
    markdown:
      "# Data\n\n| Name | Value |\n| --- | ---: |\n| two | 2 |\n| ten | 10 |\n",
    options: {},
    hash: "076bd708bb329795272ce3c3cfe3771ea05378a11ae5f55877e912dd1f0e7e82",
  },
  {
    name: "disabled optional assets",
    markdown: "# One\n\n## Two\n",
    options: { tableOfContents: false, highlight: false },
    hash: "23619dd0d91a79c3aa30fc4734200da320873b7651b7c535d8479c4f8ce72862",
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
    hash: "95ebe9fa40b50f082a0999c8540a4b3f3df571cd3140cb96fba4c5248c52f3fd",
  },
];

for (const fixture of fixtures) {
  test(`keeps ${fixture.name} fixture byte-compatible`, () => {
    const html = markdownToHtml(fixture.markdown, fixture.options);
    assert.equal(createHash("sha256").update(html).digest("hex"), fixture.hash);
  });
}
