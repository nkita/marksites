import { readFile } from "node:fs/promises";
import { atomicWriteFile } from "../utils/files.js";
import {
  emptyAnnotationDocument,
  validateAnnotationDocument,
  type AnnotationDocument,
} from "./model.js";

export function serializeAnnotations(value: AnnotationDocument): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export async function readAnnotations(
  path: string,
  document?: string,
): Promise<AnnotationDocument> {
  let source: string;
  try {
    source = await readFile(path, "utf8");
  } catch (error) {
    if (
      (error as NodeJS.ErrnoException).code === "ENOENT" &&
      document !== undefined
    ) {
      const value = emptyAnnotationDocument(document);
      await atomicWriteFile(path, serializeAnnotations(value));
      return value;
    }
    throw error;
  }
  try {
    return validateAnnotationDocument(JSON.parse(source), document);
  } catch (error) {
    throw new Error(
      `Invalid annotation JSON at ${path}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function writeAnnotations(
  path: string,
  value: AnnotationDocument,
): Promise<void> {
  validateAnnotationDocument(value);
  await atomicWriteFile(path, serializeAnnotations(value));
}
