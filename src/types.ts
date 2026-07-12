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
  /** Options forwarded to marked. Async parsing is not supported. */
  markedOptions?: Omit<MarkedOptions, "async" | "renderer">;
}

export interface TableOfContentsOptions {
  /** Heading shown above the generated links. */
  title?: string;
  /** Shallowest heading level to include. Defaults to 2. */
  minDepth?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Deepest heading level to include. Defaults to 6. */
  maxDepth?: 1 | 2 | 3 | 4 | 5 | 6;
}
