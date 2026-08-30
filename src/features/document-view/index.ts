import GithubSlugger from "github-slugger";
import { Lexer, marked, type Token } from "marked";
import { escapeHtml, plainTextFromHtml } from "../../utils/html.js";

export interface DocumentViewFeature {
  control: string;
  content: string;
  styles: string;
  script: string;
}

const UNSAFE_LINK_SCHEME = /^(?:javascript|vbscript|data):/i;

function sourceLinkHref(href: string): string | undefined {
  const normalized = href.trim().replace(/[\u0000-\u0020]+/g, "");
  if (UNSAFE_LINK_SCHEME.test(normalized)) return undefined;
  if (/^[a-z][a-z\d+.-]*:/i.test(normalized)) {
    return /^(?:https?|mailto):/i.test(normalized) ? href : undefined;
  }
  return href.replace(/\.(md|markdown)(?=([?#]|$))/i, ".html");
}

function renderInlineToken(token: Token): string {
  if (token.type === "strong") {
    return `<strong class="markdown-source-strong">${escapeHtml(token.raw)}</strong>`;
  }
  if (token.type === "em") {
    return `<em class="markdown-source-emphasis">${escapeHtml(token.raw)}</em>`;
  }
  if (token.type === "del") {
    return `<del class="markdown-source-delete">${escapeHtml(token.raw)}</del>`;
  }
  if (token.type === "codespan") {
    return `<span class="markdown-source-code-span">${escapeHtml(token.raw)}</span>`;
  }
  if (token.type === "link") {
    const href = sourceLinkHref(token.href);
    return href
      ? `<a class="markdown-source-link" href="${escapeHtml(href)}">${escapeHtml(token.raw)}</a>`
      : `<span class="markdown-source-link is-disabled">${escapeHtml(token.raw)}</span>`;
  }
  if (token.type === "image") {
    return `<span class="markdown-source-image">${escapeHtml(token.raw)}</span>`;
  }
  if (token.type === "url") {
    const href = sourceLinkHref(token.href);
    return href
      ? `<a class="markdown-source-link" href="${escapeHtml(href)}">${escapeHtml(token.raw)}</a>`
      : escapeHtml(token.raw);
  }
  return escapeHtml(token.raw);
}

function renderInlineSource(line: string): string {
  return Lexer.lexInline(line).map(renderInlineToken).join("");
}

function sourceLineKinds(lines: string[]): string[][] {
  const kinds = lines.map(() => [] as string[]);
  let fence: { marker: string; length: number } | undefined;

  for (const [index, line] of lines.entries()) {
    if (fence) {
      kinds[index]!.push("is-code-block");
      const closing = new RegExp(`^ {0,3}${fence.marker}{${fence.length},}\\s*$`);
      if (closing.test(line)) fence = undefined;
      continue;
    }

    const opening = /^ {0,3}(`{3,}|~{3,})/.exec(line);
    if (opening) {
      const run = opening[1]!;
      fence = { marker: run[0]!, length: run.length };
      kinds[index]!.push("is-code-block", "is-code-fence");
      continue;
    }
    if (/^(?: {4}|\t)/.test(line)) kinds[index]!.push("is-code-block");
    if (/^ {0,3}#{1,6}(?:\s|$)/.test(line)) kinds[index]!.push("is-heading");
    if (/^ {0,3}>/.test(line)) kinds[index]!.push("is-quote");
    if (/^\s*(?:[-+*]|\d+[.)])\s+/.test(line)) kinds[index]!.push("is-list");
    if (/^\s*(?:[-+*])\s+\[[ xX]\]\s+/.test(line)) kinds[index]!.push("is-task");
    if (/^ {0,3}(?:(?:\*\s*){3,}|(?:-\s*){3,}|(?:_\s*){3,})$/.test(line)) kinds[index]!.push("is-thematic-break");
    if (/^ {0,3}\[[^\]]+\]:\s*\S+/.test(line)) kinds[index]!.push("is-definition");
    if (/^ {0,3}(?:<!--|<\/?[A-Za-z][^>]*>)/.test(line)) kinds[index]!.push("is-html");
    if (/^\s*\|.*\|\s*$/.test(line) || /^\s*:?-{3,}:?(?:\s*\|\s*:?-{3,}:?)+\s*$/.test(line)) kinds[index]!.push("is-table");
    if (
      index > 0 &&
      /^ {0,3}(?:=+|-+)\s*$/.test(line) &&
      lines[index - 1]!.trim() !== ""
    ) {
      kinds[index]!.push("is-heading-marker");
      kinds[index - 1]!.push("is-heading");
    }
  }
  return kinds;
}

function sourceHeadingIds(lines: string[], kinds: string[][]): Array<string | undefined> {
  const ids: Array<string | undefined> = lines.map(() => undefined);
  const slugger = new GithubSlugger();
  for (const [index, line] of lines.entries()) {
    if (!kinds[index]!.includes("is-heading")) continue;
    const atx = /^ {0,3}#{1,6}(?:\s+|$)(.*)$/.exec(line);
    const source = atx
      ? atx[1]!.replace(/\s+#+\s*$/, "")
      : kinds[index + 1]?.includes("is-heading-marker")
        ? line
        : undefined;
    if (source === undefined) continue;
    const text = plainTextFromHtml(marked.parseInline(source, { async: false }));
    ids[index] = `markdown-source-${slugger.slug(text)}`;
  }
  return ids;
}

function renderSourceLines(markdown: string): string {
  const lines = markdown.split("\n");
  if (lines.length > 1 && lines.at(-1) === "") lines.pop();
  const kinds = sourceLineKinds(lines);
  const headingIds = sourceHeadingIds(lines, kinds);
  return lines
    .map(
      (line, index) => {
        const value = line.replace(/\r$/, "");
        const className = ["markdown-source-line", ...kinds[index]!].join(" ");
        const content = kinds[index]!.includes("is-code-block")
          ? escapeHtml(value)
          : renderInlineSource(value);
        const id = headingIds[index] ? ` id="${escapeHtml(headingIds[index]!)}"` : "";
        return `<span class="${className}"${id}>${content}</span>`;
      },
    )
    .join("");
}

export function createDocumentViewFeature(
  markdown: string,
  hasDiff: boolean,
): DocumentViewFeature {
  const control = `<button type="button" class="document-content-action document-preview-toggle" data-document-preview-toggle aria-label="Previewを表示" title="Previewを表示" aria-pressed="true"><span>Preview</span></button>
<button type="button" class="document-content-action document-source-toggle" data-document-source-toggle aria-label="コードを表示" title="コードを表示" aria-pressed="false"><span>コード</span></button>`;
  const content = `<main class="markdown-source-content" aria-label="Markdown原文" hidden><pre><code>${renderSourceLines(markdown)}</code></pre></main>`;
  const styles = `
.document-content{position:relative;grid-area:content;min-width:0}.document-content-actions{display:flex;min-height:44px;align-items:center;justify-content:flex-start;gap:4px;margin-bottom:12px;padding:0 4px;border-bottom:1px solid var(--borderColor-muted,#d8dee4)}.document-content-action{position:relative;display:inline-flex;height:36px;align-items:center;justify-content:center;gap:6px;padding:0 10px;color:var(--fgColor-muted,#59636e);font:inherit;font-size:.75rem;font-weight:600;background:transparent;border:0;border-radius:6px 6px 0 0;cursor:pointer}.document-content-action:hover:not(:disabled){color:var(--fgColor-default,#1f2328);background:var(--button-default-bgColor-hover,#eaeef2)}.document-content-action:focus-visible{outline:2px solid var(--focus-outlineColor,#0969da);outline-offset:-2px}.document-content-action>span{line-height:16px}.document-content-action[aria-pressed="true"]{color:var(--fgColor-default,#1f2328)}.document-content-action[aria-pressed="true"]::after{position:absolute;right:8px;bottom:-5px;left:8px;height:2px;background:var(--borderColor-accent-emphasis,#0969da);content:""}.document-content-action:disabled{color:var(--fgColor-muted,#59636e);opacity:.45;cursor:not-allowed}
.markdown-source-content{box-sizing:border-box;min-width:0;margin-bottom:72px;padding:8px 0 24px;color:var(--fgColor-default,#1f2328);background:transparent;border:0;border-radius:0;box-shadow:none}.markdown-source-content[hidden]{display:none}.markdown-source-content pre{margin:0;padding:8px 0;overflow:hidden;color:var(--codeBlock-fgColor,#24292f);background:transparent;border:0;border-radius:0;counter-reset:markdown-source-line}.markdown-source-content code{display:block;min-width:0;padding:0;color:inherit;background:transparent;white-space:normal;font:12px/1.5 ui-monospace,SFMono-Regular,SF Mono,Menlo,Consolas,monospace}.markdown-source-line{position:relative;display:block;min-height:1.5em;padding:0 20px 0 56px;overflow-wrap:anywhere;scroll-margin-top:96px;white-space:pre-wrap;background:linear-gradient(to right,var(--bgColor-default,#fff) 0 47px,var(--borderColor-muted,#d8dee4) 47px 48px,transparent 48px)}.markdown-source-line::before{position:absolute;top:0;bottom:0;left:0;box-sizing:border-box;width:48px;padding-right:12px;color:var(--fgColor-muted,#59636e);border-right:1px solid var(--borderColor-muted,#d8dee4);content:counter(markdown-source-line);counter-increment:markdown-source-line;text-align:right;user-select:none}
.markdown-source-line.is-heading{color:var(--fgColor-default,#1f2328);font-weight:700}.markdown-source-line.is-heading-marker{color:var(--fgColor-muted,#59636e);font-weight:700}.markdown-source-line.is-quote{color:var(--fgColor-muted,#59636e);background:linear-gradient(to right,var(--bgColor-default,#fff) 0 47px,var(--borderColor-muted,#d8dee4) 47px 48px,var(--bgColor-muted,#f6f8fa) 48px)}.markdown-source-line.is-quote::after{position:absolute;top:0;bottom:0;left:51px;width:3px;background:var(--borderColor-default,#d0d7de);content:""}.markdown-source-line.is-code-block{color:var(--codeBlock-fgColor,#24292f);background:linear-gradient(to right,var(--bgColor-default,#fff) 0 47px,var(--borderColor-muted,#d8dee4) 47px 48px,var(--bgColor-muted,#f6f8fa) 48px)}.markdown-source-line.is-code-fence{color:var(--fgColor-muted,#59636e)}.markdown-source-line.is-list{color:var(--fgColor-default,#1f2328)}.markdown-source-line.is-task{color:var(--fgColor-accent,#0969da)}.markdown-source-line.is-thematic-break,.markdown-source-line.is-definition{color:var(--fgColor-muted,#59636e)}.markdown-source-line.is-table{background:linear-gradient(to right,var(--bgColor-default,#fff) 0 47px,var(--borderColor-muted,#d8dee4) 47px 48px,var(--bgColor-muted,#f6f8fa) 48px)}.markdown-source-line.is-html{color:var(--fgColor-muted,#59636e)}.markdown-source-strong{font-weight:700}.markdown-source-emphasis{font-style:italic}.markdown-source-delete{color:var(--fgColor-muted,#59636e)}.markdown-source-code-span{padding:1px 3px;color:var(--codeBlock-fgColor,#24292f);background:var(--bgColor-neutral-muted,#818b981f);border-radius:3px}.markdown-source-link{color:var(--fgColor-accent,#0969da);text-decoration:underline;text-underline-offset:2px}.markdown-source-link:hover{filter:brightness(.85)}.markdown-source-link.is-disabled{color:var(--fgColor-danger,#d1242f);text-decoration-style:dotted}.markdown-source-image{color:var(--fgColor-done,#8250df)}
@media(max-width:900px){.markdown-source-content{margin-bottom:32px}}@media(max-width:600px){.document-content-actions{overflow-x:auto}.markdown-source-line{padding-right:12px;padding-left:48px;background:linear-gradient(to right,var(--bgColor-default,#fff) 0 39px,var(--borderColor-muted,#d8dee4) 39px 40px,transparent 40px)}.markdown-source-line.is-quote,.markdown-source-line.is-code-block,.markdown-source-line.is-table{background:linear-gradient(to right,var(--bgColor-default,#fff) 0 39px,var(--borderColor-muted,#d8dee4) 39px 40px,var(--bgColor-muted,#f6f8fa) 40px)}.markdown-source-line.is-quote::after{left:43px}.markdown-source-line::before{width:40px;padding-right:9px}}
.document-content{box-sizing:border-box;margin-bottom:72px;background:var(--bgColor-default,#fff);border:1px solid var(--borderColor-muted,#d8dee4);border-radius:8px;box-shadow:0 1px 2px rgba(31,35,40,.04);overflow:hidden}.document-content-actions{margin-bottom:0}.document-content>.markdown-content,.document-content>.document-diff-content{margin:0;border:0;border-radius:0;box-shadow:none}.document-content>.markdown-source-content{margin:0;padding-top:20px}@media(max-width:900px){.document-content{margin-bottom:32px}.document-content>.markdown-source-content{margin-bottom:0}}@media(max-width:600px){.document-content{border-radius:6px}.document-content>.markdown-content,.document-content>.document-diff-content{border-radius:0}}
.document-content-action{border-radius:6px}.document-replacement-menu{margin-left:auto}.document-content>.markdown-source-content{padding-top:0}.markdown-source-content pre{padding-top:0}.markdown-source-line::before{position:sticky;top:auto;bottom:auto;left:0;display:inline-block;height:1.5em;margin-left:-56px;margin-right:8px;background:var(--bgColor-default,#fff);vertical-align:top}@media(max-width:600px){.markdown-source-line::before{margin-left:-48px;margin-right:8px}}
.markdown-source-content pre::before{position:sticky;left:47px;display:block;width:1px;height:12px;background:var(--borderColor-muted,#d8dee4);content:""}@media(max-width:600px){.markdown-source-content pre::before{left:39px}}
`;
  const script = `<script>(()=>{
const parameter='document-view',previewButton=document.querySelector('[data-document-preview-toggle]'),sourceButton=document.querySelector('[data-document-source-toggle]'),replacementButton=document.querySelector('[data-replacement-menu]'),diffButton=document.querySelector('[data-document-diff-toggle]'),current=document.querySelector('.markdown-content'),source=document.querySelector('.markdown-source-content'),diff=document.querySelector('.document-diff-content'),available=${hasDiff},pageUrl=new URL(location.href);
let intent=['markdown','diff'].includes(pageUrl.searchParams.get(parameter))?pageUrl.searchParams.get(parameter):'current';
const update=url=>{url.searchParams.delete(parameter);if(intent==='markdown'||intent==='diff')url.searchParams.set(parameter,intent);return url};
function syncLinks(){for(const link of document.querySelectorAll('a[href]')){const raw=link.getAttribute('href');if(!raw||raw.startsWith('#'))continue;const url=new URL(raw,location.href);if(url.protocol===location.protocol&&url.host===location.host&&url.pathname.endsWith('.html'))link.href=update(url).href}}
function syncLabels(){const english=document.body.dataset.language==='en',showDiff=document.body.dataset.documentView==='diff',previewLabel=english?'Show preview':'Previewを表示',sourceLabel=english?'Show code':'コードを表示';previewButton.setAttribute('aria-label',previewLabel);previewButton.title=previewLabel;sourceButton.setAttribute('aria-label',sourceLabel);sourceButton.title=sourceLabel;const diffLabel=available?(showDiff?(english?'Show latest':'最新版を表示'):(english?'Show changes':'差分を表示')):(english?'No changes since the previous build':'前回からの変更はありません');diffButton.setAttribute('aria-label',diffLabel);diffButton.title=diffLabel}
function apply(view,write=true){intent=view;const actual=view==='markdown'?'markdown':view==='diff'&&available?'diff':'current',showCurrent=actual==='current',showSource=actual==='markdown',showDiff=actual==='diff';document.body.dataset.documentView=actual;current.hidden=!showCurrent;source.hidden=!showSource;diff.hidden=!showDiff;previewButton.setAttribute('aria-pressed',String(showCurrent));sourceButton.setAttribute('aria-pressed',String(showSource));if(replacementButton)replacementButton.disabled=!showCurrent;diffButton.setAttribute('aria-pressed',String(showDiff));diffButton.querySelector('[data-document-diff-icon]').hidden=showDiff;diffButton.querySelector('[data-document-current-icon]').hidden=!showDiff;syncLabels();if(write)history.replaceState(null,'',update(new URL(location.href)));syncLinks()}
window.marksitesSyncDocumentViewLabels=syncLabels;
previewButton.addEventListener('click',()=>apply('current'));sourceButton.addEventListener('click',()=>apply('markdown'));if(available)diffButton.addEventListener('click',()=>apply(document.body.dataset.documentView==='diff'?'current':'diff'));apply(intent,available||intent!=='diff');
})()</script>`;
  return { control, content, styles, script };
}
