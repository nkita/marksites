import type {
  FileBreadcrumb,
  FileTreeNode,
  FileTreeOptions,
} from "../types.js";
import { escapeHtml } from "../utils/html.js";

function renderNodes(nodes: FileTreeNode[]): string {
  return nodes
    .map((node) => {
      if (node.type === "directory") {
        return `      <li class="file-tree-directory">
        <details open>
          <summary>${escapeHtml(node.name)}</summary>
          <ul>
${renderNodes(node.children)}
          </ul>
        </details>
      </li>`;
      }

      const current = node.current ? ' aria-current="page"' : "";
      const count =
        Number.isSafeInteger(node.commentCount) && node.commentCount! > 0
          ? `<span class="file-tree-comment-count" aria-label="${node.commentCount} ${node.commentCount === 1 ? "comment" : "comments"}">${node.commentCount}</span>`
          : "";
      return `      <li class="file-tree-file"><a href="${escapeHtml(node.href)}" data-file-name="${escapeHtml(node.name)}"${current}><span class="file-tree-name">${escapeHtml(node.name)}</span>${count}</a></li>`;
    })
    .join("\n");
}

export function renderFileTree(options?: FileTreeOptions): string {
  if (!options || options.items.length === 0) return "";

  return `<nav class="file-tree" aria-label="${escapeHtml(options.title ?? "Files")}">
  <div class="file-tree-header">
    <h2>
      <button type="button" class="file-tree-toggle" aria-expanded="true" aria-controls="file-tree-panel" aria-label="Hide files" title="Hide files">
        <span>${escapeHtml(options.title ?? "Files")}</span>
        <svg class="panel-toggle-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" /></svg>
      </button>
    </h2>
  </div>
  <div class="file-tree-panel" id="file-tree-panel">
    <div class="file-tree-filter">
      <input type="search" class="file-tree-filter-input" placeholder="Filter files" aria-label="Filter files by name" autocomplete="off">
      <p class="file-tree-filter-empty" hidden>No matching files</p>
    </div>
    <ul class="file-tree-root">
${renderNodes(options.items)}
    </ul>
  </div>
</nav>
`;
}

export function renderFileTreeScript(enabled: boolean): string {
  if (!enabled) return "";

  return `<script>
(() => {
  const tree = document.querySelector('.file-tree');
  if (!tree) return;

  const toggle = tree.querySelector('.file-tree-toggle');
  const panel = tree.querySelector('.file-tree-panel');
  const input = tree.querySelector('.file-tree-filter-input');
  const empty = tree.querySelector('.file-tree-filter-empty');
  const root = tree.querySelector('.file-tree-root');
  const directories = [...root.querySelectorAll('.file-tree-directory')];
  const initialOpenState = new Map(
    directories.map((directory) => {
      const details = directory.querySelector(':scope > details');
      return [details, details.open];
    }),
  );

  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(expanded));
    const label = expanded ? 'Hide files' : 'Show files';
    toggle.setAttribute('aria-label', label);
    toggle.title = label;
    panel.hidden = !expanded;
  });

  const filter = () => {
    const query = input.value.trim().toLocaleLowerCase();
    const files = [...root.querySelectorAll('.file-tree-file')];
    let matches = 0;

    for (const file of files) {
      const name = file.querySelector('a').dataset.fileName.toLocaleLowerCase();
      const visible = query === '' || name.includes(query);
      file.hidden = !visible;
      if (visible) matches += 1;
    }

    for (const directory of [...directories].reverse()) {
      const details = directory.querySelector(':scope > details');
      const hasVisibleFile = [...details.querySelectorAll('.file-tree-file')]
        .some((file) => !file.hidden);
      directory.hidden = !hasVisibleFile;
      details.open = query === '' ? initialOpenState.get(details) : hasVisibleFile;
    }

    empty.hidden = matches !== 0;
  };

  input.addEventListener('input', filter);
  input.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || input.value === '') return;
    input.value = '';
    filter();
  });
})();
</script>`;
}

export function renderBreadcrumbs(breadcrumbs?: FileBreadcrumb[]): string {
  if (!breadcrumbs || breadcrumbs.length === 0) return "";

  const items = breadcrumbs
    .map((breadcrumb) => {
      const label = breadcrumb.href
        ? `<a href="${escapeHtml(breadcrumb.href)}">${escapeHtml(breadcrumb.name)}</a>`
        : `<span${breadcrumb.current ? ' aria-current="page"' : ""}>${escapeHtml(breadcrumb.name)}</span>`;
      return `    <li>${label}</li>`;
    })
    .join("\n");

  return `<nav class="file-breadcrumbs" aria-label="Breadcrumb">
  <ol>
${items}
  </ol>
</nav>
`;
}
