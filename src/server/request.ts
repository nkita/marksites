import type { IncomingMessage } from "node:http";
import { httpError } from "./errors.js";

const MAX_REQUEST = 128 * 1024;

export async function readJsonBody(
  request: IncomingMessage,
): Promise<unknown> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_REQUEST)
      throw httpError("Request body is too large", 413);
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw httpError("Invalid JSON request", 400);
  }
}

export function validateDocumentPath(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value ||
    value.includes("\\") ||
    value.startsWith("/") ||
    value.split("/").includes("..")
  ) {
    throw httpError("Invalid document", 400);
  }
  return value;
}
