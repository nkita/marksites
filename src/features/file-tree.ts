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
          ? `<span class="file-tree-comment-count" aria-label="コメント${node.commentCount}件">${node.commentCount}</span>`
          : "";
      return `      <li class="file-tree-file"><a href="${escapeHtml(node.href)}" data-file-name="${escapeHtml(node.name)}"${current}><span class="file-tree-name">${escapeHtml(node.name)}</span>${count}</a></li>`;
    })
    .join("\n");
}

export function renderFileTree(options?: FileTreeOptions): string {
  if (!options || options.items.length === 0) return "";
  const folderIds = createFolderIds(options.items);
  const contents = renderTreeContents(options.items, folderIds);

  return `<nav class="file-tree file-tree-popover" id="file-tree-popover" aria-label="${escapeHtml(options.title ?? "ファイル")}" hidden>
${contents}</nav>
`;
}

function renderTreeContents(
  items: FileTreeNode[],
  folderIds: Map<string, string>,
): string {
  return `    <div class="file-tree-filter">
      <input type="search" class="file-tree-filter-input" placeholder="ファイルを検索" aria-label="ファイル名で検索" autocomplete="off">
      <p class="file-tree-filter-empty" hidden>一致するファイルはありません</p>
    </div>
    <ul class="file-tree-root">
${renderNodes(items, folderIds)}
    </ul>
`;
}

export function renderFileSidebar(options?: FileTreeOptions): string {
  if (!options || options.items.length === 0) return "";
  const folderIds = createFolderIds(options.items);
  const title = escapeHtml(options.title ?? "ファイル");

  return `<button type="button" class="file-sidebar-close" data-file-sidebar-close aria-label="ファイルサイドバーを閉じる" title="ファイルサイドバーを閉じる"><svg class="file-sidebar-toggle-icon" viewBox="0 0 16 16" aria-hidden="true"><rect x="1.75" y="2.25" width="12.5" height="11.5" rx="1.5" /><path d="M6 2.5v11M10.5 5.5L8 8l2.5 2.5" /></svg></button>
<aside class="file-sidebar" id="file-sidebar" aria-label="${title}">
  <div class="file-sidebar-header"><span>${title}</span></div>
  <nav class="file-tree file-tree-sidebar" aria-label="${title}">
    <div class="file-tree-filter">
      <input type="search" class="file-tree-filter-input" placeholder="ファイルを検索" aria-label="ファイル名で検索" autocomplete="off">
      <p class="file-tree-filter-empty" hidden>一致するファイルはありません</p>
    </div>
    <ul class="file-tree-root">
${renderNodes(options.items, folderIds)}
    </ul>
</nav>
</aside>
`;
}

export function renderFileTreeScript(enabled: boolean): string {
  if (!enabled) return "";

  return `<script>
(() => {
  const trees = [...document.querySelectorAll('.file-tree')];
  if (trees.length === 0) return;
  const popover = document.querySelector('.file-tree-popover');
  const sidebar = document.querySelector('.file-sidebar');
  const popoverToggle = document.querySelector('[data-file-tree-toggle]');
  const sidebarOpenButton = document.querySelector('[data-file-sidebar-open]');
  const sidebarCloseButton = document.querySelector('[data-file-sidebar-close]');
  const copyPath = document.querySelector('[data-copy-file-path]');
  const directories = [...document.querySelectorAll('.file-tree-directory')];
  const stateParameter = 'open';
  const popoverParameter = 'marksites-files';
  const sidebarParameter = 'file-sidebar';
  const pageUrl = new URL(location.href);
  const openPaths = new Set(pageUrl.searchParams.getAll(stateParameter));
  const compact = matchMedia('(max-width: 900px)');
  let sidebarPreferenceOpen = pageUrl.searchParams.get(sidebarParameter) !== 'closed';
  const ignoredToggles = new WeakSet();
  const initialOpenState = new Map();

  for (const directory of directories) {
    const details = directory.querySelector(':scope > details');
    details.open = openPaths.has(details.dataset.folderId);
    initialOpenState.set(details.dataset.folderId, details.open);
  }

  const syncState = () => {
    const open = [...initialOpenState]
      .filter(([, isOpen]) => isOpen)
      .map(([id]) => id);
    const updateUrl = (url) => {
      url.searchParams.delete(stateParameter);
      for (const path of open) url.searchParams.append(stateParameter, path);
      url.searchParams.delete(popoverParameter);
      if (!popover.hidden) url.searchParams.set(popoverParameter, 'open');
      url.searchParams.delete(sidebarParameter);
      if (!sidebarPreferenceOpen) url.searchParams.set(sidebarParameter, 'closed');
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

  for (const tree of trees) {
    tree.querySelector('.file-tree-root').addEventListener('toggle', (event) => {
      if (ignoredToggles.delete(event.target)) return;
      const input = tree.querySelector('.file-tree-filter-input');
      if (input.value !== '' || !event.target.matches('details[data-folder-id]')) return;
      const id = event.target.dataset.folderId;
      initialOpenState.set(id, event.target.open);
      for (const peer of document.querySelectorAll('details[data-folder-id="'+CSS.escape(id)+'"]')) {
        if (peer === event.target || peer.open === event.target.open) continue;
        ignoredToggles.add(peer);
        peer.open = event.target.open;
      }
      syncState();
    }, true);
  }

  const setPopoverOpen = (open, restoreFocus = false, sync = true) => {
    popover.hidden = !open;
    popoverToggle.setAttribute('aria-expanded', String(open));
    const label = open ? 'ファイルを閉じる' : 'ファイルを開く';
    popoverToggle.setAttribute('aria-label', label);
    popoverToggle.title = label;
    if (sync) syncState();
    if (open) popover.querySelector('.file-tree-filter-input').focus();
    else if (restoreFocus) popoverToggle.focus();
  };

  const applySidebarState = (open) => {
    sidebar.hidden = !open;
    sidebarCloseButton.hidden = !open;
    sidebarOpenButton.hidden = open;
    sidebarOpenButton.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('file-sidebar-collapsed', !open);
  };

  const setSidebarOpen = (open, sync = true) => {
    sidebarPreferenceOpen = open;
    applySidebarState(open);
    if (sync) syncState();
    if (open) sidebar.querySelector('.file-tree-filter-input').focus();
    else sidebarOpenButton.focus();
  };

  setPopoverOpen(pageUrl.searchParams.get(popoverParameter) === 'open', false, false);
  applySidebarState(sidebarPreferenceOpen && !compact.matches);
  syncState();

  popoverToggle?.addEventListener('click', (event) => {
    event.preventDefault();
    setPopoverOpen(popover.hidden);
  });
  sidebarOpenButton?.addEventListener('click', () => setSidebarOpen(true));
  sidebarCloseButton?.addEventListener('click', () => setSidebarOpen(false));
  document.addEventListener('pointerdown', (event) => {
    if (popover.hidden || event.target.closest('.file-navigation,.file-sidebar')) return;
    setPopoverOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !popover.hidden) setPopoverOpen(false, true);
  });
  compact.addEventListener('change', () => applySidebarState(sidebarPreferenceOpen && !compact.matches));
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
        if (!copied) throw new Error('コピーに失敗しました');
      }
      copyPath.setAttribute('aria-label', 'ファイルパスをコピーしました');
      copyPath.title = 'コピーしました';
    } catch {
      copyPath.setAttribute('aria-label', 'ファイルパスをコピーできませんでした');
      copyPath.title = 'コピーに失敗しました';
    }
    setTimeout(() => {
      copyPath.setAttribute('aria-label', 'ファイルパスをコピー');
      copyPath.title = 'ファイルパスをコピー';
    }, 1000);
  });

  for (const tree of trees) {
    const input = tree.querySelector('.file-tree-filter-input');
    const empty = tree.querySelector('.file-tree-filter-empty');
    const root = tree.querySelector('.file-tree-root');
    const treeDirectories = [...root.querySelectorAll('.file-tree-directory')];
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
      for (const directory of [...treeDirectories].reverse()) {
        const details = directory.querySelector(':scope > details');
        const hasVisibleFile = [...details.querySelectorAll('.file-tree-file')].some((file) => !file.hidden);
        directory.hidden = !hasVisibleFile;
        const open = query === '' ? initialOpenState.get(details.dataset.folderId) : hasVisibleFile;
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
  }
})();
</script>`;
}

export function renderBreadcrumbs(
  breadcrumbs?: FileBreadcrumb[],
  modifiedAt?: string,
): string {
  const timestamp = renderModifiedAt(modifiedAt);
  if (!breadcrumbs || breadcrumbs.length === 0)
    return `<nav class="file-breadcrumbs" aria-label="パンくずリスト">
  <button type="button" class="file-sidebar-open" data-file-sidebar-open aria-expanded="true" aria-controls="file-sidebar" aria-label="ファイルサイドバーを開く" title="ファイルサイドバーを開く" hidden><svg class="file-sidebar-toggle-icon" viewBox="0 0 16 16" aria-hidden="true"><rect x="1.75" y="2.25" width="12.5" height="11.5" rx="1.5" /><path d="M6 2.5v11M8 5.5L10.5 8 8 10.5" /></svg></button>
  <button type="button" class="file-tree-popover-toggle" data-file-tree-toggle aria-expanded="false" aria-controls="file-tree-popover" aria-haspopup="true" aria-label="ファイルを開く" title="ファイルを開く"><span>ファイル</span><svg class="panel-toggle-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" /></svg></button>
${timestamp}
</nav>
`;

  const current = breadcrumbs.find((breadcrumb) => breadcrumb.current);
  const popoverLabel = escapeHtml(current?.name ?? "ファイル");
  const items = breadcrumbs
    .filter((breadcrumb) => !breadcrumb.current)
    .map((breadcrumb) => {
      const label = breadcrumb.href
        ? `<a href="${escapeHtml(breadcrumb.href)}">${escapeHtml(breadcrumb.name)}</a>`
        : `<span>${escapeHtml(breadcrumb.name)}</span>`;
      return `    <li>${label}</li>`;
    })
    .join("\n");
  const trail = items
    ? `  <ol>
${items}
  </ol>
  <span class="file-breadcrumb-separator" aria-hidden="true">/</span>
`
    : "";
  const path = breadcrumbs.map((breadcrumb) => breadcrumb.name).join("/");

  return `<nav class="file-breadcrumbs" aria-label="パンくずリスト">
  <button type="button" class="file-sidebar-open" data-file-sidebar-open aria-expanded="true" aria-controls="file-sidebar" aria-label="ファイルサイドバーを開く" title="ファイルサイドバーを開く" hidden><svg class="file-sidebar-toggle-icon" viewBox="0 0 16 16" aria-hidden="true"><rect x="1.75" y="2.25" width="12.5" height="11.5" rx="1.5" /><path d="M6 2.5v11M8 5.5L10.5 8 8 10.5" /></svg></button>
${trail}  <button type="button" class="file-tree-popover-toggle" data-file-tree-toggle aria-expanded="false" aria-controls="file-tree-popover" aria-haspopup="true" aria-label="ファイルを開く" title="ファイルを開く"><span>${popoverLabel}</span><svg class="panel-toggle-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" /></svg></button>
  <button type="button" class="copy-file-path" data-copy-file-path="${escapeHtml(path)}" aria-label="ファイルパスをコピー" title="ファイルパスをコピー">${renderCopyIcon()}</button>
${timestamp}
</nav>
`;
}

export function renderModifiedAt(modifiedAt?: string): string {
  if (!modifiedAt) return "";
  const date = new Date(modifiedAt);
  if (Number.isNaN(date.getTime()))
    throw new Error(`Invalid modifiedAt timestamp: ${modifiedAt}`);
  const label = date.toISOString().slice(0, 19).replace("T", " ");
  return `<time class="document-modified" datetime="${date.toISOString()}">更新 ${label}</time>`;
}

export function renderModifiedAtScript(enabled: boolean): string {
  if (!enabled) return "";
  return `<script>(()=>{
const element=document.querySelector('.document-modified');if(!element)return;
const date=new Date(element.dateTime);if(Number.isNaN(date.getTime()))return;
const pad=value=>String(value).padStart(2,'0');
element.textContent='更新 '+date.getFullYear()+'-'+pad(date.getMonth()+1)+'-'+pad(date.getDate())+' '+pad(date.getHours())+':'+pad(date.getMinutes())+':'+pad(date.getSeconds());
})()</script>`;
}
