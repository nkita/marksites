export const diffStyles = `
.document-diff-content{box-sizing:border-box;min-width:0;overflow-x:auto;font-size:12px;line-height:1.6;color:var(--fgColor-default,#1f2328);background:var(--bgColor-default,#fff)}.document-diff-content[hidden]{display:none}
.document-diff-comparison{min-width:640px;--diff-delete-fg:#b4232c;--diff-delete-bg:#cf222e14;--diff-insert-fg:#0969da;--diff-insert-bg:#0969da14}
[data-theme="dark"] .document-diff-comparison{--diff-delete-fg:#ff938a;--diff-delete-bg:#ff7b721c;--diff-insert-fg:#79b8ff;--diff-insert-bg:#58a6ff1c}
.document-diff-row,.document-diff-labels{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr)}
.document-diff-labels{font-size:11px;font-weight:600;letter-spacing:.02em;background:var(--bgColor-muted,#f6f8fa);border-bottom:1px solid var(--borderColor-default,#d0d7de)}.document-diff-labels>span{padding:12px 16px}.document-diff-labels>span+span{border-left:1px solid var(--borderColor-default,#d0d7de)}
.document-diff-cell{min-width:0;padding:10px 16px;overflow-wrap:anywhere;display:flow-root}.document-diff-cell+ .document-diff-cell{border-left:1px solid var(--borderColor-muted,#d8dee4)}.document-diff-cell>:first-child,.document-diff-block>:first-child{margin-top:0}.document-diff-cell>:last-child,.document-diff-block>:last-child{margin-bottom:0}
.document-diff-cell h1{font-size:20px}.document-diff-cell h2{font-size:17px}.document-diff-cell h3{font-size:15px}.document-diff-cell h4,.document-diff-cell h5,.document-diff-cell h6{font-size:13px}.document-diff-cell p,.document-diff-cell li,.document-diff-cell table{font-size:12px}.document-diff-cell pre,.document-diff-cell code{font-size:11px}.document-diff-cell pre{padding:10px;white-space:pre-wrap;overflow-wrap:anywhere}.document-diff-cell img{max-width:100%;height:auto}
.document-diff-inline-delete,.document-diff-inline-insert{padding:1px 2px;border-radius:2px;box-decoration-break:clone;-webkit-box-decoration-break:clone;text-decoration:none}.document-diff-inline-delete,.document-diff-delete{color:var(--diff-delete-fg);background:var(--diff-delete-bg)}.document-diff-inline-insert,.document-diff-insert{color:var(--diff-insert-fg);background:var(--diff-insert-bg)}.document-diff-inline-delete a,.document-diff-delete a,.document-diff-inline-insert a,.document-diff-insert a{color:inherit}
.document-diff-block{display:block;padding:4px 8px;border-left:2px solid currentColor}.document-diff-empty>td{background:var(--bgColor-muted,#f6f8fa)}.document-diff-empty{background:var(--bgColor-muted,#f6f8fa);list-style:none}.document-diff-code code>[data-diff-line]{display:block;min-height:1.6em;white-space:pre-wrap}.document-diff-code code{white-space:normal}.document-diff-link-target{display:block;overflow-wrap:anywhere;font-size:10px}.document-diff-table{overflow-x:auto}.document-diff-cell table{display:table;width:100%;table-layout:fixed}.document-diff-cell th,.document-diff-cell td{vertical-align:top;padding:5px 8px;overflow-wrap:anywhere}
.document-diff-toggle[aria-pressed="true"]{color:var(--fgColor-accent,#0969da);background:var(--bgColor-accent-muted,#ddf4ff)}.document-diff-toggle:disabled{color:var(--fgColor-muted,#59636e);opacity:.45;cursor:default}
.document-diff-previous-label{display:flex;align-items:center;gap:10px}.document-diff-version-picker{display:inline-flex;align-items:center}.document-diff-version-label{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}.document-diff-version-picker select{max-width:240px;color:inherit;background:var(--bgColor-default,#fff);border:1px solid var(--borderColor-default,#d0d7de);border-radius:6px;padding:3px 8px;font-size:11px}
`;

export const diffScript = `<script>(()=>{
const root=document.querySelector('.document-diff-content');if(!root)return;
let pending=false;
function schedule(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;if(root.hidden)return;
const rows=Array.from(root.querySelectorAll('[data-document-diff-active] .document-diff-row,.document-diff-row:not([data-document-diff-active] *)'));
const pairs=[];for(const row of rows){const left=row.children[0].querySelectorAll('[data-diff-line]'),right=row.children[1].querySelectorAll('[data-diff-line]');for(let i=0;i<Math.min(left.length,right.length);i++)pairs.push([left[i],right[i]])}
for(const pair of pairs)for(const cell of pair)cell.style.height='';
const heights=pairs.map(pair=>Math.max(...pair.map(cell=>cell.getBoundingClientRect().height)));
pairs.forEach((pair,i)=>pair.forEach(cell=>{cell.style.boxSizing='border-box';cell.style.height=heights[i]+'px'}));
})}
new MutationObserver(schedule).observe(root,{attributes:true,attributeFilter:['hidden']});
if('ResizeObserver'in window){const widths=new WeakMap();const observer=new ResizeObserver(entries=>{for(const entry of entries){const width=entry.contentRect.width;if(widths.get(entry.target)!==width){widths.set(entry.target,width);schedule()}}});for(const cell of root.querySelectorAll('.document-diff-cell'))observer.observe(cell)}
root.addEventListener('load',schedule,true);addEventListener('resize',schedule);document.fonts?.ready.then(schedule);document.fonts?.addEventListener('loadingdone',schedule);
function disablePreviousControls(){for(const control of root.querySelectorAll('.document-diff-previous a,.document-diff-previous button,.document-diff-previous input,.document-diff-previous select,.document-diff-previous textarea')){control.setAttribute('tabindex','-1');control.setAttribute('aria-disabled','true');if('disabled'in control)control.disabled=true;control.addEventListener('click',event=>event.preventDefault())}}
const active=root.querySelector('[data-document-diff-active]');root.addEventListener('change',event=>{const selector=event.target.closest?.('[data-document-diff-version]');if(!selector||!active)return;const template=root.querySelector('[data-document-diff-template="'+selector.value+'"]');if(template){active.replaceChildren(template.content.cloneNode(true));disablePreviousControls();schedule();dispatchEvent(new Event('scroll'))}});disablePreviousControls();
schedule();
})()</script>`;
