import { createTableResizerFeature } from "../table-resizer/index.js";
import { createTableSorterFeature } from "../table-sorter/index.js";
import { createTableStickyHeaderFeature } from "../table-sticky-header/index.js";

export interface TablesFeature {
  styles: string;
  scripts: string[];
}

export function createTablesFeature(enabled: boolean): TablesFeature {
  const sorter = createTableSorterFeature(enabled);
  const resizer = createTableResizerFeature(enabled);
  const stickyHeader = createTableStickyHeaderFeature(enabled);
  return {
    styles: `${resizer.styles}${sorter.styles}${stickyHeader.styles}`,
    scripts: [sorter.script, resizer.script, stickyHeader.script].filter(
      (script) => script !== "",
    ),
  };
}
