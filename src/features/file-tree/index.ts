import { createHash } from "node:crypto";
import type {
  FileBreadcrumb,
  FileTreeNode,
  FileTreeOptions,
} from "../../types.js";
import { escapeHtml } from "../../utils/html.js";
import { renderCopyIcon, renderFolderIcon } from "../../utils/icons.js";

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
        const commentCount = countComments(node.children);
        const count = commentCount
          ? `<span class="file-tree-comment-count file-tree-directory-comment-count" aria-label="配下のコメント${commentCount}件">${commentCount}</span>`
          : "";
        return `      <li class="file-tree-directory">
        <details data-folder-id="${folderIds.get(path)}">
          <summary>${renderFolderIcon()}<span>${escapeHtml(node.name)}</span>${count}</summary>
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

function countComments(nodes: FileTreeNode[]): number {
  return nodes.reduce(
    (total, node) =>
      total +
      (node.type === "directory"
        ? countComments(node.children)
        : Number.isSafeInteger(node.commentCount) && node.commentCount! > 0
          ? node.commentCount!
          : 0),
    0,
  );
}

interface RecentFile {
  name: string;
  path: string;
  href: string;
  current: boolean;
  modifiedAt: string;
  timestamp: number;
  commentCount?: number;
}

function collectRecentFiles(nodes: FileTreeNode[]): RecentFile[] {
  const files: RecentFile[] = [];
  const collect = (items: FileTreeNode[], parentPath = ""): void => {
    for (const item of items) {
      if (item.type === "directory") {
        collect(
          item.children,
          parentPath ? `${parentPath}/${item.name}` : item.name,
        );
        continue;
      }
      if (!item.modifiedAt) continue;
      const date = new Date(item.modifiedAt);
      if (Number.isNaN(date.getTime()))
        throw new Error(
          `Invalid file tree modifiedAt timestamp: ${item.modifiedAt}`,
        );
      files.push({
        name: item.name,
        path:
          item.path ?? (parentPath ? `${parentPath}/${item.name}` : item.name),
        href: item.href,
        current: item.current === true,
        modifiedAt: date.toISOString(),
        timestamp: date.getTime(),
        commentCount: item.commentCount,
      });
    }
  };
  collect(nodes);
  return files.sort(
    (left, right) =>
      right.timestamp - left.timestamp ||
      left.path.localeCompare(right.path, "en"),
  );
}

function renderRecentFiles(nodes: FileTreeNode[]): string {
  const files = collectRecentFiles(nodes);
  if (files.length === 0)
    return `    <li class="file-tree-recent-empty">更新日時のあるファイルはありません</li>`;
  let currentDate = "";
  let groupNumber = 0;
  const output: string[] = [];
  for (let index = 0; index < files.length; ) {
    const first = files[index]!;
    const date = first.modifiedAt.slice(0, 10);
    if (date !== currentDate) {
      const dateCount = files.filter((file) =>
        file.modifiedAt.startsWith(date),
      ).length;
      output.push(
        `    <li class="file-tree-date" data-date="${date}"><button type="button" data-recent-date-toggle aria-expanded="true"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4"/></svg><time datetime="${date}">${Number(date.slice(0, 4))}年${Number(date.slice(5, 7))}月${Number(date.slice(8, 10))}日</time><span aria-label="ファイル${dateCount}件">${dateCount}</span></button></li>`,
      );
      currentDate = date;
    }
    const separator = first.path.lastIndexOf("/");
    const directory =
      separator === -1 ? "" : first.path.slice(0, separator + 1);
    let end = index + 1;
    while (end < files.length) {
      const candidate = files[end]!;
      const candidateSeparator = candidate.path.lastIndexOf("/");
      const candidateDirectory =
        candidateSeparator === -1
          ? ""
          : candidate.path.slice(0, candidateSeparator + 1);
      if (
        candidate.modifiedAt.slice(0, 10) !== date ||
        candidateDirectory !== directory
      )
        break;
      end++;
    }
    const grouped = end - index >= 2;
    const groupId = grouped ? `recent-${groupNumber++}` : "";
    const directoryLabel = directory ? `/${directory}` : "/";
    if (grouped)
      output.push(
        `    <li class="file-tree-directory-group" data-recent-group="${groupId}" title="${escapeHtml(directoryLabel)}">${renderFolderIcon()}<span>${escapeHtml(directoryLabel)}</span></li>`,
      );
    for (; index < end; index++) {
      const file = files[index]!;
      const current = file.current ? ' aria-current="page"' : "";
      const count =
        Number.isSafeInteger(file.commentCount) && file.commentCount! > 0
          ? `<span class="file-tree-comment-count" aria-label="コメント${file.commentCount}件">${file.commentCount}</span>`
          : "";
      const time = file.modifiedAt.slice(11, 16);
      output.push(
        `    <li class="file-tree-recent-file${grouped ? " is-grouped" : ""}" data-file-path="${escapeHtml(file.path)}" data-directory="${escapeHtml(directory)}" data-modified-at="${file.modifiedAt}"${grouped ? ` data-recent-group="${groupId}"` : ""}><a href="${escapeHtml(file.href)}" title="${escapeHtml(file.path)}"${current}><time datetime="${file.modifiedAt}">${time}</time><span class="file-tree-recent-label"><span class="file-tree-name">${escapeHtml(file.name)}</span><span class="file-tree-directory-path">${renderFolderIcon()}<span>${escapeHtml(directoryLabel)}</span></span></span>${count}</a></li>`,
      );
    }
  }
  return output.join("\n");
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
  return `    <div class="file-tree-view-tabs" role="tablist" aria-label="ファイル表示">
      <button type="button" role="tab" data-file-tree-view="tree" aria-selected="true">ツリー</button>
      <button type="button" role="tab" data-file-tree-view="recent" aria-selected="false" tabindex="-1">更新順</button>
    </div>
    <div class="file-tree-filter">
      <input type="search" class="file-tree-filter-input" placeholder="ファイルを検索" aria-label="ファイル名で検索" autocomplete="off">
      <p class="file-tree-filter-empty" hidden>一致するファイルはありません</p>
    </div>
    <ul class="file-tree-root" data-file-tree-panel="tree" role="tabpanel">
${renderNodes(items, folderIds)}
    </ul>
    <ul class="file-tree-recent" data-file-tree-panel="recent" role="tabpanel" hidden>
${renderRecentFiles(items)}
    </ul>
`;
}

export function renderFileSidebar(options?: FileTreeOptions): string {
  if (!options || options.items.length === 0) return "";
  const folderIds = createFolderIds(options.items);
  const title = escapeHtml(options.title ?? "ファイル");
  const contents = renderTreeContents(options.items, folderIds);

  return `<button type="button" class="file-sidebar-close" data-file-sidebar-close aria-label="ファイルサイドバーを閉じる" title="ファイルサイドバーを閉じる"><svg class="file-sidebar-toggle-icon" viewBox="0 0 16 16" aria-hidden="true"><rect x="1.75" y="2.25" width="12.5" height="11.5" rx="1.5" /><path d="M6 2.5v11M10.5 5.5L8 8l2.5 2.5" /></svg></button>
<aside class="file-sidebar" id="file-sidebar" aria-label="${title}">
  <div class="file-sidebar-header"><span>${title}</span></div>
  <nav class="file-tree file-tree-sidebar" aria-label="${title}">
${contents}
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
  const viewParameter = 'file-view';
  const pageUrl = new URL(location.href);
  const openPaths = new Set(pageUrl.searchParams.getAll(stateParameter));
  const compact = matchMedia('(max-width: 900px)');
  let sidebarPreferenceOpen = pageUrl.searchParams.get(sidebarParameter) !== 'closed';
  let activeView = pageUrl.searchParams.get(viewParameter) === 'recent' ? 'recent' : 'tree';
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
      url.searchParams.delete(viewParameter);
      if (activeView === 'recent') url.searchParams.set(viewParameter, 'recent');
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
    if (open && !popover.hidden) setPopoverOpen(false, false, false);
    sidebar.hidden = !open;
    sidebarCloseButton.hidden = !open;
    sidebarOpenButton.hidden = open;
    sidebarOpenButton.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('file-sidebar-collapsed', !open);
    popoverToggle.disabled = open;
    popoverToggle.setAttribute('aria-disabled', String(open));
  };

  const setSidebarOpen = (open, sync = true) => {
    sidebarPreferenceOpen = open;
    applySidebarState(open);
    if (sync) syncState();
    if (open) sidebar.querySelector('.file-tree-filter-input').focus();
    else sidebarOpenButton.focus();
  };

  const openRecentDates = new Set();

  const rebuildRecentGroups = (tree) => {
    const list = tree.querySelector('.file-tree-recent');
    if (!list) return;
    const files = [...list.querySelectorAll('.file-tree-recent-file')];
    for (const heading of list.querySelectorAll('.file-tree-date,.file-tree-directory-group')) heading.remove();
    for (const file of files) {
      file.classList.remove('is-grouped');
      delete file.dataset.recentGroup;
    }
    const pad = value => String(value).padStart(2, '0');
    files.sort((left, right) => {
      const dateDifference = new Date(right.dataset.modifiedAt) - new Date(left.dataset.modifiedAt);
      return dateDifference || left.dataset.filePath.localeCompare(right.dataset.filePath, 'en');
    });
    let previousDate = '',groupNumber = 0;
    for (let index = 0; index < files.length;) {
      const first = files[index];
      const firstDate = new Date(first.dataset.modifiedAt);
      const dateKey = firstDate.getFullYear()+'-'+pad(firstDate.getMonth()+1)+'-'+pad(firstDate.getDate());
      let end = index+1;
      while (end < files.length) {
        const candidate = files[end],candidateDate = new Date(candidate.dataset.modifiedAt);
        const candidateDateKey = candidateDate.getFullYear()+'-'+pad(candidateDate.getMonth()+1)+'-'+pad(candidateDate.getDate());
        if (candidateDateKey !== dateKey || candidate.dataset.directory !== first.dataset.directory) break;
        end++;
      }
      const grouped = end-index >= 2;
      const groupId = grouped ? 'recent-'+groupNumber++ : '';
      if (dateKey !== previousDate) {
        const heading = document.createElement('li');
        heading.className = 'file-tree-date';
        heading.dataset.date = dateKey;
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.recentDateToggle = '';
        button.setAttribute('aria-expanded', 'true');
        button.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4"/></svg>';
        const label = document.createElement('time');
        label.dateTime = dateKey;
        label.textContent = firstDate.getFullYear()+'年'+(firstDate.getMonth()+1)+'月'+firstDate.getDate()+'日';
        const count = document.createElement('span');
        const dateCount = files.filter(file => {
          const value = new Date(file.dataset.modifiedAt);
          return value.getFullYear()+'-'+pad(value.getMonth()+1)+'-'+pad(value.getDate()) === dateKey;
        }).length;
        count.textContent = String(dateCount);
        count.setAttribute('aria-label', 'ファイル'+dateCount+'件');
        button.append(label,count);
        heading.append(button);
        list.append(heading);
        previousDate = dateKey;
      }
      if (grouped) {
        const group = document.createElement('li');
        group.className = 'file-tree-directory-group';
        group.dataset.recentGroup = groupId;
        group.dataset.localDate = dateKey;
        const directoryLabel = first.dataset.directory ? '/'+first.dataset.directory : '/';
        group.title = directoryLabel;
        group.innerHTML = ${JSON.stringify(renderFolderIcon())};
        const name = document.createElement('span');
        name.textContent = directoryLabel;
        group.append(name);
        list.append(group);
      }
      for (; index < end; index++) {
        const file = files[index];
      const date = new Date(file.dataset.modifiedAt);
      file.dataset.localDate = dateKey;
      const time = file.querySelector('time');
      time.textContent = pad(date.getHours())+':'+pad(date.getMinutes());
        if (grouped) {
          file.classList.add('is-grouped');
          file.dataset.recentGroup = groupId;
        }
        list.append(file);
      }
    }
  };

  for (const tree of trees) rebuildRecentGroups(tree);

  const firstRecentTree = trees[0];
  const firstRecentFiles = [...firstRecentTree.querySelectorAll('.file-tree-recent-file')];
  const latestRecentDate = firstRecentFiles[0]?.dataset.localDate;
  if (latestRecentDate) openRecentDates.add(latestRecentDate);
  for (const file of firstRecentFiles) {
    if (file.querySelector('a[aria-current="page"]')) openRecentDates.add(file.dataset.localDate);
  }

  const applyRecentDateState = (searching = false) => {
    for (const tree of trees) {
      const files = [...tree.querySelectorAll('.file-tree-recent-file')];
      for (const heading of tree.querySelectorAll('.file-tree-date')) {
        const expanded = searching
          ? files.some(file => file.dataset.localDate === heading.dataset.date && !file.hidden)
          : openRecentDates.has(heading.dataset.date);
        heading.querySelector('button').setAttribute('aria-expanded', String(expanded));
        for (const item of tree.querySelectorAll('.file-tree-recent-file,.file-tree-directory-group')) {
          if (item.dataset.localDate === heading.dataset.date)
            item.classList.toggle('is-date-collapsed', !expanded);
        }
      }
    }
  };

  applyRecentDateState();
  for (const tree of trees) {
    for (const button of tree.querySelectorAll('[data-recent-date-toggle]')) {
      button.addEventListener('click', () => {
        if (tree.querySelector('.file-tree-filter-input').value.trim() !== '') return;
        const date = button.closest('.file-tree-date').dataset.date;
        if (openRecentDates.has(date)) openRecentDates.delete(date);
        else openRecentDates.add(date);
        applyRecentDateState();
      });
    }
  }

  const applyView = (view, sync = true) => {
    activeView = view;
    for (const tree of trees) {
      for (const button of tree.querySelectorAll('[data-file-tree-view]')) {
        const selected = button.dataset.fileTreeView === view;
        button.setAttribute('aria-selected', String(selected));
        button.tabIndex = selected ? 0 : -1;
      }
      for (const panel of tree.querySelectorAll('[data-file-tree-panel]'))
        panel.hidden = panel.dataset.fileTreePanel !== view;
      const selector = view === 'tree' ? '.file-tree-file' : '.file-tree-recent-file';
      const items = [...tree.querySelectorAll(selector)];
      tree.querySelector('.file-tree-filter-empty').hidden = items.length === 0 || items.some(item => !item.hidden);
    }
    if (sync) syncState();
  };

  for (const tree of trees) {
    const buttons = [...tree.querySelectorAll('[data-file-tree-view]')];
    for (const button of buttons) {
      button.addEventListener('click', () => applyView(button.dataset.fileTreeView));
      button.addEventListener('keydown', (event) => {
        if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
        event.preventDefault();
        const direction = event.key === 'ArrowRight' ? 1 : -1;
        const next = buttons[(buttons.indexOf(button)+direction+buttons.length)%buttons.length];
        applyView(next.dataset.fileTreeView);
        next.focus();
      });
    }
  }

  applySidebarState(sidebarPreferenceOpen && !compact.matches);
  setPopoverOpen(pageUrl.searchParams.get(popoverParameter) === 'open' && sidebar.hidden, false, false);
  applyView(activeView, false);
  syncState();

  popoverToggle?.addEventListener('click', (event) => {
    event.preventDefault();
    setPopoverOpen(popover.hidden);
  });
  sidebarOpenButton?.addEventListener('click', () => setSidebarOpen(true));
  sidebarCloseButton?.addEventListener('click', () => setSidebarOpen(false));
  document.addEventListener('pointerdown', (event) => {
    if (popover.hidden || event.target.closest('.site-header-document-meta,.file-sidebar')) return;
    setPopoverOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !popover.hidden) setPopoverOpen(false, true);
  });
  compact.addEventListener('change', () => applySidebarState(sidebarPreferenceOpen && !compact.matches));
  copyPath?.addEventListener('click', async () => {
    const path = copyPath.dataset.copyFilePath;
    try {
      let copied = false;
      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(path);
          copied = true;
        } catch {
          // Continue with the user-gesture-compatible fallback below.
        }
      }
      if (!copied) {
        const area = document.createElement('textarea');
        area.value = path;
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.append(area);
        area.focus();
        area.select();
        try {
          if (!document.execCommand('copy')) throw new Error('コピーに失敗しました');
        } finally {
          area.remove();
        }
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

  const filterTree = (tree, query) => {
    const empty = tree.querySelector('.file-tree-filter-empty');
    const root = tree.querySelector('.file-tree-root');
    const treeDirectories = [...root.querySelectorAll('.file-tree-directory')];
    const files = [...root.querySelectorAll('.file-tree-file')];
    let treeMatches = 0;
    for (const file of files) {
      const name = file.querySelector('a').dataset.fileName.toLocaleLowerCase();
      const visible = query === '' || name.includes(query);
      file.hidden = !visible;
      if (visible) treeMatches += 1;
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
    const recentFiles = [...tree.querySelectorAll('.file-tree-recent-file')];
    let recentMatches = 0;
    for (const file of recentFiles) {
      const visible = query === '' || file.dataset.filePath.toLocaleLowerCase().includes(query);
      file.hidden = !visible;
      if (visible) recentMatches += 1;
    }
    for (const heading of tree.querySelectorAll('.file-tree-date'))
      heading.hidden = !recentFiles.some(file => file.dataset.localDate === heading.dataset.date && !file.hidden);
    for (const heading of tree.querySelectorAll('.file-tree-directory-group'))
      heading.hidden = !recentFiles.some(file => file.dataset.recentGroup === heading.dataset.recentGroup && !file.hidden);
    const matches = activeView === 'tree' ? treeMatches : recentMatches;
    empty.hidden = query === '' || matches !== 0;
  };

  const applyFilter = (value) => {
    const query = value.trim().toLocaleLowerCase();
    for (const tree of trees) {
      tree.querySelector('.file-tree-filter-input').value = value;
      filterTree(tree, query);
    }
    applyRecentDateState(query !== '');
  };

  for (const tree of trees) {
    const input = tree.querySelector('.file-tree-filter-input');
    input.addEventListener('input', () => applyFilter(input.value));
    input.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || input.value === '') return;
      applyFilter('');
    });
  }
})();
</script>`;
}

export function renderBreadcrumbs(
  breadcrumbs?: FileBreadcrumb[],
): string {
  if (!breadcrumbs || breadcrumbs.length === 0)
    return `<nav class="file-breadcrumbs" aria-label="パンくずリスト">
  <button type="button" class="file-sidebar-open" data-file-sidebar-open aria-expanded="true" aria-controls="file-sidebar" aria-label="ファイルサイドバーを開く" title="ファイルサイドバーを開く" hidden><svg class="file-sidebar-toggle-icon" viewBox="0 0 16 16" aria-hidden="true"><rect x="1.75" y="2.25" width="12.5" height="11.5" rx="1.5" /><path d="M6 2.5v11M8 5.5L10.5 8 8 10.5" /></svg></button>
  <button type="button" class="file-tree-popover-toggle" data-file-tree-toggle aria-expanded="false" aria-controls="file-tree-popover" aria-haspopup="true" aria-label="ファイルを開く" title="ファイルを開く"><span>ファイル</span><svg class="panel-toggle-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" /></svg></button>
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
