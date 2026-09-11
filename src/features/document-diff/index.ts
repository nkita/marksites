import GithubSlugger from "github-slugger";
import { marked, Renderer, type MarkedOptions, type Token } from "marked";
import { escapeHtml, plainTextFromHtml } from "../../utils/html.js";
import { diffBlocks, type DiffPart } from "./blocks.js";
import { align, similarity, type Pair } from "./alignment.js";
import {
  inlineDiff as renderInlineDiff,
  codeDiff,
  type Sides,
} from "./inline.js";
import { diffStyles, diffScript } from "./presentation.js";

export interface DocumentDiffFeature {
  content: string;
  control: string;
  styles: string;
  script: string;
  hasChanges: boolean;
}
type RichToken = Token & Record<string, any>;

export function createDocumentDiffFeature(
  current: string,
  previous: string | undefined,
  markedOptions: Omit<MarkedOptions, "async" | "renderer"> = {},
): DocumentDiffFeature {
  const parts = previous === undefined ? [] : diffBlocks(previous, current);
  const hasChanges = parts.some((part) => part.kind !== "same");
  const inlineDiff = (old: string, current: string) =>
    renderInlineDiff(old, current, markedOptions);
  const renderers = [0, 1].map((side) => {
    const slugger = new GithubSlugger();
    const renderer = new Renderer();
    renderer.heading = ({ tokens, depth }) => {
      const text = renderer.parser.parseInline(tokens);
      return `<h${depth} id="${escapeHtml(slugger.slug(plainTextFromHtml(text)))}">${text}</h${depth}>\n`;
    };
    return renderer;
  });
  const render = (raw: string, side: number) =>
    marked
      .parse(raw, {
        ...markedOptions,
        renderer: renderers[side]!,
        async: false,
      })
      .replace(/\sid="([^"]+)"/g, ` id="${side ? "diff-" : "diff-old-"}$1"`)
      .replace(/href="#([^"]+)"/g, `href="#${side ? "diff-" : "diff-old-"}$1"`);
  const token = (raw: string) =>
    marked.lexer(raw).find((t) => t.type !== "space") as RichToken;
  const compare = (a: DiffPart, b: DiffPart) =>
    a.tokenType !== b.tokenType ? 0 : similarity(a.raw, b.raw);
  const rows: Pair<DiffPart>[] = [];
  for (let i = 0; i < parts.length; ) {
    const part = parts[i]!;
    if (part.kind === "same") {
      rows.push([part, part]);
      i++;
      continue;
    }
    const changed: DiffPart[] = [];
    while (i < parts.length && parts[i]!.kind !== "same")
      changed.push(parts[i++]!);
    rows.push(
      ...align(
        changed.filter((p) => p.kind === "delete"),
        changed.filter((p) => p.kind === "insert"),
        compare,
      ),
    );
  }
  const structural = (html: string, side: number) =>
    `<div class="document-diff-block document-diff-${side ? "insert" : "delete"}">${html}</div>`;
  const slot = (html: string, empty = false) =>
    `<span data-diff-line${empty ? ' class="document-diff-empty" aria-hidden="true"' : ""}>${html || "&#8203;"}</span>`;
  const inlineStructural = (html: string, side: number) =>
    `<span class="document-diff-block document-diff-${side ? "insert" : "delete"}">${html}</span>`;
  function detail(a: DiffPart, b: DiffPart): Sides | undefined {
    if (a.tokenType !== b.tokenType) return;
    const old = token(a.raw),
      next = token(b.raw);
    if (old.type === "paragraph" || old.type === "heading") {
      const words = inlineDiff(String(old.text), String(next.text));
      return [old, next].map((item, side) => {
        if (item.type === "paragraph") return `<p>${words[side]}</p>`;
        // Render original headings first so IDs follow each version's own sequence.
        return render(side ? b.raw : a.raw, side).replace(
          /(<h[1-6][^>]*>)[\s\S]*?(<\/h[1-6]>)/,
          (_match, start, end) => start + words[side] + end,
        );
      }) as Sides;
    }
    if (old.type === "code") {
      const pairs = align(
        String(old.text).split("\n"),
        String(next.text).split("\n"),
        similarity,
      );
      const output: Sides = ["", ""];
      for (const [left, right] of pairs) {
        const cells =
          left !== undefined && right !== undefined
            ? codeDiff(left, right)
            : [
                left === undefined ? "" : inlineStructural(escapeHtml(left), 0),
                right === undefined
                  ? ""
                  : inlineStructural(escapeHtml(right), 1),
              ];
        output[0] += slot(cells[0]!, left === undefined);
        output[1] += slot(cells[1]!, right === undefined);
      }
      return output.map(
        (html) => `<pre class="document-diff-code"><code>${html}</code></pre>`,
      ) as Sides;
    }
    if (old.type === "list" && old.ordered === next.ordered) {
      // Preserve nested/loose/task list markup as complete blocks.
      if (
        [...old.items, ...next.items].some(
          (item) =>
            item.task ||
            item.loose ||
            item.tokens.some((t: Token) => !["text", "space"].includes(t.type)),
        )
      )
        return;
      const pairs = align<RichToken>(old.items, next.items, (a, b) =>
        similarity(a.text, b.text),
      );
      const output: Sides = ["", ""];
      const numbers = [Number(old.start) || 1, Number(next.start) || 1];
      for (const [left, right] of pairs) {
        const cells =
          left && right
            ? inlineDiff(left.text, right.text)
            : [
                left
                  ? inlineStructural(
                      marked.parseInline(left.text, { async: false }),
                      0,
                    )
                  : "",
                right
                  ? inlineStructural(
                      marked.parseInline(right.text, { async: false }),
                      1,
                    )
                  : "",
              ];
        for (const side of [0, 1]) {
          const exists = side ? right : left;
          const value =
            old.ordered && exists ? ` value="${numbers[side]!++}"` : "";
          output[side as 0 | 1] +=
            `<li data-diff-line${value}${exists ? "" : ' class="document-diff-empty" aria-hidden="true"'}>${cells[side] || "&#8203;"}</li>`;
        }
      }
      return output.map((html, side) => {
        const t = side ? next : old,
          tag = t.ordered ? "ol" : "ul";
        return `<${tag}${t.ordered ? ` start="${Number(t.start) || 1}"` : ""}>${html}</${tag}>`;
      }) as Sides;
    }
    if (old.type === "table" && old.header.length === next.header.length) {
      const output: Sides = ["", ""];
      const tableRows = align<RichToken[]>(old.rows, next.rows, (a, b) => {
        const sameKey = a[0]?.text && a[0].text === b[0]?.text;
        return (
          similarity(
            a.map((c) => c.text).join("|"),
            b.map((c) => c.text).join("|"),
          ) + (sameKey ? 2 : 0)
        );
      });
      const row = (
        left: RichToken[] | undefined,
        right: RichToken[] | undefined,
        tag: string,
      ) => {
        const cells: Sides = ["", ""];
        for (let i = 0; i < old.header.length; i++) {
          const a = left?.[i],
            b = right?.[i];
          const words =
            a && b
              ? inlineDiff(a.text, b.text)
              : [
                  a
                    ? inlineStructural(
                        marked.parseInline(a.text, { async: false }),
                        0,
                      )
                    : "",
                  b
                    ? inlineStructural(
                        marked.parseInline(b.text, { async: false }),
                        1,
                      )
                    : "",
                ];
          for (const side of [0, 1]) {
            const alignment = (side ? next : old).align[i];
            cells[side as 0 | 1] +=
              `<${tag}${["left", "right", "center"].includes(alignment) ? ` style="text-align:${alignment}"` : ""}>${words[side]}</${tag}>`;
          }
        }
        return cells.map(
          (html, side) =>
            `<tr data-diff-line${(side ? right : left) ? "" : ' class="document-diff-empty" aria-hidden="true"'}>${html}</tr>`,
        ) as Sides;
      };
      const headers = row(old.header, next.header, "th");
      for (const [a, b] of tableRows) {
        const cells = row(a, b, "td");
        output[0] += cells[0];
        output[1] += cells[1];
      }
      return output.map(
        (html, side) =>
          `<div class="document-diff-table"><table><thead>${headers[side]}</thead><tbody>${html}</tbody></table></div>`,
      ) as Sides;
    }
    if (old.type === "blockquote") {
      const oldChildren = (old.tokens ?? []).filter(
        (t: Token) => t.type !== "space",
      );
      const newChildren = next.tokens.filter((t: Token) => t.type !== "space");
      if ([...oldChildren, ...newChildren].some((t) => t.type !== "paragraph"))
        return;
      const output: Sides = ["", ""];
      for (const [a, b] of align<RichToken>(oldChildren, newChildren, (a, b) =>
        similarity(a.text, b.text),
      )) {
        const cells =
          a && b
            ? inlineDiff(a.text, b.text)
            : [
                a
                  ? inlineStructural(
                      marked.parseInline(a.text, { async: false }),
                      0,
                    )
                  : "",
                b
                  ? inlineStructural(
                      marked.parseInline(b.text, { async: false }),
                      1,
                    )
                  : "",
              ];
        for (const side of [0, 1])
          output[side as 0 | 1] +=
            `<p data-diff-line${(side ? b : a) ? "" : ' class="document-diff-empty" aria-hidden="true"'}>${cells[side]}</p>`;
      }
      return output.map((html) => `<blockquote>${html}</blockquote>`) as Sides;
    }
  }
  const body = (hasChanges ? rows : [])
    .map(([a, b]) => {
      let cells: Sides;
      if (a && b && a.kind === "same")
        cells = [render(a.raw, 0), render(b.raw, 1)];
      else
        cells =
          a && b
            ? (detail(a, b) ?? [
                structural(render(a.raw, 0), 0),
                structural(render(b.raw, 1), 1),
              ])
            : [
                a ? structural(render(a.raw, 0), 0) : "",
                b ? structural(render(b.raw, 1), 1) : "",
              ];
      cells = cells.map((html, side) =>
        html
          .replace(
            /\\sid="(?!diff-)([^"]+)"/g,
            ` id="${side ? "diff-" : "diff-old-"}$1"`,
          )
          .replace(
            /href="#(?!diff-)([^"]+)"/g,
            `href="#${side ? "diff-" : "diff-old-"}$1"`,
          ),
      ) as Sides;
      return `<div class="document-diff-row">${cells.map((html, side) => `<section class="document-diff-cell document-diff-${side ? "current" : "previous"}${html ? "" : " document-diff-empty"}" aria-label="${side ? "現バージョン" : "前バージョン"}">${html}</section>`).join("")}</div>`;
    })
    .join("\n");
  const content = hasChanges
    ? `<div class="document-diff-comparison"><div class="document-diff-labels"><span>前バージョン</span><span>現バージョン</span></div>${body}</div>`
    : "";
  const disabled = hasChanges ? "" : " disabled";
  const label = hasChanges ? "差分を表示" : "前回からの変更はありません";
  const control = `<button type="button" class="document-content-action document-diff-toggle" data-document-diff-toggle aria-label="${label}" title="${label}" aria-pressed="false"${disabled}><span>差分</span></button>`;

  return {
    content,
    control,
    styles: diffStyles,
    script: hasChanges ? diffScript : "",
    hasChanges,
  };
}
