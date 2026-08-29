export interface TableSorterFeature {
  styles: string;
  script: string;
}

export function createTableSorterFeature(enabled: boolean): TableSorterFeature {
  if (!enabled) return { styles: "", script: "" };

  const styles = `
    :is(.markdown-content, .table-sticky-header) table.is-column-sortable th { position: relative; padding-right: 40px; cursor: pointer; user-select: none; transition: background-color 120ms ease; }
    :is(.markdown-content, .table-sticky-header) table.is-column-sortable th:hover { background: var(--bgColor-muted, #f6f8fa); }
    :is(.markdown-content, .table-sticky-header) table.is-column-sortable th:focus-visible { outline: 2px solid var(--focus-outlineColor, #0969da); outline-offset: -2px; }
    .table-sort-indicator { position: absolute; top: 50%; right: 11px; display: inline-flex; width: 18px; height: 18px; align-items: center; justify-content: center; color: var(--fgColor-muted, #59636e); border-radius: 5px; transform: translateY(-50%); transition: color 120ms ease, background-color 120ms ease; }
    .table-sort-indicator svg { display: block; width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
    .table-sort-indicator path { opacity: .38; transition: opacity 120ms ease; }
    th:hover .table-sort-indicator { color: var(--fgColor-default, #1f2328); background: var(--bgColor-neutral-muted, #818b981f); }
    th[aria-sort="ascending"] .table-sort-indicator, th[aria-sort="descending"] .table-sort-indicator { color: var(--fgColor-accent, #0969da); background: var(--bgColor-accent-muted, #ddf4ff); }
    th[aria-sort="ascending"] .table-sort-chevron-up, th[aria-sort="descending"] .table-sort-chevron-down { opacity: 1; }
    th[aria-sort="ascending"] .table-sort-chevron-down, th[aria-sort="descending"] .table-sort-chevron-up { opacity: .15; }
    @media (prefers-reduced-motion: reduce) { :is(.markdown-content, .table-sticky-header) table.is-column-sortable th, .table-sort-indicator, .table-sort-indicator path { transition: none; } }`;
  const script = `<script>(()=>{const collator=new Intl.Collator(undefined,{numeric:true,sensitivity:'base'});for(const table of document.querySelectorAll('.markdown-content table')){const headers=table.tHead?.rows[0]?.cells,bodies=Array.from(table.tBodies);if(!headers?.length||!bodies.length||Array.from(headers).some(cell=>cell.colSpan!==1))continue;const originals=bodies.map(body=>Array.from(body.rows));let active=-1,direction=0;const apply=(index,next)=>{active=index;direction=next;Array.from(headers).forEach((header,column)=>header.setAttribute('aria-sort',column===active&&direction!==0?(direction===1?'ascending':'descending'):'none'));bodies.forEach((body,bodyIndex)=>{const original=originals[bodyIndex];const order=new Map(original.map((row,rowIndex)=>[row,rowIndex]));const rows=direction===0?[...original]:[...original].sort((left,right)=>{const leftValue=left.cells[index]?.textContent?.trim()??'',rightValue=right.cells[index]?.textContent?.trim()??'';const compared=collator.compare(leftValue,rightValue);return direction*compared||(order.get(left)-order.get(right))});body.append(...rows)})};Array.from(headers).forEach((header,index)=>{header.tabIndex=0;header.setAttribute('aria-sort','none');const indicator=document.createElement('span');indicator.className='table-sort-indicator';indicator.setAttribute('aria-hidden','true');indicator.innerHTML='<svg viewBox="0 0 16 16"><path class="table-sort-chevron-up" d="M5 6.5 8 3.5l3 3"/><path class="table-sort-chevron-down" d="m5 9.5 3 3 3-3"/></svg>';header.append(indicator);const sort=()=>apply(index,active===index?(direction===1?-1:direction===-1?0:1):1);header.addEventListener('click',event=>{if(event.target.closest('button,a,input,select,textarea'))return;sort()});header.addEventListener('keydown',event=>{if(event.key!=='Enter'&&event.key!==' ')return;if(event.target!==header)return;event.preventDefault();sort()})});table.classList.add('is-column-sortable')}})();</script>`;

  return { styles, script };
}
