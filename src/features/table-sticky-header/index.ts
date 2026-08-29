export interface TableStickyHeaderFeature {
  styles: string;
  script: string;
}

export function createTableStickyHeaderFeature(
  enabled: boolean,
): TableStickyHeaderFeature {
  if (!enabled) return { styles: "", script: "" };

  const styles = `
    .table-sticky-header { position: fixed; z-index: 35; top: 56px; box-sizing: border-box; overflow: hidden; background: var(--bgColor-default, #fff); border-bottom: 1px solid var(--borderColor-default, #d0d7de); box-shadow: 0 4px 10px rgba(31,35,40,.10); pointer-events: none; }
    .markdown-body .table-sticky-header table { display: table; table-layout: fixed; max-width: none; margin: 0; overflow: visible; border-spacing: 0; border-collapse: collapse; pointer-events: auto; }
    .markdown-body .table-sticky-header th { box-sizing: border-box; background: var(--bgColor-default, #fff); }
    body[data-theme="dark"] .table-sticky-header { box-shadow: 0 4px 12px rgba(0,0,0,.28); }`;
  const script = `<script>(()=>{const top=56;for(const table of document.querySelectorAll('.markdown-content table')){const head=table.tHead,headers=head?.rows[0]?.cells;if(!head||!headers?.length)continue;const scrollHost=table.closest('.table-resizable-container')||table;const floating=document.createElement('div'),floatingTable=document.createElement('table'),floatingHead=head.cloneNode(true),columns=document.createElement('colgroup');floating.className='table-sticky-header';floating.hidden=true;floating.setAttribute('aria-hidden','true');floatingTable.className=table.className;floatingTable.append(columns,floatingHead);floating.append(floatingTable);document.body.append(floating);const clonedHeaders=floatingHead.rows[0]?.cells;Array.from(clonedHeaders||[]).forEach((header,index)=>{header.tabIndex=-1;header.addEventListener('click',()=>{headers[index]?.click();requestAnimationFrame(update)})});const update=()=>{const tableRect=table.getBoundingClientRect(),headRect=head.getBoundingClientRect(),hostRect=scrollHost.getBoundingClientRect(),visible=headRect.top<top&&tableRect.bottom>top+headRect.height;floating.hidden=!visible;if(!visible)return;const widths=Array.from(headers,header=>header.getBoundingClientRect().width),tableWidth=widths.reduce((sum,width)=>sum+width,0);columns.replaceChildren(...widths.map(width=>{const column=document.createElement('col');column.style.width=width+'px';return column}));floating.style.left=hostRect.left+'px';floating.style.width=Math.min(hostRect.width,tableWidth)+'px';floating.style.height=headRect.height+'px';floatingTable.style.width=tableWidth+'px';floatingTable.style.transform='translateX(-'+scrollHost.scrollLeft+'px)';Array.from(clonedHeaders||[]).forEach((header,index)=>header.setAttribute('aria-sort',headers[index]?.getAttribute('aria-sort')||'none'))};scrollHost.addEventListener('scroll',update,{passive:true});addEventListener('scroll',update,{passive:true});addEventListener('resize',update,{passive:true});if('ResizeObserver'in window){const observer=new ResizeObserver(update);observer.observe(table);observer.observe(scrollHost)}update()}})();</script>`;

  return { styles, script };
}
