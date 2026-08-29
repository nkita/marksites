import type { IncomingMessage, ServerResponse } from "node:http";
import { AnnotationRepository } from "./annotation-repository.js";
import { MARKSITES_API_BASE_PATH } from "./constants.js";
import { sendJson } from "./response.js";
import type { MarksitesServerOptions } from "./types.js";
import { readJsonBody, validateDocumentPath } from "./request.js";
import { httpError } from "./errors.js";

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
      await repository.get(validateDocumentPath(url.searchParams.get("document"))),
    );
  if (request.method === "GET" && route === "/annotations/export")
    return sendJson(response, 200, await repository.exportProject());
  if (request.headers["content-type"]?.split(";")[0] !== "application/json")
    throw httpError("Content-Type must be application/json", 400);
  const input = (await readJsonBody(request)) as Record<string, unknown>;
  if (request.method === "POST" && route === "/annotations")
    return sendJson(
      response,
      201,
      await repository.create(validateDocumentPath(input.document), input as never),
    );
  if (request.method === "POST" && route === "/annotations/import") {
    if (input.replace === true && input.confirmReplace !== true)
      throw httpError("Replacing annotations requires confirmReplace", 400);
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
        validateDocumentPath(input.document),
        decodeURIComponent(match[1]!),
        input as never,
      ),
    );
  if (match && request.method === "DELETE")
    return sendJson(
      response,
      200,
      await repository.delete(
        validateDocumentPath(input.document),
        decodeURIComponent(match[1]!),
        input.baseRevision,
      ),
    );
  return sendJson(response, 404, "Unknown API route");
}
