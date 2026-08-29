import type { ConversionResult } from "../conversion/types.js";

export function reportConversion(result: ConversionResult): void {
  console.log(
    `Converted ${result.converted}; skipped ${result.skipped}; deleted ${result.deleted}; annotation files created ${result.annotationsCreated}; moved ${result.annotationsMoved}`,
  );
  for (const path of result.orphanedAnnotations)
    console.warn(`Orphaned annotation JSON preserved: ${path}`);
}
