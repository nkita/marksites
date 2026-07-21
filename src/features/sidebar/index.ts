import { escapeHtml } from "../../utils/html.js";
import type { DocumentFeature } from "../types.js";

interface SidebarOptions {
  tableOfContents: string;
  tableOfContentsTitle: string;
  annotations: string;
  annotationCount: number;
}

export type SidebarFeature = DocumentFeature;

export function createSidebarFeature({
  tableOfContents,
  tableOfContentsTitle,
  annotations,
  annotationCount,
}: SidebarOptions): SidebarFeature {
  if (!tableOfContents && !annotations)
    return { markup: "", styles: "", script: "" };

  const hasComments = annotations !== "";
  const tocTitle = escapeHtml(tableOfContentsTitle);
  const initialPanel = tableOfContents ? "toc" : "comments";
  const tabs = `${
    tableOfContents
      ? `<button type="button" class="sidebar-tab" id="sidebar-tab-toc" role="tab" aria-selected="${initialPanel === "toc"}" aria-controls="sidebar-panel-toc" data-sidebar-tab="toc">${tocTitle}</button>`
      : ""
  }${
    hasComments
      ? `<button type="button" class="sidebar-tab" id="sidebar-tab-comments" role="tab" aria-selected="${initialPanel === "comments"}" aria-controls="sidebar-panel-comments" data-sidebar-tab="comments">コメント <span class="sidebar-count" id="annotation-count">${annotationCount}</span></button>`
      : ""
  }`;

  const markup = `<aside class="document-sidebar" aria-label="文書ナビゲーション">
  <button type="button" class="sidebar-toggle" aria-expanded="true" aria-controls="document-sidebar-body">
    <span data-sidebar-toggle-label>${initialPanel === "toc" ? tocTitle : "コメント"}</span>
    <svg class="panel-toggle-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" /></svg>
  </button>
  <div class="document-sidebar-body" id="document-sidebar-body">
    <div class="sidebar-tabs" role="tablist" aria-label="文書サイドバー">${tabs}</div>
    <div class="sidebar-panels">
${tableOfContents}${annotations}
    </div>
  </div>
</aside>`;

  const styles = `
.document-sidebar{grid-area:toc;position:sticky;top:32px;box-sizing:border-box;display:flex;max-height:calc(100vh - 64px);min-height:0;flex-direction:column;border:1px solid var(--borderColor-muted,#d8dee4);border-radius:8px;background:var(--bgColor-default,#fff);overflow:hidden}
.sidebar-toggle{display:none}
.document-sidebar-body{display:flex;min-height:0;flex:0 1 auto;flex-direction:column;overflow:hidden}
.sidebar-tabs{display:flex;flex:none;gap:4px;padding:10px 10px 0;border-bottom:1px solid var(--borderColor-muted,#d8dee4)}
.sidebar-tab{position:relative;min-width:0;flex:1;padding:8px 6px 10px;color:var(--fgColor-muted,#59636e);font:inherit;font-size:.8125rem;font-weight:600;line-height:1.25;background:transparent;border:0;cursor:pointer}
.sidebar-tab::after{position:absolute;right:4px;bottom:-1px;left:4px;height:2px;background:transparent;content:""}
.sidebar-tab:hover{color:var(--fgColor-default,#1f2328)}
.sidebar-tab:focus-visible{outline:2px solid var(--focus-outlineColor,#0969da);outline-offset:-2px}
.sidebar-tab[aria-selected="true"]{color:var(--fgColor-default,#1f2328)}
.sidebar-tab[aria-selected="true"]::after{background:var(--borderColor-accent-emphasis,#0969da)}
.sidebar-count{display:inline-flex;min-width:18px;height:18px;align-items:center;justify-content:center;margin-left:3px;padding:0 4px;color:var(--fgColor-muted,#59636e);font-size:.6875rem;line-height:18px;background:var(--bgColor-muted,#f6f8fa);border-radius:9px}
.sidebar-panels{display:flex;min-height:0;flex:0 1 auto;align-items:flex-start;overflow:hidden}
.sidebar-panel{box-sizing:border-box;width:100%;max-height:100%;min-height:0;overflow:auto;padding:12px;scrollbar-width:thin;scrollbar-color:var(--borderColor-default,#d0d7de) transparent}
.sidebar-panel[hidden],.document-sidebar-body[hidden]{display:none}
@media(max-width:900px){.document-sidebar{z-index:10;top:12px;width:auto;max-height:calc(100vh - 24px);box-shadow:0 4px 12px rgba(31,35,40,.08)}.sidebar-toggle{box-sizing:border-box;display:flex;width:100%;min-height:44px;flex:none;align-items:center;justify-content:space-between;padding:8px 12px;color:var(--fgColor-default,#1f2328);font:inherit;font-size:.9375rem;font-weight:700;background:transparent;border:0;cursor:pointer}.sidebar-toggle:focus-visible{outline:2px solid var(--focus-outlineColor,#0969da);outline-offset:-2px}.sidebar-toggle[aria-expanded="false"] .panel-toggle-icon{transform:rotate(-90deg)}.sidebar-tabs{padding-top:0}}
@media(prefers-reduced-motion:reduce){.panel-toggle-icon{transition:none}}`;

  const script = `<script>(()=>{
const sidebar=document.querySelector('.document-sidebar');if(!sidebar)return;
const tabs=[...sidebar.querySelectorAll('[data-sidebar-tab]')],panels=[...sidebar.querySelectorAll('.sidebar-panel')],toggle=sidebar.querySelector('.sidebar-toggle'),body=sidebar.querySelector('.document-sidebar-body'),label=sidebar.querySelector('[data-sidebar-toggle-label]'),compact=matchMedia('(max-width: 900px)');
let active=${JSON.stringify(initialPanel)};
function activate(name,focus=false){const tab=tabs.find(item=>item.dataset.sidebarTab===name);if(!tab)return;active=name;for(const item of tabs){const selected=item===tab;item.setAttribute('aria-selected',String(selected));item.tabIndex=selected?0:-1}for(const panel of panels)panel.hidden=panel.id!=='sidebar-panel-'+name;label.textContent=tab.childNodes[0].textContent.trim();if(compact.matches){body.hidden=false;toggle.setAttribute('aria-expanded','true')}if(focus)tab.focus()}
function setExpanded(expanded){toggle.setAttribute('aria-expanded',String(expanded));body.hidden=!expanded}
tabs.forEach((tab,index)=>{tab.addEventListener('click',()=>activate(tab.dataset.sidebarTab));tab.addEventListener('keydown',event=>{if(event.key!=='ArrowLeft'&&event.key!=='ArrowRight')return;event.preventDefault();const step=event.key==='ArrowRight'?1:-1;activate(tabs[(index+step+tabs.length)%tabs.length].dataset.sidebarTab,true)})});
toggle.addEventListener('click',()=>setExpanded(toggle.getAttribute('aria-expanded')!=='true'));
sidebar.addEventListener('click',event=>{if(compact.matches&&event.target.closest('.table-of-contents a'))setExpanded(false)});
addEventListener('marksites:show-comments',()=>activate('comments'));
const sync=()=>setExpanded(!compact.matches);compact.addEventListener('change',sync);activate(active);sync();
})()</script>`;

  return { markup, styles, script };
}
