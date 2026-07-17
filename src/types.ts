import type { MarkedOptions } from "marked";

export interface RenderOptions {
  /** Text used for the HTML document title. */
  title?: string;
  /** Language assigned to the root HTML element. */
  language?: string;
  /** Enable syntax highlighting for fenced code blocks. Defaults to true. */
  highlight?: boolean;
  /** Add a table of contents generated from headings. Defaults to true. */
  tableOfContents?: boolean | TableOfContentsOptions;
  /** Add a repository-style file tree for a converted Markdown collection. */
  fileTree?: FileTreeOptions;
  /** ISO 8601 timestamp shown as the Markdown source's last update time. */
  modifiedAt?: string;
  /** Options forwarded to marked. Async parsing is not supported. */
  markedOptions?: Omit<MarkedOptions, "async" | "renderer">;
}

export interface FileTreeOptions {
  /** Heading shown above the file tree. Defaults to "Files". */
  title?: string;
  /** Nested directories and Markdown files to render. */
  items: FileTreeNode[];
  /** Path segments shown above the document content. */
  breadcrumbs?: FileBreadcrumb[];
}

export interface FileBreadcrumb {
  name: string;
  href?: string;
  current?: boolean;
}

export type FileTreeNode = FileTreeDirectory | FileTreeFile;

export interface FileTreeDirectory {
  type: "directory";
  name: string;
  children: FileTreeNode[];
}

export interface FileTreeFile {
  type: "file";
  name: string;
  href: string;
  current?: boolean;
  /** Number of comments associated with the file. Omitted when unavailable. */
  commentCount?: number;
}

export interface TableOfContentsOptions {
  /** Heading shown above the generated links. */
  title?: string;
  /** Shallowest heading level to include. Defaults to 2. */
  minDepth?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Deepest heading level to include. Defaults to 6. */
  maxDepth?: 1 | 2 | 3 | 4 | 5 | 6;
}
