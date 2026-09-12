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
      ? `<button type="button" class="sidebar-tab" id="sidebar-tab-toc" role="tab" aria-selected="${initialPanel === "toc"}" aria-controls="sidebar-panel-toc" data-sidebar-tab="toc"><span>${tocTitle}</span><span class="toc-shortcut-hints"><span>次へ：<kbd>J</kbd></span><span>前へ：<kbd>K</kbd></span></span></button>`
      : ""
  }${
    hasComments
      ? `<button type="button" class="sidebar-tab" id="sidebar-tab-comments" role="tab" aria-selected="${initialPanel === "comments"}" aria-controls="sidebar-panel-comments" data-sidebar-tab="comments">コメント <span class="sidebar-count" id="annotation-count">${annotationCount}</span></button>`
      : ""
  }`;

  const markup = `<div class="document-sidebar-backdrop" data-sidebar-backdrop></div>
<aside class="document-sidebar" id="document-sidebar" aria-label="文書ナビゲーション">
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
.document-sidebar{grid-area:toc;position:sticky;top:32px;box-sizing:border-box;display:flex;height:calc(100vh - 64px);max-height:calc(100vh - 64px);min-height:0;flex-direction:column;border:1px solid var(--borderColor-muted,#d8dee4);border-radius:8px;background:var(--bgColor-default,#fff);overflow:hidden}
.sidebar-toggle{display:none}
.document-sidebar-body{display:flex;min-height:0;flex:1 1 auto;flex-direction:column;overflow:hidden}
.sidebar-tabs{display:flex;flex:none;gap:4px;padding:10px 10px 0;border-bottom:1px solid var(--borderColor-muted,#d8dee4)}
.sidebar-tab{position:relative;display:flex;min-width:0;flex:1;align-items:center;justify-content:space-between;gap:8px;padding:8px 6px 10px;color:var(--fgColor-muted,#59636e);font:inherit;font-size:.8125rem;font-weight:600;line-height:1.25;text-align:left;background:transparent;border:0;cursor:pointer}
.sidebar-tab:hover{color:var(--fgColor-default,#1f2328)}
.sidebar-tab:focus-visible{outline:2px solid var(--focus-outlineColor,#0969da);outline-offset:-2px}
.sidebar-tab[aria-selected="true"]{color:var(--fgColor-default,#1f2328)}
.toc-shortcut-hints{display:inline-flex;flex:none;align-items:center;gap:6px;color:var(--fgColor-muted,#59636e);font-size:.6875rem;font-weight:400;white-space:nowrap}
.toc-shortcut-hints>span{display:inline-flex;align-items:center;gap:3px}
.toc-shortcut-hints kbd{display:inline-flex;box-sizing:border-box;min-width:18px;height:18px;align-items:center;justify-content:center;padding:0 4px;color:var(--fgColor-default,#1f2328);font:inherit;font-weight:600;line-height:16px;background:var(--bgColor-muted,#f6f8fa);border:1px solid var(--borderColor-default,#d0d7de);border-radius:4px;box-shadow:inset 0 -1px 0 var(--borderColor-default,#d0d7de)}
.sidebar-count{display:inline-flex;min-width:18px;height:18px;align-items:center;justify-content:center;margin-left:3px;padding:0 4px;color:var(--fgColor-muted,#59636e);font-size:.6875rem;line-height:18px;background:var(--bgColor-muted,#f6f8fa);border-radius:9px}
.sidebar-panels{display:flex;min-height:0;flex:1 1 auto;align-items:stretch;overflow:hidden}
.sidebar-panel{box-sizing:border-box;width:100%;height:100%;min-height:0;overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;padding:12px;scrollbar-width:thin;scrollbar-color:var(--borderColor-default,#d0d7de) transparent}
.sidebar-panel[hidden],.document-sidebar-body[hidden]{display:none}
.document-sidebar-backdrop{display:none}
@media(min-width:901px){body.document-sidebar-collapsed{grid-template-columns:minmax(0,1fr);grid-template-areas:"content"}body.markdown-body.has-file-tree.document-sidebar-collapsed{grid-template-columns:280px minmax(0,1fr);grid-template-areas:"files content"}body.markdown-body.has-file-tree.file-sidebar-collapsed.document-sidebar-collapsed{grid-template-columns:minmax(0,1fr);grid-template-areas:"content"}.document-sidebar.is-desktop-hidden{display:none}}
@media(max-width:900px){.document-sidebar{position:fixed;z-index:60;top:68px;right:12px;left:12px;display:none;width:auto;height:min(70vh,calc(100dvh - 80px));max-height:calc(100dvh - 80px);border-radius:8px;box-shadow:0 12px 32px rgba(31,35,40,.24)}.document-sidebar.is-popup-open{display:flex}.document-sidebar-backdrop.is-popup-open{position:fixed;z-index:55;inset:56px 0 0;display:block;background:rgba(31,35,40,.28)}.sidebar-toggle{display:none}.sidebar-tabs{padding-top:10px}}
@media(prefers-reduced-motion:reduce){.panel-toggle-icon{transition:none}}`;

  const script = `<script>(()=>{
const sidebar=document.querySelector('.document-sidebar');if(!sidebar)return;
const tabs=[...sidebar.querySelectorAll('[data-sidebar-tab]')],panels=[...sidebar.querySelectorAll('.sidebar-panel')],toggle=sidebar.querySelector('.sidebar-toggle'),body=sidebar.querySelector('.document-sidebar-body'),label=sidebar.querySelector('[data-sidebar-toggle-label]'),popupToggle=document.querySelector('[data-sidebar-popup-toggle]'),backdrop=document.querySelector('[data-sidebar-backdrop]'),compact=matchMedia('(max-width: 900px)');
const tabParameter='sidebar-tab',visibilityParameter='document-sidebar',pageUrl=new URL(location.href),requestedTab=pageUrl.searchParams.get(tabParameter);
let active=tabs.some(item=>item.dataset.sidebarTab===requestedTab)?requestedTab:${JSON.stringify(initialPanel)},desktopExpanded=pageUrl.searchParams.get(visibilityParameter)!=='closed';
function updateUrl(url){url.searchParams.delete(tabParameter);url.searchParams.delete(visibilityParameter);if(active==='comments')url.searchParams.set(tabParameter,active);if(!desktopExpanded)url.searchParams.set(visibilityParameter,'closed');return url}
function syncState(){history.replaceState(null,'',updateUrl(new URL(location.href)));for(const link of document.querySelectorAll('a[href]')){const rawHref=link.getAttribute('href');if(!rawHref||rawHref.startsWith('#'))continue;const url=new URL(rawHref,location.href);if(url.protocol!==location.protocol||url.host!==location.host||!url.pathname.endsWith('.html'))continue;link.href=updateUrl(url).href}}
function activate(name,focus=false,open=true){const tab=tabs.find(item=>item.dataset.sidebarTab===name);if(!tab)return;active=name;for(const item of tabs){const selected=item===tab;item.setAttribute('aria-selected',String(selected));item.tabIndex=selected?0:-1}for(const panel of panels)panel.hidden=panel.id!=='sidebar-panel-'+name;label.textContent=tab.childNodes[0].textContent.trim();if(compact.matches&&open)setExpanded(true);syncState();if(focus)tab.focus()}
function setButtonLabel(expanded){if(!popupToggle)return;const text=expanded?'目次を非表示':'目次を表示';popupToggle.setAttribute('aria-expanded',String(expanded));popupToggle.setAttribute('aria-label',text);popupToggle.title=text}
function setDesktopExpanded(expanded){desktopExpanded=expanded;sidebar.classList.toggle('is-desktop-hidden',!expanded);document.body.classList.toggle('document-sidebar-collapsed',!expanded);setButtonLabel(expanded);syncState()}
function setExpanded(expanded,restoreFocus=false){if(!compact.matches){sidebar.classList.remove('is-popup-open');backdrop.classList.remove('is-popup-open');body.hidden=false;setDesktopExpanded(desktopExpanded);return}sidebar.classList.remove('is-desktop-hidden');document.body.classList.remove('document-sidebar-collapsed');sidebar.classList.toggle('is-popup-open',expanded);backdrop.classList.toggle('is-popup-open',expanded);if(popupToggle){popupToggle.setAttribute('aria-expanded',String(expanded));const text=expanded?'目次を閉じる':'目次を開く';popupToggle.setAttribute('aria-label',text);popupToggle.title=text}if(expanded)tabs.find(item=>item.dataset.sidebarTab===active)?.focus();else if(restoreFocus)popupToggle?.focus()}
tabs.forEach((tab,index)=>{tab.addEventListener('click',()=>activate(tab.dataset.sidebarTab));tab.addEventListener('keydown',event=>{if(event.key!=='ArrowLeft'&&event.key!=='ArrowRight')return;event.preventDefault();const step=event.key==='ArrowRight'?1:-1;activate(tabs[(index+step+tabs.length)%tabs.length].dataset.sidebarTab,true)})});
toggle.addEventListener('click',()=>setExpanded(false));popupToggle?.addEventListener('click',()=>compact.matches?setExpanded(!sidebar.classList.contains('is-popup-open')):setDesktopExpanded(!desktopExpanded));backdrop?.addEventListener('click',()=>setExpanded(false,true));
sidebar.addEventListener('click',event=>{if(compact.matches&&event.target.closest('.table-of-contents a'))setExpanded(false)});addEventListener('keydown',event=>{if(event.key==='Escape'&&sidebar.classList.contains('is-popup-open'))setExpanded(false,true)});
addEventListener('marksites:set-document-sidebar',event=>compact.matches?setExpanded(event.detail.open):setDesktopExpanded(event.detail.open));
addEventListener('marksites:show-comments',()=>activate('comments'));
const sync=()=>setExpanded(false);compact.addEventListener('change',sync);activate(active,false,false);sync();
})()</script>`;

  return { markup, styles, script };
}
