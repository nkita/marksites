import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { markdownToHtml } from "../dist/index.js";

const html = markdownToHtml("| Name | Value |\n| --- | --- |\n| one | 1 |");
const script = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)]
  .map((match) => match[1])
  .find((body) => body.includes("const cellText ="));

function setup(values, { clipboard, fallback = true, spans = false } = {}) {
  const elements = [];
  const timers = new Map();
  const toolbars = [];
  let copied;
  let restored = false;
  const tables = values.map((rows) => ({
    rows: rows.map((cells) => ({
      cells: cells.map((text) => ({
        colSpan: spans ? 2 : 1,
        rowSpan: 1,
        cloneNode: () => ({ textContent: text, querySelectorAll: () => [] }),
      })),
    })),
    closest: () => null,
    before: (toolbar) => toolbars.push(toolbar),
  }));
  const document = {
    querySelectorAll: () => tables,
    activeElement: {
      focus: () => {
        restored = true;
      },
    },
    getSelection: () => null,
    createElement(tag) {
      const element = {
        tag,
        style: {},
        children: [],
        append(...children) {
          this.children.push(...children);
        },
        setAttribute(name, value) {
          this[name] = value;
        },
        addEventListener(event, handler) {
          this[event] = handler;
        },
        select() {
          copied = this.value;
        },
        remove() {
          this.removed = true;
        },
      };
      elements.push(element);
      return element;
    },
    body: { append() {} },
    execCommand: () => fallback,
  };
  vm.runInNewContext(script, {
    document,
    navigator: { clipboard },
    setTimeout(callback, delay) {
      const id = Symbol();
      timers.set(id, { callback, delay });
      return id;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
  });
  return {
    timers,
    tables,
    get toolbars() {
      return toolbars.map((container) => container.children[0]);
    },
    elements,
    copied: () => copied,
    restored: () => restored,
  };
}

test("embeds CSV copy only for documents with tables", () => {
  assert.ok(script);
  assert.match(html, /label.textContent = 'コピー'/);
  assert.doesNotMatch(markdownToHtml("No table"), /table-copy-toolbar/);
});

test("copies headers, empty cells, quotes, commas and multiline Unicode in current row order", async () => {
  const copies = [];
  const state = setup(
    [
      [
        ["Name", "Value"],
        ['日本語,"quoted"', "line 1\nline 2"],
        ["", "  spaces  "],
      ],
      [["Other"], ["独立"]],
    ],
    { clipboard: { writeText: async (text) => copies.push(text) } },
  );
  const rows = state.tables[0].rows;
  [rows[1], rows[2]] = [rows[2], rows[1]];
  await state.toolbars[0].children[0].click({ preventDefault() {} });
  await state.toolbars[1].children[0].click({ preventDefault() {} });
  assert.deepEqual(copies, [
    '"Name","Value"\r\n"","  spaces  "\r\n"日本語,""quoted""","line 1\nline 2"',
    '"Other"\r\n"独立"',
  ]);
  assert.equal(
    state.toolbars[0].children[0].children[0].textContent,
    "コピーしました",
  );
});

for (const [name, clipboard] of [
  ["unavailable", undefined],
  [
    "rejected",
    {
      writeText: async () => {
        throw new Error("denied");
      },
    },
  ],
]) {
  test(`falls back when Clipboard API is ${name} and restores focus`, async () => {
    const state = setup([[["value"]]], { clipboard });
    await state.toolbars[0].children[0].click({ preventDefault() {} });
    assert.equal(state.copied(), '"value"');
    assert.ok(
      state.elements.find((element) => element.tag === "textarea").removed,
    );
    assert.ok(state.restored());
    assert.equal(state.toolbars[0].children[0]["aria-disabled"], "false");
  });
}

test("reports a failed fallback and cleans up", async () => {
  const state = setup([[["value"]]], { fallback: false });
  await state.toolbars[0].children[0].click({ preventDefault() {} });
  assert.equal(
    state.toolbars[0].children[0]["aria-label"],
    "表をコピーできませんでした",
  );
  assert.ok(
    state.elements.find((element) => element.tag === "textarea").removed,
  );
  assert.equal(state.toolbars[0].children[0]["aria-disabled"], "false");
});

test("does not add copy controls to empty tables or merged cells", () => {
  assert.equal(setup([[]]).toolbars.length, 0);
  assert.equal(setup([[["merged"]]], { spans: true }).toolbars.length, 0);
});

test("restores the copy label after 1600ms and resets the timer on repeated copies", async () => {
  const state = setup([[["value"]]], {
    clipboard: { writeText: async () => {} },
  });
  const link = state.toolbars[0].children[0];
  for (let i = 0; i < 2; i++) await link.click({ preventDefault() {} });
  assert.equal(state.timers.size, 1);
  const timer = [...state.timers.values()][0];
  assert.equal(timer.delay, 1600);
  assert.equal(link.children[0].textContent, "コピーしました");
  assert.match(link.innerHTML, /copy-icon/);
  timer.callback();
  assert.equal(link.children[0].textContent, "コピー");
  assert.equal(link["aria-label"], "表をCSVとしてコピー");
});
