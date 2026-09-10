export interface TableResizerFeature {
  styles: string;
  script: string;
}

export function createTableResizerFeature(enabled: boolean): TableResizerFeature {
  if (!enabled) return { styles: "", script: "" };

  const styles = `
    .table-resizable-container { position: relative; max-width: 100%; margin-bottom: var(--base-size-16); overflow-x: auto; }
    .markdown-content .table-resizable-container table.is-column-resizable { display: table; table-layout: fixed; max-width: none; margin-bottom: 0; overflow: visible; }
    .table-column-resizer { position: absolute; z-index: 2; top: 0; width: 10px; padding: 0; background: transparent; border: 0; transform: translateX(-5px); cursor: col-resize; touch-action: none; user-select: none; }
    .table-column-resizer:last-child { transform: translateX(-100%); }
    .table-column-resizer:last-child::after { left: auto; right: 0; }
    .table-column-resizer::after { position: absolute; top: 0; bottom: 0; left: 4px; width: 2px; background: var(--borderColor-accent-emphasis, #0969da); content: ""; opacity: 0; }
    .table-column-resizer:hover::after, .table-column-resizer:focus-visible::after, .table-column-resizer.is-resizing::after { opacity: 1; }
    .table-column-resizer:focus-visible { outline: 2px solid var(--focus-outlineColor, #0969da); outline-offset: -2px; }
    body.is-resizing-table-column { cursor: col-resize; user-select: none; }`;
  const script = `<script>(()=>{const minimum=48;for(const table of document.querySelectorAll('.markdown-content table')){const headers=table.tHead?.rows[0]?.cells;if(!headers?.length||Array.from(headers).some(cell=>cell.colSpan!==1)||table.querySelector(':scope > colgroup'))continue;const container=document.createElement('div');container.className='table-resizable-container';table.before(container);container.append(table);const initialize=()=>{const widths=Array.from(headers,cell=>cell.getBoundingClientRect().width);if(widths.some(width=>width<=0))return false;const group=document.createElement('colgroup');for(const width of widths){const column=document.createElement('col');column.style.width=width+'px';group.append(column)}table.prepend(group);table.classList.add('is-column-resizable');const handles=[];const layout=()=>{table.style.width=widths.reduce((sum,width)=>sum+width,0)+'px';let offset=0;handles.forEach((handle,index)=>{offset+=widths[index];handle.style.left=offset+'px';handle.style.height=table.offsetHeight+'px'})};Array.from(headers).forEach((cell,index)=>{const handle=document.createElement('button');handle.type='button';handle.className='table-column-resizer';handle.setAttribute('aria-label',(cell.textContent?.trim()||String(index+1))+'列の幅を変更');handle.setAttribute('aria-orientation','vertical');handles.push(handle);container.append(handle);let drag=null;const resize=width=>{widths[index]=Math.max(minimum,width);group.children[index].style.width=widths[index]+'px';layout()};handle.addEventListener('pointerdown',event=>{if(event.button!==0)return;event.preventDefault();event.stopPropagation();drag={id:event.pointerId,x:event.clientX,width:widths[index]};handle.setPointerCapture(event.pointerId);handle.classList.add('is-resizing');document.body.classList.add('is-resizing-table-column')});handle.addEventListener('click',event=>event.stopPropagation());handle.addEventListener('pointermove',event=>{if(!drag||drag.id!==event.pointerId)return;resize(drag.width+event.clientX-drag.x)});const finish=event=>{if(!drag||drag.id!==event.pointerId)return;drag=null;handle.classList.remove('is-resizing');document.body.classList.remove('is-resizing-table-column')};handle.addEventListener('pointerup',finish);handle.addEventListener('pointercancel',finish);handle.addEventListener('keydown',event=>{if(event.key!=='ArrowLeft'&&event.key!=='ArrowRight')return;event.preventDefault();resize(widths[index]+(event.key==='ArrowLeft'?-10:10))})});layout();return true};if(!initialize()){const observer=new MutationObserver(()=>{if(initialize())observer.disconnect()});observer.observe(table.closest('.markdown-content'),{attributes:true,attributeFilter:['hidden']})}}})();</script>`;

  return { styles, script };
}
