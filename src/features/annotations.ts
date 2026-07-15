import type { AnnotationDocument } from "../annotations/model.js";

function safeJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

export interface AnnotationsFeature {
  markup: string;
  styles: string;
  script: string;
}

export function createAnnotationsFeature(
  data?: AnnotationDocument,
): AnnotationsFeature {
  if (!data) return { markup: "", styles: "", script: "" };
  const markup = `<script id="marksites-annotations-data" type="application/json">${safeJson(data)}</script>
<div class="selection-actions" id="selection-actions" hidden role="toolbar" aria-label="Selected text actions">
  <button type="button" data-selection-action="copy">Copy selection</button>
  <button type="button" data-selection-action="ai">Copy for AI</button>
  <button type="button" data-selection-action="comment" disabled title="Start marksites serve to add comments">Add comment</button>
</div>
<aside class="annotations-panel" id="annotations-panel" aria-label="Comments" hidden>
  <div class="annotations-header"><strong>Comments</strong><button type="button" data-close-comments>Close</button></div>
  <div id="annotations-list"></div>
  <form id="annotation-form" hidden><label>Comment<textarea name="body" maxlength="10000" required></textarea></label><div><button type="submit">Save</button><button type="button" data-cancel-comment>Cancel</button></div><p role="status"></p></form>
</aside>`;
  const styles = `
.selection-actions{position:fixed;z-index:20;display:flex;gap:4px;padding:6px;background:#24292f;border:1px solid #57606a;border-radius:6px;box-shadow:0 8px 24px #140f0f26}
.selection-actions[hidden],.annotations-panel[hidden],#annotation-form[hidden]{display:none}
.selection-actions button{border:0;border-radius:4px;padding:5px 9px;color:#fff;background:transparent;font:12px/1.4 system-ui;cursor:pointer}
.selection-actions button:hover:not(:disabled){background:#57606a}.selection-actions button:disabled{color:#8c959f;cursor:not-allowed}
.annotations-panel{position:fixed;z-index:19;right:16px;bottom:16px;width:min(360px,calc(100vw - 32px));max-height:min(70vh,640px);overflow:auto;background:#fff;border:1px solid #d0d7de;border-radius:8px;box-shadow:0 8px 28px #140f0f26;padding:14px;color:#1f2328}
.annotations-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}.annotations-header button{border:0;background:none;color:#57606a;cursor:pointer}
.annotation-card{padding:10px 0;border-top:1px solid #d8dee4}.annotation-card:first-child{border-top:0}.annotation-quote{margin:0 0 6px;padding-left:9px;border-left:3px solid #54aeff;color:#57606a}.annotation-card p{white-space:pre-wrap}.annotation-card button,#annotation-form button{margin-right:6px}
.annotation-highlight{background:#fff8c5;border-bottom:2px solid #bf8700;cursor:pointer}
#annotation-form textarea{box-sizing:border-box;width:100%;min-height:90px;display:block;margin:6px 0;padding:7px}
@media(max-width:700px){.annotations-panel{right:8px;bottom:8px;width:calc(100vw - 16px)}}`;
  const script = `<script>(()=>{
const dataElement=document.getElementById('marksites-annotations-data');if(!dataElement)return;
let state=JSON.parse(dataElement.textContent||'{}'),editable=false,pendingSelection=null,editingId=null;
const content=document.querySelector('.markdown-content'),toolbar=document.getElementById('selection-actions'),panel=document.getElementById('annotations-panel'),list=document.getElementById('annotations-list'),form=document.getElementById('annotation-form');
const excluded='button,textarea,input,.selection-actions,.annotations-panel,.file-tree,.table-of-contents,.code-block-actions';
function copy(text){if(navigator.clipboard&&location.protocol!=='file:')return navigator.clipboard.writeText(text);const area=document.createElement('textarea');area.value=text;area.style.position='fixed';area.style.opacity='0';document.body.append(area);area.select();const ok=document.execCommand('copy');area.remove();return ok?Promise.resolve():Promise.reject(new Error('Copy failed'))}
function headingFor(node){const el=node.nodeType===1?node:node.parentElement;const heading=el&&el.closest('h1,h2,h3,h4,h5,h6');return heading?heading.id:null}
function selectionData(){const selection=getSelection();if(!selection||selection.rangeCount!==1||selection.isCollapsed)return null;const range=selection.getRangeAt(0);if(!content.contains(range.commonAncestorContainer)||(range.commonAncestorContainer.parentElement&&range.commonAncestorContainer.parentElement.closest(excluded)))return null;const exact=selection.toString().trim();if(!exact)return null;const all=content.innerText,index=all.indexOf(exact);return{exact,prefix:index<0?'':all.slice(Math.max(0,index-40),index),suffix:index<0?'':all.slice(index+exact.length,index+exact.length+40),headingId:headingFor(range.startContainer),startOffset:Math.max(0,index),endOffset:Math.max(0,index)+exact.length}}
document.addEventListener('selectionchange',()=>{clearTimeout(window.__marksitesSelectionTimer);window.__marksitesSelectionTimer=setTimeout(()=>{const next=selectionData();if(!next){toolbar.hidden=true;return}pendingSelection=next;const r=getSelection().getRangeAt(0).getBoundingClientRect();toolbar.style.left=Math.max(8,Math.min(innerWidth-toolbar.offsetWidth-8,r.left))+'px';toolbar.style.top=Math.max(8,r.top-44)+'px';toolbar.hidden=false},80)});
toolbar.addEventListener('mousedown',e=>e.preventDefault());toolbar.addEventListener('click',async e=>{const button=e.target.closest('button');if(!button||!pendingSelection)return;try{if(button.dataset.selectionAction==='copy')await copy(pendingSelection.exact);if(button.dataset.selectionAction==='ai')await copy('Document: '+state.document+'\\nHeading: '+(pendingSelection.headingId||'(none)')+'\\n\\n> '+pendingSelection.exact.replace(/\\n/g,'\\n> '));if(button.dataset.selectionAction==='comment'&&editable){editingId=null;form.reset();form.hidden=false;panel.hidden=false;form.querySelector('textarea').focus()}button.textContent='Copied';setTimeout(()=>button.textContent=button.dataset.selectionAction==='ai'?'Copy for AI':button.dataset.selectionAction==='comment'?'Add comment':'Copy selection',1000)}catch{button.textContent='Copy failed'}});
function locate(a){const root=a.selection.headingId?document.getElementById(a.selection.headingId):content;if(!root)return null;const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node,text='',nodes=[];while(node=walker.nextNode()){nodes.push([node,text.length]);text+=node.data}let index=text.indexOf(a.selection.exact);if(index<0)return null;const matches=[];while(index>=0){matches.push(index);index=text.indexOf(a.selection.exact,index+1)}if(matches.length>1){const contextual=matches.find(i=>text.slice(Math.max(0,i-a.selection.prefix.length),i)===a.selection.prefix&&text.slice(i+a.selection.exact.length,i+a.selection.exact.length+a.selection.suffix.length)===a.selection.suffix);index=contextual??matches.reduce((best,current)=>Math.abs(current-a.selection.startOffset)<Math.abs(best-a.selection.startOffset)?current:best)}else index=matches[0];let start,end,so=0,eo=0;for(const [n,offset] of nodes){if(!start&&offset+n.data.length>=index){start=n;so=index-offset}if(offset+n.data.length>=index+a.selection.exact.length){end=n;eo=index+a.selection.exact.length-offset;break}}if(!start||!end)return null;const range=document.createRange();range.setStart(start,so);range.setEnd(end,eo);return range}
function render(){document.querySelectorAll('.annotation-highlight').forEach(el=>el.replaceWith(...el.childNodes));list.textContent='';for(const a of state.annotations){const card=document.createElement('article');card.className='annotation-card';const quote=document.createElement('blockquote');quote.className='annotation-quote';quote.textContent=a.selection.exact;const body=document.createElement('p');body.textContent=a.comment.body;card.append(quote,body);if(editable){for(const [label,action] of [['Edit','edit'],['Delete','delete']]){const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.annotationAction=action;b.dataset.id=a.id;card.append(b)}}list.append(card);const range=locate(a);let located=false;if(range&&!range.collapsed){const mark=document.createElement('mark');mark.className='annotation-highlight';mark.dataset.annotationId=a.id;try{range.surroundContents(mark);located=true}catch{}}if(!located){const unavailable=document.createElement('small');unavailable.textContent='Location unavailable';card.append(unavailable)}}panel.hidden=state.annotations.length===0}
document.addEventListener('click',e=>{const mark=e.target.closest('.annotation-highlight');if(mark)panel.hidden=false;const close=e.target.closest('[data-close-comments]');if(close)panel.hidden=true;const action=e.target.closest('[data-annotation-action]');if(action){const a=state.annotations.find(x=>x.id===action.dataset.id);if(!a)return;if(action.dataset.annotationAction==='edit'){editingId=a.id;pendingSelection=a.selection;form.body.value=a.comment.body;form.hidden=false}else if(confirm('Delete this comment?'))mutate('DELETE','/annotations/'+encodeURIComponent(a.id),{baseRevision:state.revision})}});
form.addEventListener('submit',e=>{e.preventDefault();const body=form.body.value;if(editingId)mutate('PATCH','/annotations/'+encodeURIComponent(editingId),{baseRevision:state.revision,comment:{body}});else mutate('POST','/annotations',{document:state.document,baseRevision:state.revision,selection:pendingSelection,comment:{body}})});form.querySelector('[data-cancel-comment]').addEventListener('click',()=>form.hidden=true);
async function mutate(method,path,body){body.document=state.document;const status=form.querySelector('[role=status]');status.textContent='Saving…';try{const response=await fetch('/_marksites/api/v1'+path,{method,headers:{'content-type':'application/json'},body:JSON.stringify(body)});const result=await response.json();if(response.status===409){const latest=await fetch('/_marksites/api/v1/annotations?document='+encodeURIComponent(state.document),{cache:'no-store'}).then(r=>r.json());if(latest.data)state=latest.data;render();status.textContent='Another window changed these comments. Review the latest version and try again.';return}if(!response.ok)throw new Error(result.error&&result.error.message||'Save failed');state=result.data;form.hidden=true;status.textContent='';render()}catch(error){status.textContent=error.message;if(error instanceof TypeError){editable=false;toolbar.querySelector('[data-selection-action=comment]').disabled=true;render()}}}
async function connect(){if(location.protocol==='file:')return;try{const controller=new AbortController();setTimeout(()=>controller.abort(),1500);const response=await fetch('/_marksites/api/v1/runtime',{cache:'no-store',signal:controller.signal});const runtime=await response.json();if(runtime.data&&runtime.data.service==='marksites'&&runtime.data.apiVersion===1&&runtime.data.projectId&&runtime.data.capabilities.includes('annotations:write')){editable=true;toolbar.querySelector('[data-selection-action=comment]').disabled=false;toolbar.querySelector('[data-selection-action=comment]').title='';const latest=await fetch('/_marksites/api/v1/annotations?document='+encodeURIComponent(state.document),{cache:'no-store'}).then(r=>r.json());if(latest.data)state=latest.data;render()}}catch{}}
render();connect();
})()</script>`;
  return { markup, styles, script };
}
