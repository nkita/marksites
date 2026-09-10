import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { markdownToHtml } from "../dist/index.js";

test("defers hidden table sizing until preview and preserves resized columns", () => {
  const html = markdownToHtml("| Name | Value |\n| --- | --- |\n| one | 1 |");
  const script = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)]
    .map((match) => match[1]).find((body) => body.includes("const minimum=48"));
  const content = { hidden: true };
  const elements = [];
  let notify, disconnected = false;
  function element(tag) {
    const node = { tag, style: {}, children: [], listeners: {},
      classList: { add() {} }, setAttribute() {},
      append(child) { this.children.push(child); },
      addEventListener(type, callback) { this.listeners[type] = callback; },
    };
    elements.push(node);
    return node;
  }
  const table = Object.assign(element("table"), {
    tHead: { rows: [{ cells: [120, 80].map((width) => ({ colSpan: 1,
      getBoundingClientRect: () => ({ width: content.hidden ? 0 : width }),
    })) }] },
    querySelector: () => null, closest: () => content,
    before() {}, prepend(group) { this.children.unshift(group); },
    offsetHeight: 90,
  });
  vm.runInNewContext(script, {
    document: { querySelectorAll: () => [table], createElement: element },
    MutationObserver: class {
      constructor(callback) { notify = callback; }
      observe(target, options) {
        assert.equal(target, content);
        assert.equal(options.attributeFilter[0], "hidden");
      }
      disconnect() { disconnected = true; }
    },
  });
  assert.equal(table.style.width, undefined);
  assert.equal(elements.filter((node) => node.tag === "col").length, 0);
  notify();
  assert.equal(disconnected, false);
  content.hidden = false;
  notify();
  assert.equal(disconnected, true);
  assert.equal(table.style.width, "200px");
  assert.deepEqual(table.children[0].children.map((col) => col.style.width), ["120px", "80px"]);
  const handles = elements.filter((node) => node.tag === "button");
  assert.equal(handles.length, 2);
  handles[0].listeners.keydown({ key: "ArrowRight", preventDefault() {} });
  content.hidden = true;
  content.hidden = false;
  assert.equal(table.style.width, "210px");
  assert.equal(table.children[0].children[0].style.width, "130px");
});

test("adds offline column resizing controls when Markdown contains a table", () => {
  const html = markdownToHtml("| Name | Value |\n| --- | ---: |\n| one | 1 |\n");

  assert.match(html, /<table>[\s\S]*<th>Name<\/th>/);
  assert.match(html, /\.table-column-resizer \{[^}]*cursor: col-resize;/);
  assert.match(html, /table\.is-column-resizable \{[^}]*max-width: none;[^}]*overflow: visible;/);
  assert.doesNotMatch(html, /table\.is-column-resizable \{[^}]*min-width: 100%/);
  assert.match(html, /document\.querySelectorAll\('\.markdown-content table'\)/);
  assert.match(html, /className='table-resizable-container'/);
  assert.match(html, /container\.append\(handle\)/);
  assert.match(html, /handle\.style\.left=offset\+'px'/);
  assert.match(html, /handle\.style\.height=table\.offsetHeight\+'px'/);
  assert.match(html, /table\.is-column-resizable \{[^}]*margin-bottom: 0;/);
  assert.doesNotMatch(html, /cell\.append\(handle\)/);
  assert.match(html, /handle\.addEventListener\('pointerdown'/);
  assert.match(html, /handle\.setPointerCapture\(event\.pointerId\)/);
  assert.match(html, /event\.key==='ArrowLeft'/);
  assert.match(html, /const minimum=48/);
});

test("does not embed the table resizer when the document has no table", () => {
  const html = markdownToHtml("# Heading\n\nParagraph\n");

  assert.doesNotMatch(html, /table-column-resizer/);
  assert.doesNotMatch(html, /is-resizing-table-column/);
});
