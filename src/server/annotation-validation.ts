import type { Annotation, AnnotationDocument } from "../annotations/model.js";
import { httpError } from "./errors.js";

export const MAX_ANNOTATIONS = 5_000;

export function checkAnnotationRevision(
  data: AnnotationDocument,
  baseRevision: unknown,
): void {
  if (baseRevision !== data.revision)
    throw httpError("Annotation revision conflict", 409);
}

export function validateAnnotationLimits(annotation: Annotation): void {
  if (
    annotation.comment.body.length > 10_000 ||
    annotation.selection.exact.length > 20_000 ||
    annotation.selection.prefix.length > 500 ||
    annotation.selection.suffix.length > 500
  ) {
    throw httpError("Annotation is too large", 413);
  }
}
