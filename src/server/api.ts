import type { IncomingMessage, ServerResponse } from "node:http";
import { AnnotationRepository } from "./annotation-repository.js";
import { MARKSITES_API_BASE_PATH } from "./constants.js";
import { sendJson } from "./response.js";
import type { MarksitesServerOptions } from "./types.js";

const MAX_REQUEST = 128 * 1024;

async function readBody(request: IncomingMessage): Promise<unknown> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_REQUEST)
      throw Object.assign(new Error("Request body is too large"), {
        statusCode: 413,
      });
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw Object.assign(new Error("Invalid JSON request"), { statusCode: 400 });
  }
}

function safeDocument(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value ||
    value.includes("\\") ||
    value.startsWith("/") ||
    value.split("/").includes("..")
  ) {
    throw Object.assign(new Error("Invalid document"), { statusCode: 400 });
  }
  return value;
}

export async function handleApi(
  request: IncomingMessage,
  response: ServerResponse,
  url: URL,
  origin: string,
  options: MarksitesServerOptions,
  repository: AnnotationRepository,
): Promise<void> {
  if (!url.pathname.startsWith(MARKSITES_API_BASE_PATH))
    return sendJson(response, 404, "Unknown internal API");
  if (request.headers.origin && request.headers.origin !== origin)
    return sendJson(response, 403, "Invalid Origin");
  const route = url.pathname.slice(MARKSITES_API_BASE_PATH.length) || "/";
  if (request.method === "GET" && route === "/health")
    return sendJson(response, 200, { status: "ok" });
  if (request.method === "GET" && route === "/runtime")
    return sendJson(response, 200, {
      service: "marksites",
      apiVersion: 1,
      projectId: options.projectId,
      editable: options.editable ?? true,
      capabilities:
        options.editable === false
          ? []
          : ["annotations:read", "annotations:write"],
    });
  if (request.method === "GET" && route === "/project")
    return sendJson(response, 200, {
      id: options.projectId,
      name: options.projectName,
    });
  if (request.method === "GET" && route === "/annotations")
    return sendJson(
      response,
      200,
      await repository.get(safeDocument(url.searchParams.get("document"))),
    );
  if (request.method === "GET" && route === "/annotations/export")
    return sendJson(response, 200, await repository.exportProject());
  if (request.headers["content-type"]?.split(";")[0] !== "application/json")
    throw Object.assign(new Error("Content-Type must be application/json"), {
      statusCode: 400,
    });
  const input = (await readBody(request)) as Record<string, unknown>;
  if (request.method === "POST" && route === "/annotations")
    return sendJson(
      response,
      201,
      await repository.create(safeDocument(input.document), input as never),
    );
  if (request.method === "POST" && route === "/annotations/import") {
    if (input.replace === true && input.confirmReplace !== true)
      throw Object.assign(
        new Error("Replacing annotations requires confirmReplace"),
        { statusCode: 400 },
      );
    return sendJson(
      response,
      200,
      await repository.importProject(input.export, input.replace === true),
    );
  }
  const match = /^\/annotations\/([^/]+)$/.exec(route);
  if (match && request.method === "PATCH")
    return sendJson(
      response,
      200,
      await repository.update(
        safeDocument(input.document),
        decodeURIComponent(match[1]!),
        input as never,
      ),
    );
  if (match && request.method === "DELETE")
    return sendJson(
      response,
      200,
      await repository.delete(
        safeDocument(input.document),
        decodeURIComponent(match[1]!),
        input.baseRevision,
      ),
    );
  return sendJson(response, 404, "Unknown API route");
}
