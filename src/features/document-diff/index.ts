import { marked, Renderer, type MarkedOptions, type Token } from "marked";
import { createTableOfContentsFeature } from "../table-of-contents/index.js";

export interface DocumentDiffFeature {
  content: string;
  control: string;
  styles: string;
  script: string;
  hasChanges: boolean;
}

interface DiffPart {
  kind: "same" | "insert" | "delete";
  raw: string;
}

interface MarkdownBlock {
  raw: string;
  key: string;
}

function tokenRaw(token: Token): string {
  return "raw" in token && typeof token.raw === "string" ? token.raw : "";
}

function diffBlocks(previous: string, current: string): DiffPart[] {
  const blocks = (markdown: string): MarkdownBlock[] =>
    marked
      .lexer(markdown)
      .filter((token) => token.type !== "space")
      .map(tokenRaw)
      .filter(Boolean)
      .map((raw) => ({
        raw,
        key: raw.replace(/[ \t]+$/gm, "").trim(),
      }));
  const oldBlocks = blocks(previous);
  const newBlocks = blocks(current);
  if (oldBlocks.length * newBlocks.length > 2_000_000) {
    return [
      ...oldBlocks.map(({ raw }): DiffPart => ({ kind: "delete", raw })),
      ...newBlocks.map(({ raw }): DiffPart => ({ kind: "insert", raw })),
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
      parts.push({ kind: "same", raw: newBlocks[newIndex]!.raw });
      oldIndex++;
      newIndex++;
    } else if (
      newIndex < newBlocks.length &&
      (oldIndex === oldBlocks.length ||
          lengths[oldIndex]![newIndex + 1]! >
          lengths[oldIndex + 1]![newIndex]!)
    ) {
      parts.push({ kind: "insert", raw: newBlocks[newIndex++]!.raw });
    } else {
      parts.push({ kind: "delete", raw: oldBlocks[oldIndex++]!.raw });
    }
  }
  return parts;
}

function prefixIds(html: string): string {
  return html
    .replace(/\bid="([^"]+)"/g, 'id="diff-$1"')
    .replace(/\bhref="#([^"]+)"/g, 'href="#diff-$1"');
}

function inlineDiff(previous: string, current: string): string | undefined {
  const oldTokens = marked
    .lexer(previous)
    .filter((token) => token.type !== "space");
  const newTokens = marked
    .lexer(current)
    .filter((token) => token.type !== "space");
  if (
    oldTokens.length !== 1 ||
    newTokens.length !== 1 ||
    oldTokens[0]?.type !== "paragraph" ||
    newTokens[0]?.type !== "paragraph"
  )
    return undefined;
  if (
    /^ {0,3}#{1,6}\s/m.test(previous + current) ||
    /^.+\n(?:=+|-+)\s*$/m.test(previous + current)
  )
    return undefined;
  if (/[`*_[\]<>\\]/.test(previous + current)) return undefined;
  const segmenter = new Intl.Segmenter("ja", { granularity: "word" });
  const oldParts = [...segmenter.segment(previous.trim())].map(
    ({ segment }) => segment,
  );
  const newParts = [...segmenter.segment(current.trim())].map(
    ({ segment }) => segment,
  );
  if (oldParts.length * newParts.length > 100_000) return undefined;
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
    buffer += value;
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

export function createDocumentDiffFeature(
  current: string,
  previous: string | undefined,
  markedOptions: Omit<MarkedOptions, "async" | "renderer"> = {},
): DocumentDiffFeature {
  const parts = previous === undefined ? [] : diffBlocks(previous, current);
  const hasChanges = parts.some((part) => part.kind !== "same");
  const diffRenderer = new Renderer();
  createTableOfContentsFeature(diffRenderer, {
    enabled: false,
    title: "目次",
    minDepth: 1,
    maxDepth: 6,
  });
  const content = hasChanges
    ? prefixIds(
        parts
          .flatMap((part, index) => {
            if (
              part.kind === "insert" &&
              parts[index - 1]?.kind === "delete" &&
              inlineDiff(parts[index - 1]!.raw, part.raw) !== undefined
            )
              return [];
            if (part.kind !== "delete" || parts[index + 1]?.kind !== "insert")
              return [part];
            const combined = inlineDiff(part.raw, parts[index + 1]!.raw);
            if (!combined) return [part];
            return [{ kind: "same" as const, raw: combined }];
          })
          .map((part) => {
            const html = marked.parse(part.raw, {
              ...markedOptions,
              renderer: diffRenderer,
              async: false,
            });
            return part.kind === "same"
              ? html
              : `<div class="document-diff-block document-diff-${part.kind}">${html}</div>\n`;
          })
          .join(""),
      )
    : "";
  const disabled = hasChanges ? "" : " disabled";
  const label = hasChanges ? "差分を表示" : "前回からの変更はありません";
  const control = `<button type="button" class="site-header-action document-diff-toggle" data-document-diff-toggle aria-label="${label}" title="${label}" aria-pressed="false"${disabled}><svg data-document-diff-icon viewBox="0 0 16 16" aria-hidden="true"><circle cx="4" cy="3" r="1.5"/><circle cx="4" cy="13" r="1.5"/><circle cx="12" cy="5" r="1.5"/><path d="M4 4.5v7M5.5 4h2A4.5 4.5 0 0112 8.5V10"/></svg><svg data-document-current-icon viewBox="0 0 16 16" aria-hidden="true" hidden><path d="M3 1.75h6l4 4v8.5H3z"/><path d="M9 1.75v4h4M5.5 9h5M5.5 11.5h5"/></svg></button>`;
  const styles = `
body.markdown-body[data-theme="dark"]{--diff-insert-bg:#58a6ff1a;--diff-delete-bg:#9198a11a}body.markdown-body[data-theme="light"]{--diff-insert-bg:#0969da12;--diff-delete-bg:#59636e12}
.document-diff-content{grid-area:content;box-sizing:border-box;min-width:0;margin-bottom:72px;padding:clamp(28px,3vw,52px);color:var(--fgColor-default,#1f2328);background:var(--bgColor-default,#fff);border:1px solid var(--borderColor-muted,#d8dee4);border-radius:8px;box-shadow:0 1px 2px rgba(31,35,40,.04)}.document-diff-content[hidden]{display:none}.document-diff-block{position:relative;margin:0 -12px;padding:1px 12px 1px 22px;border-left:2px solid var(--fgColor-muted,#59636e)}.document-diff-block::before{position:absolute;top:3px;left:7px;font-weight:700;line-height:1;content:""}.document-diff-block.document-diff-insert{background:var(--diff-insert-bg,#0969da12);border-left-style:solid;border-left-color:var(--fgColor-accent,#0969da)}.document-diff-block.document-diff-insert::before{color:var(--fgColor-accent,#0969da);content:"+"}.document-diff-block.document-diff-delete{background:var(--diff-delete-bg,#59636e12);border-left-style:dashed;opacity:.82}.document-diff-block.document-diff-delete::before{color:var(--fgColor-muted,#59636e);content:"−"}.document-diff-block.document-diff-delete :is(a,button,input,select,textarea){pointer-events:none}.document-diff-inline-insert,.document-diff-inline-delete{padding:1px 2px;border-radius:2px;box-decoration-break:clone;-webkit-box-decoration-break:clone}.document-diff-inline-insert{color:var(--fgColor-default,#1f2328);background:var(--diff-insert-bg,#0969da12);text-decoration-line:underline;text-decoration-style:double;text-decoration-color:var(--fgColor-accent,#0969da);text-underline-offset:3px}.document-diff-inline-delete{color:var(--fgColor-muted,#59636e);background:var(--diff-delete-bg,#59636e12);text-decoration:line-through;text-decoration-thickness:2px}.document-diff-toggle[aria-pressed="true"]{color:var(--fgColor-accent,#0969da);background:var(--bgColor-accent-muted,#ddf4ff)}.document-diff-toggle:disabled{color:var(--fgColor-muted,#59636e);opacity:.45;cursor:not-allowed}.document-diff-toggle svg[hidden]{display:none}body[data-document-view="diff"] .markdown-content{display:none}@media(max-width:900px){.document-diff-content{margin-bottom:32px}}@media(max-width:600px){.document-diff-content{padding:24px 20px;border-radius:6px}}
`;
  const script = `<script>(()=>{
const parameter='document-view',button=document.querySelector('[data-document-diff-toggle]'),current=document.querySelector('.markdown-content'),diff=document.querySelector('.document-diff-content'),available=${hasChanges};
const update=url=>{if(document.body.dataset.documentView==='diff'||(!available&&new URL(location.href).searchParams.get(parameter)==='diff'))url.searchParams.set(parameter,'diff');else url.searchParams.delete(parameter);return url};
function syncLinks(){for(const link of document.querySelectorAll('a[href]')){const raw=link.getAttribute('href');if(!raw||raw.startsWith('#'))continue;const url=new URL(raw,location.href);if(url.protocol===location.protocol&&url.host===location.host&&url.pathname.endsWith('.html'))link.href=update(url).href}}
function apply(view,write=true){const showDiff=available&&view==='diff';document.body.dataset.documentView=showDiff?'diff':'current';current.hidden=showDiff;diff.hidden=!showDiff;button.setAttribute('aria-pressed',String(showDiff));button.querySelector('[data-document-diff-icon]').hidden=showDiff;button.querySelector('[data-document-current-icon]').hidden=!showDiff;const label=available?(showDiff?'最新版を表示':'差分を表示'):'前回からの変更はありません';button.setAttribute('aria-label',label);button.title=label;if(write)history.replaceState(null,'',update(new URL(location.href)));syncLinks();window.marksitesApplyLanguage?.()}
apply(new URL(location.href).searchParams.get(parameter)==='diff',available);if(available)button.addEventListener('click',()=>apply(document.body.dataset.documentView==='diff'?'current':'diff'));
})()</script>`;
  return { content, control, styles, script, hasChanges };
}
