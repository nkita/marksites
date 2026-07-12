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
      return `      <li class="file-tree-file"><a href="${escapeHtml(node.href)}"${current}>${escapeHtml(node.name)}</a></li>`;
    })
    .join("\n");
}

export function renderFileTree(options?: FileTreeOptions): string {
  if (!options || options.items.length === 0) return "";

  return `<nav class="file-tree" aria-label="${escapeHtml(options.title ?? "Files")}">
  <h2>${escapeHtml(options.title ?? "Files")}</h2>
  <ul class="file-tree-root">
${renderNodes(options.items)}
  </ul>
</nav>
`;
}

export function renderBreadcrumbs(
  breadcrumbs?: FileBreadcrumb[],
): string {
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
