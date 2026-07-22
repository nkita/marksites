export interface ImageViewerFeature {
  markup: string;
  styles: string;
  script: string;
}

export function createImageViewerFeature(enabled: boolean): ImageViewerFeature {
  if (!enabled) return { markup: "", styles: "", script: "" };
  const markup = `<div class="image-viewer" data-image-viewer hidden role="dialog" aria-modal="true" aria-label="画像ビューアー">
  <div class="image-viewer-toolbar">
    <button type="button" data-image-zoom-out aria-label="縮小" title="縮小">−</button>
    <button type="button" data-image-reset aria-label="元の大きさ" title="元の大きさ">100%</button>
    <button type="button" data-image-zoom-in aria-label="拡大" title="拡大">＋</button>
    <button type="button" data-image-close aria-label="閉じる" title="閉じる">×</button>
  </div>
  <div class="image-viewer-stage" data-image-stage><img data-image-viewer-image alt=""></div>
</div>`;
  const styles = `
    .markdown-content img { cursor: zoom-in; }
    .markdown-content img:focus-visible { outline: 2px solid var(--focus-outlineColor, #0969da); outline-offset: 3px; }
    .image-viewer[hidden] { display: none; }
    .image-viewer { position: fixed; z-index: 1000; inset: 0; display: grid; grid-template-rows: auto minmax(0, 1fr); color: #fff; background: rgba(0,0,0,.9); }
    .image-viewer-toolbar { display: flex; justify-content: flex-end; gap: 8px; padding: 12px; }
    .image-viewer-toolbar button { min-width: 40px; height: 40px; padding: 0 10px; color: #fff; font: inherit; font-weight: 600; background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.3); border-radius: 6px; cursor: pointer; }
    .image-viewer-toolbar button:hover { background: rgba(255,255,255,.22); }
    .image-viewer-toolbar button:focus-visible { outline: 2px solid #58a6ff; outline-offset: 2px; }
    .image-viewer-stage { min-width: 0; min-height: 0; overflow: hidden; cursor: grab; touch-action: none; user-select: none; }
    .image-viewer-stage.is-dragging { cursor: grabbing; }
    .image-viewer-stage img { display: block; max-width: none; max-height: none; transform-origin: center; pointer-events: none; }
    body.has-open-image-viewer { overflow: hidden; }`;
  const script = `<script>(()=>{const viewer=document.querySelector('[data-image-viewer]'),stage=viewer?.querySelector('[data-image-stage]'),image=viewer?.querySelector('[data-image-viewer-image]');if(!(viewer instanceof HTMLElement)||!(stage instanceof HTMLElement)||!(image instanceof HTMLImageElement))return;let scale=1,x=0,y=0,drag=null,opener=null;const draw=()=>{image.style.transform='translate('+x+'px,'+y+'px) scale('+scale+')';};const reset=()=>{scale=1;x=(stage.clientWidth-image.naturalWidth)/2;y=(stage.clientHeight-image.naturalHeight)/2;draw();};const close=()=>{viewer.hidden=true;document.body.classList.remove('has-open-image-viewer');if(opener instanceof HTMLElement)opener.focus();};const open=target=>{opener=target;image.src=target.currentSrc||target.src;image.alt=target.alt;viewer.hidden=false;document.body.classList.add('has-open-image-viewer');image.onload=reset;viewer.querySelector('[data-image-close]')?.focus();};document.querySelectorAll('.markdown-content img').forEach(target=>{target.tabIndex=0;target.setAttribute('role','button');target.setAttribute('aria-label',(target.alt||'画像')+'を拡大表示');target.addEventListener('click',()=>open(target));target.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();open(target);}});});viewer.querySelector('[data-image-close]')?.addEventListener('click',close);viewer.querySelector('[data-image-reset]')?.addEventListener('click',reset);const zoom=amount=>{scale=Math.min(8,Math.max(.1,scale*amount));draw();};viewer.querySelector('[data-image-zoom-in]')?.addEventListener('click',()=>zoom(1.25));viewer.querySelector('[data-image-zoom-out]')?.addEventListener('click',()=>zoom(.8));stage.addEventListener('wheel',event=>{event.preventDefault();zoom(event.deltaY<0?1.15:.87);},{passive:false});stage.addEventListener('pointerdown',event=>{drag={id:event.pointerId,x:event.clientX,y:event.clientY,ox:x,oy:y};stage.setPointerCapture(event.pointerId);stage.classList.add('is-dragging');});stage.addEventListener('pointermove',event=>{if(!drag||drag.id!==event.pointerId)return;x=drag.ox+event.clientX-drag.x;y=drag.oy+event.clientY-drag.y;draw();});const end=event=>{if(drag?.id===event.pointerId){drag=null;stage.classList.remove('is-dragging');}};stage.addEventListener('pointerup',end);stage.addEventListener('pointercancel',end);document.addEventListener('keydown',event=>{if(!viewer.hidden&&event.key==='Escape')close();});})();</script>`;
  return { markup, styles, script };
}
