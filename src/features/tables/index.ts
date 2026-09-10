import { createTableCopyFeature } from "./copy.js";
import { createTableResizerFeature } from "../table-resizer/index.js";
import { createTableSorterFeature } from "../table-sorter/index.js";
import { createTableStickyHeaderFeature } from "../table-sticky-header/index.js";

export interface TablesFeature {
  styles: string;
  scripts: string[];
}

export function createTablesFeature(enabled: boolean): TablesFeature {
  const copy = createTableCopyFeature(enabled);
  const sorter = createTableSorterFeature(enabled);
  const resizer = createTableResizerFeature(enabled);
  const stickyHeader = createTableStickyHeaderFeature(enabled);
  return {
    styles: `${resizer.styles}${sorter.styles}${stickyHeader.styles}${copy.styles}`,
    scripts: [
      sorter.script,
      resizer.script,
      stickyHeader.script,
      copy.script,
    ].filter((script) => script !== ""),
  };
}
