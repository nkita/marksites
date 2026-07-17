import { createHash } from "node:crypto";
import type {
  FileBreadcrumb,
  FileTreeNode,
  FileTreeOptions,
} from "../types.js";
import { escapeHtml } from "../utils/html.js";
import { renderCopyIcon, renderFolderIcon } from "../utils/icons.js";

function createFolderIds(nodes: FileTreeNode[]): Map<string, string> {
  const paths: string[] = [];
  const collect = (items: FileTreeNode[], parentPath = ""): void => {
    for (const item of items) {
      if (item.type !== "directory") continue;
      const path = parentPath ? `${parentPath}/${item.name}` : item.name;
      paths.push(path);
      collect(item.children, path);
    }
  };
  collect(nodes);
  const hashes = new Map(
    paths.map((path) => [
      path,
      createHash("sha256").update(path).digest("base64url"),
    ]),
  );
  let length = 6;
  const uniqueAt = (size: number): boolean =>
    new Set([...hashes.values()].map((hash) => hash.slice(0, size))).size ===
    hashes.size;
  while (!uniqueAt(length) && length < 43) {
    length++;
  }
  if (!uniqueAt(length)) throw new Error("Folder ID hash collision");
  return new Map(
    [...hashes].map(([path, hash]) => [path, hash.slice(0, length)]),
  );
}

function renderNodes(
  nodes: FileTreeNode[],
  folderIds: Map<string, string>,
  parentPath = "",
): string {
  return nodes
    .map((node) => {
      if (node.type === "directory") {
        const path = parentPath ? `${parentPath}/${node.name}` : node.name;
        return `      <li class="file-tree-directory">
        <details data-folder-id="${folderIds.get(path)}">
          <summary>${renderFolderIcon()}<span>${escapeHtml(node.name)}</span></summary>
          <ul>
${renderNodes(node.children, folderIds, path)}
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
  const folderIds = createFolderIds(options.items);

  return `<nav class="file-tree" id="file-tree-popover" aria-label="${escapeHtml(options.title ?? "Files")}" hidden>
    <div class="file-tree-filter">
      <input type="search" class="file-tree-filter-input" placeholder="Filter files" aria-label="Filter files by name" autocomplete="off">
      <p class="file-tree-filter-empty" hidden>No matching files</p>
    </div>
    <ul class="file-tree-root">
${renderNodes(options.items, folderIds)}
    </ul>
</nav>
`;
}

export function renderFileTreeScript(enabled: boolean): string {
  if (!enabled) return "";

  return `<script>
(() => {
  const tree = document.querySelector('.file-tree');
  if (!tree) return;

  const popoverToggle = document.querySelector('[data-file-tree-toggle]');
  const input = tree.querySelector('.file-tree-filter-input');
  const empty = tree.querySelector('.file-tree-filter-empty');
  const root = tree.querySelector('.file-tree-root');
  const copyPath = document.querySelector('[data-copy-file-path]');
  const directories = [...root.querySelectorAll('.file-tree-directory')];
  const stateParameter = 'open';
  const popoverParameter = 'marksites-files';
  const pageUrl = new URL(location.href);
  const openPaths = new Set(pageUrl.searchParams.getAll(stateParameter));
  const popoverOpen = pageUrl.searchParams.get(popoverParameter) === 'open';
  tree.hidden = !popoverOpen;
  popoverToggle.setAttribute('aria-expanded', String(popoverOpen));
  popoverToggle.setAttribute('aria-label', popoverOpen ? 'Hide files' : 'Show files');
  popoverToggle.title = popoverOpen ? 'Hide files' : 'Show files';

  for (const directory of directories) {
    const details = directory.querySelector(':scope > details');
    details.open = openPaths.has(details.dataset.folderId);
  }

  const initialOpenState = new Map(
    directories.map((directory) => {
      const details = directory.querySelector(':scope > details');
      return [details, details.open];
    }),
  );
  const ignoredToggles = new WeakSet();

  const syncState = () => {
    const open = directories
      .map((directory) => directory.querySelector(':scope > details'))
      .filter((details) => details.open)
      .map((details) => details.dataset.folderId);
    const updateUrl = (url) => {
      url.searchParams.delete(stateParameter);
      for (const path of open) url.searchParams.append(stateParameter, path);
      url.searchParams.delete(popoverParameter);
      if (!tree.hidden) url.searchParams.set(popoverParameter, 'open');
      return url;
    };

    history.replaceState(null, '', updateUrl(new URL(location.href)));
    for (const link of document.querySelectorAll('a[href]')) {
      const rawHref = link.getAttribute('href');
      if (!rawHref || rawHref.startsWith('#')) continue;
      const url = new URL(rawHref, location.href);
      if (url.protocol !== location.protocol || url.host !== location.host || !url.pathname.endsWith('.html')) continue;
      link.href = updateUrl(url).href;
    }
  };

  root.addEventListener('toggle', (event) => {
    if (ignoredToggles.delete(event.target)) return;
    if (input.value !== '' || !event.target.matches('details[data-folder-id]')) return;
    initialOpenState.set(event.target, event.target.open);
    syncState();
  }, true);

  if (openPaths.size > 0 || popoverOpen) syncState();

  const setPopoverOpen = (open, restoreFocus = false) => {
    tree.hidden = !open;
    popoverToggle.setAttribute('aria-expanded', String(open));
    const label = open ? 'Hide files' : 'Show files';
    popoverToggle.setAttribute('aria-label', label);
    popoverToggle.title = label;
    syncState();
    if (open) input.focus();
    else if (restoreFocus) popoverToggle.focus();
  };

  popoverToggle?.addEventListener('click', (event) => {
    event.preventDefault();
    setPopoverOpen(tree.hidden);
  });
  document.addEventListener('pointerdown', (event) => {
    if (tree.hidden || event.target.closest('.file-navigation')) return;
    setPopoverOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !tree.hidden) setPopoverOpen(false, true);
  });
  copyPath?.addEventListener('click', async () => {
    const path = copyPath.dataset.copyFilePath;
    try {
      if (navigator.clipboard && location.protocol !== 'file:') {
        await navigator.clipboard.writeText(path);
      } else {
        const area = document.createElement('textarea');
        area.value = path;
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.append(area);
        area.select();
        const copied = document.execCommand('copy');
        area.remove();
        if (!copied) throw new Error('Copy failed');
      }
      copyPath.setAttribute('aria-label', 'Copied file path');
      copyPath.title = 'Copied';
    } catch {
      copyPath.setAttribute('aria-label', 'Could not copy file path');
      copyPath.title = 'Copy failed';
    }
    setTimeout(() => {
      copyPath.setAttribute('aria-label', 'Copy file path');
      copyPath.title = 'Copy file path';
    }, 1000);
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
      const open = query === '' ? initialOpenState.get(details) : hasVisibleFile;
      if (details.open !== open) {
        ignoredToggles.add(details);
        details.open = open;
      }
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

export function renderBreadcrumbs(
  breadcrumbs?: FileBreadcrumb[],
  modifiedAt?: string,
): string {
  const timestamp = renderModifiedAt(modifiedAt);
  if (!breadcrumbs || breadcrumbs.length === 0)
    return `<nav class="file-breadcrumbs" aria-label="Breadcrumb">
  <button type="button" class="file-tree-popover-toggle" data-file-tree-toggle aria-expanded="false" aria-controls="file-tree-popover" aria-haspopup="true" aria-label="Show files" title="Show files">${renderFolderIcon()}<span>Files</span><svg class="panel-toggle-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" /></svg></button>
${timestamp}
</nav>
`;

  const items = breadcrumbs
    .map((breadcrumb) => {
      const label = breadcrumb.href
        ? `<a href="${escapeHtml(breadcrumb.href)}">${escapeHtml(breadcrumb.name)}</a>`
        : `<span${breadcrumb.current ? ' aria-current="page"' : ""}>${escapeHtml(breadcrumb.name)}</span>`;
      return `    <li>${label}</li>`;
    })
    .join("\n");
  const path = breadcrumbs.map((breadcrumb) => breadcrumb.name).join("/");

  return `<nav class="file-breadcrumbs" aria-label="Breadcrumb">
  <button type="button" class="file-tree-popover-toggle" data-file-tree-toggle aria-expanded="false" aria-controls="file-tree-popover" aria-haspopup="true" aria-label="Show files" title="Show files">${renderFolderIcon()}<span>Files</span><svg class="panel-toggle-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" /></svg></button>
  <ol>
${items}
  </ol>
  <button type="button" class="copy-file-path" data-copy-file-path="${escapeHtml(path)}" aria-label="Copy file path" title="Copy file path">${renderCopyIcon()}</button>
${timestamp}
</nav>
`;
}

export function renderModifiedAt(modifiedAt?: string): string {
  if (!modifiedAt) return "";
  const date = new Date(modifiedAt);
  if (Number.isNaN(date.getTime()))
    throw new Error(`Invalid modifiedAt timestamp: ${modifiedAt}`);
  const label = `${date.toISOString().slice(0, 19).replace("T", " ")} UTC`;
  return `<time class="document-modified" datetime="${date.toISOString()}">Updated ${label}</time>`;
}

export function renderModifiedAtScript(enabled: boolean): string {
  if (!enabled) return "";
  return `<script>(()=>{
const element=document.querySelector('.document-modified');if(!element)return;
const date=new Date(element.dateTime);if(Number.isNaN(date.getTime()))return;
const pad=value=>String(value).padStart(2,'0');
const zone=new Intl.DateTimeFormat('en',{timeZoneName:'short'}).formatToParts(date).find(part=>part.type==='timeZoneName')?.value;
element.textContent='Updated '+date.getFullYear()+'-'+pad(date.getMonth()+1)+'-'+pad(date.getDate())+' '+pad(date.getHours())+':'+pad(date.getMinutes())+':'+pad(date.getSeconds())+(zone?' '+zone:'');
})()</script>`;
}
