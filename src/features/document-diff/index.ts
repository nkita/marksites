import GithubSlugger from "github-slugger";
import { marked, Renderer, type MarkedOptions, type Token } from "marked";
import { escapeHtml, plainTextFromHtml } from "../../utils/html.js";

export interface DocumentDiffFeature {
  content: string;
  control: string;
  styles: string;
  hasChanges: boolean;
}

interface DiffPart {
  kind: "same" | "insert" | "delete";
  raw: string;
  tokenType: string;
}

interface MarkdownBlock {
  raw: string;
  key: string;
  tokenType: string;
}

function tokenRaw(token: Token): string {
  return "raw" in token && typeof token.raw === "string" ? token.raw : "";
}

function diffBlocks(previous: string, current: string): DiffPart[] {
  const blocks = (markdown: string): MarkdownBlock[] =>
    marked
      .lexer(markdown)
      .filter((token) => token.type !== "space")
      .map((token) => ({
        raw: tokenRaw(token),
        key: tokenRaw(token).replace(/[ \t]+$/gm, "").trim(),
        tokenType: token.type,
      }))
      .filter(({ raw }) => Boolean(raw));
  const oldBlocks = blocks(previous);
  const newBlocks = blocks(current);
  if (oldBlocks.length * newBlocks.length > 2_000_000) {
    return [
      ...oldBlocks.map(({ raw, tokenType }): DiffPart => ({ kind: "delete", raw, tokenType })),
      ...newBlocks.map(({ raw, tokenType }): DiffPart => ({ kind: "insert", raw, tokenType })),
    ];
  }
  const lengths = Array.from(
    { length: oldBlocks.length + 1 },
    () => new Uint32Array(newBlocks.length + 1),
  );
  for (let oldIndex = oldBlocks.length - 1; oldIndex >= 0; oldIndex--) {
    for (let newIndex = newBlocks.length - 1; newIndex >= 0; newIndex--) {
      lengths[oldIndex]![newIndex] =
        oldBlocks[oldIndex]!.key === newBlocks[newIndex]!.key
          ? lengths[oldIndex + 1]![newIndex + 1]! + 1
          : Math.max(
              lengths[oldIndex + 1]![newIndex]!,
              lengths[oldIndex]![newIndex + 1]!,
            );
    }
  }
  const parts: DiffPart[] = [];
  let oldIndex = 0;
  let newIndex = 0;
  while (oldIndex < oldBlocks.length || newIndex < newBlocks.length) {
    if (
      oldIndex < oldBlocks.length &&
      newIndex < newBlocks.length &&
      oldBlocks[oldIndex]!.key === newBlocks[newIndex]!.key
    ) {
      parts.push({ kind: "same", raw: newBlocks[newIndex]!.raw, tokenType: newBlocks[newIndex]!.tokenType });
      oldIndex++;
      newIndex++;
    } else if (
      newIndex < newBlocks.length &&
      (oldIndex === oldBlocks.length ||
          lengths[oldIndex]![newIndex + 1]! >
          lengths[oldIndex + 1]![newIndex]!)
    ) {
      const block = newBlocks[newIndex++]!;
      parts.push({ kind: "insert", raw: block.raw, tokenType: block.tokenType });
    } else {
      const block = oldBlocks[oldIndex++]!;
      parts.push({ kind: "delete", raw: block.raw, tokenType: block.tokenType });
    }
  }
  return parts;
}

function prefixIds(html: string): string {
  return html
    .replace(/\bid="([^"]+)"/g, 'id="diff-$1"')
    .replace(/\bhref="#([^"]+)"/g, 'href="#diff-$1"');
}

function wordDiff(previous: string, current: string): string {
  const segmenter = new Intl.Segmenter("ja", { granularity: "word" });
  const oldParts = [...segmenter.segment(previous)].map(
    ({ segment }) => segment,
  );
  const newParts = [...segmenter.segment(current)].map(
    ({ segment }) => segment,
  );
  if (oldParts.length * newParts.length > 100_000)
    return `<del class="document-diff-inline-delete">${escapeHtml(previous)}</del><ins class="document-diff-inline-insert">${escapeHtml(current)}</ins>`;
  const lengths = Array.from(
    { length: oldParts.length + 1 },
    () => new Uint32Array(newParts.length + 1),
  );
  for (let oldIndex = oldParts.length - 1; oldIndex >= 0; oldIndex--) {
    for (let newIndex = newParts.length - 1; newIndex >= 0; newIndex--) {
      lengths[oldIndex]![newIndex] =
        oldParts[oldIndex] === newParts[newIndex]
          ? lengths[oldIndex + 1]![newIndex + 1]! + 1
          : Math.max(
              lengths[oldIndex + 1]![newIndex]!,
              lengths[oldIndex]![newIndex + 1]!,
            );
    }
  }
  const output: string[] = [];
  let oldIndex = 0;
  let newIndex = 0;
  let kind: "same" | "delete" | "insert" | undefined;
  let buffer = "";
  const flush = (): void => {
    if (!buffer) return;
    output.push(
      kind === "delete"
        ? `<del class="document-diff-inline-delete">${buffer}</del>`
        : kind === "insert"
          ? `<ins class="document-diff-inline-insert">${buffer}</ins>`
          : buffer,
    );
    buffer = "";
  };
  const append = (nextKind: typeof kind, value: string): void => {
    if (kind !== nextKind) flush();
    kind = nextKind;
    buffer += escapeHtml(value);
  };
  while (oldIndex < oldParts.length || newIndex < newParts.length) {
    if (
      oldIndex < oldParts.length &&
      newIndex < newParts.length &&
      oldParts[oldIndex] === newParts[newIndex]
    ) {
      append("same", newParts[newIndex]!);
      oldIndex++;
      newIndex++;
    } else if (
      newIndex < newParts.length &&
      (oldIndex === oldParts.length ||
        lengths[oldIndex]![newIndex + 1]! >
          lengths[oldIndex + 1]![newIndex]!)
    ) {
      append("insert", newParts[newIndex++]!);
    } else {
      append("delete", oldParts[oldIndex++]!);
    }
  }
  flush();
  return output.join("");
}

function oneToken(raw: string): Token | undefined {
  const tokens = marked.lexer(raw).filter((token) => token.type !== "space");
  return tokens.length === 1 ? tokens[0] : undefined;
}

function inlineTokens(markdown: string): RichToken[] {
  return marked.Lexer.lexInline(markdown) as RichToken[];
}

function renderInlineToken(token: RichToken, deleted = false): string {
  if (token.type === "link") {
    const href = escapeHtml(String(token.href ?? ""));
    const title = token.title
      ? ` title="${escapeHtml(String(token.title))}"`
      : "";
    const disabled = deleted
      ? ' class="document-diff-link-delete" aria-disabled="true" tabindex="-1"'
      : "";
    return `<a href="${href}"${title}${disabled}>${marked.parseInline(String(token.text ?? ""), { async: false })}</a>`;
  }
  return marked.parseInline(String(token.raw ?? ""), { async: false });
}

function inlineTokenDiff(previous: string, current: string): string {
  const oldTokens = inlineTokens(previous);
  const newTokens = inlineTokens(current);
  const output: string[] = [];
  for (let index = 0; index < Math.max(oldTokens.length, newTokens.length); index++) {
    const oldToken = oldTokens[index];
    const newToken = newTokens[index];
    if (!oldToken && newToken) {
      output.push(`<ins class="document-diff-inline-insert">${renderInlineToken(newToken)}</ins>`);
      continue;
    }
    if (oldToken && !newToken) {
      output.push(`<del class="document-diff-inline-delete">${renderInlineToken(oldToken, true)}</del>`);
      continue;
    }
    if (!oldToken || !newToken) continue;
    if (oldToken.type === "text" && newToken.type === "text") {
      output.push(wordDiff(String(oldToken.text), String(newToken.text)));
      continue;
    }
    if (oldToken.type === newToken.type && ["strong", "em", "del"].includes(newToken.type)) {
      const tag = newToken.type === "strong" ? "strong" : newToken.type;
      output.push(`<${tag}>${inlineTokenDiff(String(oldToken.text), String(newToken.text))}</${tag}>`);
      continue;
    }
    if (oldToken.type === "link" && newToken.type === "link") {
      const oldHref = String(oldToken.href ?? "");
      const newHref = String(newToken.href ?? "");
      const title = newToken.title
        ? ` title="${escapeHtml(String(newToken.title))}"`
        : "";
      output.push(`<a href="${escapeHtml(newHref)}"${title}>${inlineTokenDiff(String(oldToken.text ?? ""), String(newToken.text ?? ""))}</a>`);
      if (oldHref !== newHref || oldToken.title !== newToken.title) {
        output.push(`<span class="document-diff-link-target" aria-label="リンク先の変更"> (<del class="document-diff-inline-delete">${escapeHtml(oldHref)}</del><span aria-hidden="true"> → </span><ins class="document-diff-inline-insert">${escapeHtml(newHref)}</ins>)</span>`);
      }
      continue;
    }
    if (oldToken.raw === newToken.raw) {
      output.push(renderInlineToken(newToken));
      continue;
    }
    output.push(`<del class="document-diff-inline-delete">${renderInlineToken(oldToken, true)}</del><ins class="document-diff-inline-insert">${renderInlineToken(newToken)}</ins>`);
  }
  return output.join("");
}

function paragraphDiff(previous: string, current: string): string | undefined {
  const oldToken = oneToken(previous);
  const newToken = oneToken(current);
  if (oldToken?.type !== "paragraph" || newToken?.type !== "paragraph")
    return undefined;
  return `<p>${inlineTokenDiff(String(oldToken.text), String(newToken.text))}</p>\n`;
}

function codeLineDiff(previous: string[], current: string[]): string[] {
  const lengths = Array.from(
    { length: previous.length + 1 },
    () => new Uint32Array(current.length + 1),
  );
  for (let oldIndex = previous.length - 1; oldIndex >= 0; oldIndex--) {
    for (let newIndex = current.length - 1; newIndex >= 0; newIndex--) {
      lengths[oldIndex]![newIndex] =
        previous[oldIndex] === current[newIndex]
          ? lengths[oldIndex + 1]![newIndex + 1]! + 1
          : Math.max(
              lengths[oldIndex + 1]![newIndex]!,
              lengths[oldIndex]![newIndex + 1]!,
            );
    }
  }
  const rendered: string[] = [];
  let oldIndex = 0;
  let newIndex = 0;
  while (oldIndex < previous.length || newIndex < current.length) {
    if (previous[oldIndex] === current[newIndex]) {
      rendered.push(`<span>${escapeHtml(current[newIndex] ?? "")}</span>`);
      oldIndex++;
      newIndex++;
      continue;
    }
    const deleted: string[] = [];
    const inserted: string[] = [];
    while (
      oldIndex < previous.length ||
      newIndex < current.length
    ) {
      if (previous[oldIndex] === current[newIndex]) break;
      if (
        newIndex < current.length &&
        (oldIndex === previous.length ||
          lengths[oldIndex]![newIndex + 1]! >
            lengths[oldIndex + 1]![newIndex]!)
      ) {
        inserted.push(current[newIndex++]!);
      } else {
        deleted.push(previous[oldIndex++]!);
      }
    }
    if (deleted.length === 1 && inserted.length > 1) {
      const source = new Set(
        [...new Intl.Segmenter("ja", { granularity: "word" }).segment(deleted[0]!)].map(
          ({ segment }) => segment,
        ),
      );
      let bestIndex = 0;
      let bestScore = -1;
      inserted.forEach((line, index) => {
        const score = [...new Intl.Segmenter("ja", { granularity: "word" }).segment(line)]
          .filter(({ segment }) => source.has(segment)).length;
        if (score > bestScore) {
          bestIndex = index;
          bestScore = score;
        }
      });
      inserted.forEach((line, index) => {
        rendered.push(
          index === bestIndex
            ? `<span>${wordDiff(deleted[0]!, line)}</span>`
            : `<span class="document-diff-structural-insert">${escapeHtml(line)}</span>`,
        );
      });
      continue;
    }
    for (let index = 0; index < Math.max(deleted.length, inserted.length); index++) {
      const oldLine = deleted[index];
      const newLine = inserted[index];
      if (oldLine !== undefined && newLine !== undefined)
        rendered.push(`<span>${wordDiff(oldLine, newLine)}</span>`);
      else if (oldLine !== undefined)
        rendered.push(`<span class="document-diff-structural-delete">${escapeHtml(oldLine)}</span>`);
      else
        rendered.push(`<span class="document-diff-structural-insert">${escapeHtml(newLine ?? "")}</span>`);
    }
  }
  return rendered;
}

type RichToken = Token & Record<string, unknown>;

function structuredDiff(
  previous: DiffPart,
  current: DiffPart,
  slugger: GithubSlugger,
): string | undefined {
  if (previous.tokenType !== current.tokenType) return undefined;
  const oldToken = oneToken(previous.raw) as RichToken | undefined;
  const newToken = oneToken(current.raw) as RichToken | undefined;
  if (!oldToken || !newToken) return undefined;
  if (newToken.type === "paragraph") return paragraphDiff(previous.raw, current.raw);
  if (newToken.type === "heading") {
    const depth = Number(newToken.depth);
    const oldText = String(oldToken.text ?? "");
    const newText = String(newToken.text ?? "");
    const id = slugger.slug(
      plainTextFromHtml(marked.parseInline(newText, { async: false })),
    );
    return `<h${depth} id="${escapeHtml(id)}">${inlineTokenDiff(oldText, newText)}</h${depth}>\n`;
  }
  if (newToken.type === "list") {
    const oldItems = oldToken.items as Array<RichToken>;
    const newItems = newToken.items as Array<RichToken>;
    if (
      oldToken.ordered !== newToken.ordered ||
      [...oldItems, ...newItems].some((item) =>
        (item.tokens as Token[]).some((token) => token.type === "list"),
      )
    )
      return undefined;
    const tag = newToken.ordered ? "ol" : "ul";
    const items: string[] = [];
    for (let index = 0; index < Math.max(oldItems.length, newItems.length); index++) {
      const oldItem = oldItems[index];
      const newItem = newItems[index];
      if (oldItem && newItem)
        items.push(`<li>${inlineTokenDiff(String(oldItem.text), String(newItem.text))}</li>`);
      else if (oldItem)
        items.push(`<li class="document-diff-structural-delete">${escapeHtml(String(oldItem.text))}</li>`);
      else if (newItem)
        items.push(`<li class="document-diff-structural-insert">${escapeHtml(String(newItem.text))}</li>`);
    }
    return `<${tag}>\n${items.join("\n")}\n</${tag}>\n`;
  }
  if (newToken.type === "blockquote") {
    const oldParagraphs = (oldToken.tokens as RichToken[]).filter((token) => token.type === "paragraph");
    const newParagraphs = (newToken.tokens as RichToken[]).filter((token) => token.type === "paragraph");
    const paragraphs: string[] = [];
    for (let index = 0; index < Math.max(oldParagraphs.length, newParagraphs.length); index++) {
      const oldParagraph = oldParagraphs[index];
      const newParagraph = newParagraphs[index];
      if (oldParagraph && newParagraph)
        paragraphs.push(`<p>${inlineTokenDiff(String(oldParagraph.text), String(newParagraph.text))}</p>`);
      else if (oldParagraph)
        paragraphs.push(`<p class="document-diff-structural-delete">${escapeHtml(String(oldParagraph.text))}</p>`);
      else if (newParagraph)
        paragraphs.push(`<p class="document-diff-structural-insert">${escapeHtml(String(newParagraph.text))}</p>`);
    }
    return `<blockquote>\n${paragraphs.join("\n")}\n</blockquote>\n`;
  }
  if (newToken.type === "table") {
    const oldHeader = oldToken.header as RichToken[];
    const newHeader = newToken.header as RichToken[];
    const oldRows = oldToken.rows as RichToken[][];
    const newRows = newToken.rows as RichToken[][];
    const cells = (oldCells: RichToken[] = [], newCells: RichToken[] = [], tag = "td") =>
      Array.from({ length: Math.max(oldCells.length, newCells.length) }, (_, index) => {
        const oldCell = oldCells[index], newCell = newCells[index];
        const oldText = String(oldCell?.text ?? "");
        const newText = String(newCell?.text ?? "");
        const kind = oldCell && !newCell ? "delete" : newCell && !oldCell ? "insert" : "";
        const content = oldCell && newCell
          ? oldText === newText
            ? marked.parseInline(newText, { async: false })
            : inlineTokenDiff(oldText, newText)
          : marked.parseInline(newText || oldText, { async: false });
        return `<${tag}${kind ? ` class="document-diff-structural-${kind}"` : ""}>${content}</${tag}>`;
      }).join("");
    const rows: string[] = [];
    for (let index = 0; index < Math.max(oldRows.length, newRows.length); index++) {
      const oldRow = oldRows[index], newRow = newRows[index];
      const kind = oldRow && !newRow ? "delete" : newRow && !oldRow ? "insert" : "";
      rows.push(`<tr${kind ? ` class="document-diff-structural-${kind}"` : ""}>${cells(oldRow, newRow)}</tr>`);
    }
    return `<table>\n<thead><tr>${cells(oldHeader, newHeader, "th")}</tr></thead>\n<tbody>${rows.join("\n")}</tbody>\n</table>\n`;
  }
  if (newToken.type === "code") {
    const oldLines = String(oldToken.text ?? "").split("\n");
    const newLines = String(newToken.text ?? "").split("\n");
    const language = escapeHtml(String(newToken.lang ?? ""));
    return `<pre class="document-diff-code"><code${language ? ` class="language-${language}"` : ""}>${codeLineDiff(oldLines, newLines).join("\n")}</code></pre>\n`;
  }
  return undefined;
}

export function createDocumentDiffFeature(
  current: string,
  previous: string | undefined,
  markedOptions: Omit<MarkedOptions, "async" | "renderer"> = {},
): DocumentDiffFeature {
  const parts = previous === undefined ? [] : diffBlocks(previous, current);
  const hasChanges = parts.some((part) => part.kind !== "same");
  const slugger = new GithubSlugger();
  const diffRenderer = new Renderer();
  diffRenderer.heading = ({ tokens, depth }) => {
    const rendered = diffRenderer.parser.parseInline(tokens);
    const id = slugger.slug(plainTextFromHtml(rendered));
    return `<h${depth} id="${escapeHtml(id)}">${rendered}</h${depth}>\n`;
  };
  const renderedParts: string[] = [];
  const renderPart = (part: DiffPart): string => {
    const html = marked.parse(part.raw, {
      ...markedOptions,
      renderer: diffRenderer,
      async: false,
    });
    return part.kind === "same"
      ? html
      : `<div class="document-diff-block document-diff-${part.kind}">${html}</div>\n`;
  };
  if (hasChanges) {
    for (let index = 0; index < parts.length; index++) {
      const part = parts[index]!;
      if (part.kind !== "same") {
        let end = index;
        while (end < parts.length && parts[end]!.kind !== "same") end++;
        const changed = parts.slice(index, end);
        const deleted = changed.filter((item) => item.kind === "delete");
        const inserted = changed.filter((item) => item.kind === "insert");
        for (
          let changedIndex = 0;
          changedIndex < Math.max(deleted.length, inserted.length);
          changedIndex++
        ) {
          const oldPart = deleted[changedIndex];
          const newPart = inserted[changedIndex];
          if (oldPart && newPart) {
            const structured = structuredDiff(oldPart, newPart, slugger);
            if (structured !== undefined) {
              renderedParts.push(structured);
              continue;
            }
          }
          if (oldPart) renderedParts.push(renderPart(oldPart));
          if (newPart) renderedParts.push(renderPart(newPart));
        }
        index = end - 1;
        continue;
      }
      renderedParts.push(renderPart(part));
    }
  }
  const content = hasChanges ? prefixIds(renderedParts.join("")) : "";
  const disabled = hasChanges ? "" : " disabled";
  const label = hasChanges ? "差分を表示" : "前回からの変更はありません";
  const control = `<button type="button" class="site-header-action document-diff-toggle" data-document-diff-toggle aria-label="${label}" title="${label}" aria-pressed="false"${disabled}><svg data-document-diff-icon viewBox="0 0 16 16" aria-hidden="true"><circle cx="4" cy="3" r="1.5"/><circle cx="4" cy="13" r="1.5"/><circle cx="12" cy="5" r="1.5"/><path d="M4 4.5v7M5.5 4h2A4.5 4.5 0 0112 8.5V10"/></svg><svg data-document-current-icon viewBox="0 0 16 16" aria-hidden="true" hidden><path d="M3 1.75h6l4 4v8.5H3z"/><path d="M9 1.75v4h4M5.5 9h5M5.5 11.5h5"/></svg></button>`;
  const styles = `
body.markdown-body[data-theme="dark"]{--diff-insert-bg:#58a6ff1a;--diff-delete-bg:#ff7b7226;--diff-delete-fg:#ff938a}body.markdown-body[data-theme="light"]{--diff-insert-bg:#0969da12;--diff-delete-bg:#cf222e18;--diff-delete-fg:#b4232c}
.document-diff-structural-insert{background:var(--diff-insert-bg,#0969da12);box-shadow:inset 3px 0 var(--fgColor-accent,#0969da)}.document-diff-structural-delete{color:var(--diff-delete-fg,#b4232c);background:var(--diff-delete-bg,#cf222e18);text-decoration:line-through;text-decoration-thickness:2px}.document-diff-code code>span{display:block;min-height:1.5em;white-space:pre-wrap}.document-diff-link-target{margin-inline-start:2px;color:var(--fgColor-muted,#59636e);font-size:.875em;overflow-wrap:anywhere}.document-diff-link-delete{pointer-events:none}
.document-diff-content{box-sizing:border-box;min-width:0;margin-bottom:72px;padding:clamp(28px,3vw,52px);color:var(--fgColor-default,#1f2328);background:var(--bgColor-default,#fff);border:1px solid var(--borderColor-muted,#d8dee4);border-radius:8px;box-shadow:0 1px 2px rgba(31,35,40,.04)}.document-diff-content[hidden]{display:none}.document-diff-block{position:relative;margin:0 -12px;padding:1px 12px 1px 22px;border-left:2px solid var(--fgColor-muted,#59636e)}.document-diff-block::before{position:absolute;top:3px;left:7px;font-weight:700;line-height:1;content:""}.document-diff-block.document-diff-insert{background:var(--diff-insert-bg,#0969da12);border-left-style:solid;border-left-color:var(--fgColor-accent,#0969da)}.document-diff-block.document-diff-insert::before{color:var(--fgColor-accent,#0969da);content:"+"}.document-diff-block.document-diff-delete{color:var(--diff-delete-fg,#b4232c);background:var(--diff-delete-bg,#cf222e18);border-left-color:var(--diff-delete-fg,#b4232c);border-left-style:dashed;opacity:.9}.document-diff-block.document-diff-delete::before{color:var(--diff-delete-fg,#b4232c);content:"−"}.document-diff-block.document-diff-delete :is(a,button,input,select,textarea){pointer-events:none}.document-diff-inline-insert,.document-diff-inline-delete{padding:1px 2px;border-radius:2px;box-decoration-break:clone;-webkit-box-decoration-break:clone}.document-diff-inline-insert{color:var(--fgColor-default,#1f2328);background:var(--diff-insert-bg,#0969da12);text-decoration-line:underline;text-decoration-style:double;text-decoration-color:var(--fgColor-accent,#0969da);text-underline-offset:3px}.document-diff-inline-delete{color:var(--diff-delete-fg,#b4232c);background:var(--diff-delete-bg,#cf222e18);text-decoration:line-through;text-decoration-thickness:2px}.document-diff-toggle[aria-pressed="true"]{color:var(--fgColor-accent,#0969da);background:var(--bgColor-accent-muted,#ddf4ff)}.document-diff-toggle:disabled{color:var(--fgColor-muted,#59636e);opacity:.45;cursor:not-allowed}.document-diff-toggle svg[hidden]{display:none}@media(max-width:900px){.document-diff-content{margin-bottom:32px}}@media(max-width:600px){.document-diff-content{padding:24px 20px;border-radius:6px}}
`;
  return { content, control, styles, hasChanges };
}
