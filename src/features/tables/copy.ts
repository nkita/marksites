import { renderCopyIcon } from "../../utils/icons.js";

export function createTableCopyFeature(enabled: boolean) {
  if (!enabled) return { styles: "", script: "" };
  const styles = `
    .table-copy-container { width: fit-content; max-width: 100%; margin-bottom: var(--base-size-16, 16px); }
    .markdown-content .table-copy-container > table, .table-copy-container > .table-resizable-container { margin-bottom: 0; }
    .table-copy-toolbar { margin-bottom: 4px; text-align: right; font-size: 0.8125rem; line-height: 1.4; }
    .markdown-content .table-copy-link { display: inline-flex; align-items: center; gap: 4px; color: var(--fgColor-muted, #59636e); text-decoration: none; cursor: pointer; }
    .markdown-content .table-copy-link:hover { color: var(--fgColor-default, #1f2328); text-decoration: none; }
    .table-copy-link .action-icon { width: 14px; height: 14px; }
    .table-copy-container:has(> .table-copy-toolbar > .table-copy-link:hover) > .table-resizable-container > table,
    .table-copy-container:has(> .table-copy-toolbar > .table-copy-link:hover) > table { outline: 2px solid #a6ceff; outline-offset: -2px; }
    .table-copy-link:focus-visible { outline: 2px solid var(--focus-outlineColor, #0969da); outline-offset: 2px; }`;
  const script = `<script>
(() => {
  const cellText = (cell) => {
    const copy = cell.cloneNode(true);
    for (const control of copy.querySelectorAll('.table-sort-indicator, .table-column-resizer, script, style')) control.remove();
    for (const br of copy.querySelectorAll('br')) br.replaceWith('\\n');
    for (const image of copy.querySelectorAll('img')) image.replaceWith(image.alt);
    return copy.textContent || '';
  };
  const csv = (table) => Array.from(table.rows, row =>
    Array.from(row.cells, cell => '"' + cellText(cell).replace(/"/g, '""') + '"').join(',')
  ).join('\\r\\n');
  const copyText = async (text) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
      }
    } catch {}
    const active = document.activeElement;
    const selection = document.getSelection();
    const ranges = selection ? Array.from({ length: selection.rangeCount }, (_, index) => selection.getRangeAt(index).cloneRange()) : [];
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.readOnly = true;
    textarea.style.cssText = 'position:fixed;left:-9999px;top:0';
    document.body.append(textarea);
    try {
      textarea.select();
      if (!document.execCommand('copy')) throw new Error('Copy failed');
    } finally {
      textarea.remove();
      active?.focus({ preventScroll: true });
      if (selection) {
        selection.removeAllRanges();
        for (const range of ranges) selection.addRange(range);
      }
    }
  };
  for (const table of document.querySelectorAll('.markdown-content table')) {
    if (!table.rows.length || Array.from(table.rows).some(row => Array.from(row.cells).some(cell => cell.colSpan !== 1 || cell.rowSpan !== 1))) continue;
    const toolbar = document.createElement('div');
    toolbar.className = 'table-copy-toolbar';
    const link = document.createElement('a');
    link.href = '#';
    link.className = 'table-copy-link';
    link.title = '表をCSVとしてコピー';
    link.setAttribute('aria-label', '表をCSVとしてコピー');
    link.innerHTML = ${JSON.stringify(renderCopyIcon())};
    const label = document.createElement('span');
    label.textContent = 'コピー';
    link.append(label);
    toolbar.setAttribute('aria-live', 'polite');
    toolbar.append(link);
    const container = document.createElement('div');
    container.className = 'table-copy-container';
    const scrollHost = table.closest('.table-resizable-container') || table;
    scrollHost.before(container);
    container.append(toolbar, scrollHost);
    let copying = false;
    let resetTimer;
    link.addEventListener('click', async (event) => {
      event.preventDefault();
      if (copying) return;
      copying = true;
      link.setAttribute('aria-disabled', 'true');
      try {
        await copyText(csv(table));
        clearTimeout(resetTimer);
        label.textContent = 'コピーしました';
        link.setAttribute('aria-label', '表をコピーしました');
        resetTimer = setTimeout(() => {
          label.textContent = 'コピー';
          link.setAttribute('aria-label', '表をCSVとしてコピー');
        }, 1600);
      } catch {
        link.setAttribute('aria-label', '表をコピーできませんでした');
      } finally {
        copying = false;
        link.setAttribute('aria-disabled', 'false');
      }
    });
  }
})();
</script>`;
  return { styles, script };
}
