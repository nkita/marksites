import { marked, type Token, type MarkedOptions } from "marked";
import { escapeHtml } from "../../utils/html.js";
import { align } from "./alignment.js";

export type Sides = [string, string];
type InlineToken = Token & {
  text?: string;
  href?: string;
  title?: string;
  tokens?: Token[];
};
export const change = (html: string, side: number): string =>
  html
    ? `<${side ? "ins" : "del"} class="document-diff-inline-${side ? "insert" : "delete"}">${html}</${side ? "ins" : "del"}>`
    : "";

function words(old: string, current: string): Sides {
  const segmenter = new Intl.Segmenter("ja", { granularity: "word" });
  const split = (value: string) =>
    [...segmenter.segment(value)].map(({ segment }) => segment);
  const result: Sides = ["", ""];
  for (const [a, b] of align(split(old), split(current), (a, b) =>
    a === b ? 1 : 0,
  )) {
    if (a === b) {
      result[0] += escapeHtml(a ?? "");
      result[1] += escapeHtml(b ?? "");
    } else {
      result[0] += change(escapeHtml(a ?? ""), 0);
      result[1] += change(escapeHtml(b ?? ""), 1);
    }
  }
  return result.map(html => html
    .replace(/<\/del><del class="document-diff-inline-delete">/g, "")
    .replace(/<\/ins><ins class="document-diff-inline-insert">/g, "")) as Sides;
}

export function inlineDiff(
  old: string,
  current: string,
  options: Omit<MarkedOptions, "async" | "renderer"> = {},
): Sides {
  const result: Sides = ["", ""];
  const render = (token: InlineToken) =>
    marked.parseInline(token.raw, { ...options, async: false });
  const tokens = (raw: string) => {
    const result = marked.Lexer.lexInline(raw) as InlineToken[];
    if (options.walkTokens) marked.walkTokens(result, options.walkTokens);
    return result;
  };
  const pairs = align(tokens(old), tokens(current), (a, b) =>
    a.raw === b.raw ? 4 : a.type === b.type ? 1 : 0,
  );
  for (const [a, b] of pairs) {
    let parts: Sides;
    if (a && b && a.raw === b.raw) parts = [render(a), render(b)];
    else if (a && b && a.type === "text" && b.type === "text")
      parts = words(a.text ?? "", b.text ?? "");
    else if (
      a &&
      b &&
      ["strong", "em", "del", "link"].includes(a.type) &&
      a.type === b.type
    ) {
      parts = inlineDiff(a.text ?? "", b.text ?? "", options);
      parts = parts.map((html, side) => {
        const token = side ? b : a;
        if (token.type !== "link")
          return `<${token.type}>${html}</${token.type}>`;
        const changed = a.href !== b.href || a.title !== b.title;
        const target = changed
          ? `<small class="document-diff-link-target" aria-label="リンク先">${change(escapeHtml(token.href ?? ""), side)}</small>`
          : "";
        return `<a href="${escapeHtml(token.href ?? "")}"${token.title ? ` title="${escapeHtml(token.title)}"` : ""}>${html}</a>${target}`;
      }) as Sides;
    } else
      parts = [a ? change(render(a), 0) : "", b ? change(render(b), 1) : ""];
    result[0] += parts[0];
    result[1] += parts[1];
  }
  return result;
}

export function codeDiff(old: string, current: string): Sides {
  return words(old, current);
}
