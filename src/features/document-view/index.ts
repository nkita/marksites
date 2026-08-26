import { escapeHtml } from "../../utils/html.js";

export interface DocumentViewFeature {
  control: string;
  content: string;
  styles: string;
  script: string;
}

function renderSourceLines(markdown: string): string {
  const lines = markdown.split("\n");
  if (lines.length > 1 && lines.at(-1) === "") lines.pop();
  return lines
    .map(
      (line) =>
        `<span class="markdown-source-line">${escapeHtml(line.replace(/\r$/, ""))}</span>`,
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
.markdown-source-content{box-sizing:border-box;min-width:0;margin-bottom:72px;padding:8px 0 24px;color:var(--fgColor-default,#1f2328);background:transparent;border:0;border-radius:0;box-shadow:none}.markdown-source-content[hidden]{display:none}.markdown-source-content pre{margin:0;padding:8px 0;overflow:auto;color:var(--codeBlock-fgColor,#24292f);background:transparent;border:0;border-radius:0;counter-reset:markdown-source-line}.markdown-source-content code{display:block;min-width:max-content;padding:0;color:inherit;background:transparent;white-space:pre;font:12px/1.5 ui-monospace,SFMono-Regular,SF Mono,Menlo,Consolas,monospace}.markdown-source-line{position:relative;display:block;min-height:1.5em;padding:0 20px 0 64px}.markdown-source-line::before{position:absolute;top:0;bottom:0;left:0;box-sizing:border-box;width:48px;padding-right:12px;color:var(--fgColor-muted,#59636e);border-right:1px solid var(--borderColor-muted,#d8dee4);content:counter(markdown-source-line);counter-increment:markdown-source-line;text-align:right;user-select:none}
@media(max-width:900px){.markdown-source-content{margin-bottom:32px}}@media(max-width:600px){.document-content-actions{overflow-x:auto}.markdown-source-line{padding-right:12px;padding-left:52px}.markdown-source-line::before{width:40px;padding-right:9px}}
.document-content{box-sizing:border-box;margin-bottom:72px;background:var(--bgColor-default,#fff);border:1px solid var(--borderColor-muted,#d8dee4);border-radius:8px;box-shadow:0 1px 2px rgba(31,35,40,.04);overflow:hidden}.document-content-actions{margin-bottom:0}.document-content>.markdown-content,.document-content>.document-diff-content{margin:0;border:0;border-radius:0;box-shadow:none}.document-content>.markdown-source-content{margin:0;padding-top:20px}@media(max-width:900px){.document-content{margin-bottom:32px}.document-content>.markdown-source-content{margin-bottom:0}}@media(max-width:600px){.document-content{border-radius:6px}.document-content>.markdown-content,.document-content>.document-diff-content{border-radius:0}}
.document-content-action{border-radius:6px}.document-replacement-menu{margin-left:auto}.document-content>.markdown-source-content{padding-top:0}.markdown-source-content pre{padding-top:0}.markdown-source-line::before{position:sticky;top:auto;bottom:auto;left:0;display:inline-block;height:1.5em;margin-left:-64px;margin-right:16px;background:var(--bgColor-default,#fff);vertical-align:top}@media(max-width:600px){.markdown-source-line::before{margin-left:-52px;margin-right:12px}}
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
previewButton.addEventListener('click',()=>apply('current'));sourceButton.addEventListener('click',()=>apply('markdown'));if(available)diffButton.addEventListener('click',()=>apply(document.body.dataset.documentView==='diff'?'current':'diff'));for(const link of document.querySelectorAll('.table-of-contents a[href^="#"]'))link.addEventListener('click',()=>{if(document.body.dataset.documentView==='markdown')apply('current')});apply(intent,available||intent!=='diff');
})()</script>`;
  return { control, content, styles, script };
}
