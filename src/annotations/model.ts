export interface AnnotationSelection {
  exact: string;
  prefix: string;
  suffix: string;
  headingId: string | null;
  startOffset: number;
  endOffset: number;
}

export interface Annotation {
  id: string;
  selection: AnnotationSelection;
  comment: { body: string; author: string | null };
  status: "open" | "resolved";
  createdAt: string;
  updatedAt: string;
}

export interface AnnotationDocument {
  schemaVersion: 1;
  document: string;
  revision: number;
  annotations: Annotation[];
}

export function emptyAnnotationDocument(document: string): AnnotationDocument {
  return { schemaVersion: 1, document, revision: 0, annotations: [] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateAnnotationDocument(
  value: unknown,
  expectedDocument?: string,
): AnnotationDocument {
  if (
    !isRecord(value) ||
    value.schemaVersion !== 1 ||
    typeof value.document !== "string" ||
    !Number.isSafeInteger(value.revision) ||
    Number(value.revision) < 0 ||
    !Array.isArray(value.annotations)
  ) {
    throw new Error("Invalid annotation document");
  }
  if (expectedDocument !== undefined && value.document !== expectedDocument) {
    throw new Error(`Annotation document path must be ${expectedDocument}`);
  }
  for (const item of value.annotations) validateAnnotation(item);
  return value as unknown as AnnotationDocument;
}

export function validateAnnotation(
  value: unknown,
): asserts value is Annotation {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    value.id.length === 0 ||
    !isRecord(value.selection) ||
    typeof value.selection.exact !== "string" ||
    typeof value.selection.prefix !== "string" ||
    typeof value.selection.suffix !== "string" ||
    !(
      typeof value.selection.headingId === "string" ||
      value.selection.headingId === null
    ) ||
    !Number.isSafeInteger(value.selection.startOffset) ||
    !Number.isSafeInteger(value.selection.endOffset) ||
    Number(value.selection.startOffset) < 0 ||
    Number(value.selection.endOffset) < Number(value.selection.startOffset) ||
    !isRecord(value.comment) ||
    typeof value.comment.body !== "string" ||
    !(
      typeof value.comment.author === "string" || value.comment.author === null
    ) ||
    (value.status !== "open" && value.status !== "resolved") ||
    typeof value.createdAt !== "string" ||
    typeof value.updatedAt !== "string"
  ) {
    throw new Error("Invalid annotation");
  }
  if (
    Number.isNaN(Date.parse(value.createdAt)) ||
    Number.isNaN(Date.parse(value.updatedAt))
  ) {
    throw new Error("Invalid annotation timestamp");
  }
}
