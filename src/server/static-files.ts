import { createReadStream } from "node:fs";
import { lstat, readFile, realpath } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { secureHtml } from "./html-security.js";
import { sendJson } from "./response.js";

const MIME: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

export async function handleStaticFile(
  request: IncomingMessage,
  response: ServerResponse,
  url: URL,
  root: string,
  rootReal: string,
  entryPath?: string,
): Promise<void> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.setHeader("allow", "GET, HEAD");
    return sendJson(response, 405, "Method not allowed");
  }
  let decoded: string;
  try {
    decoded = decodeURIComponent(url.pathname);
  } catch {
    return sendJson(response, 400, "Invalid URL encoding");
  }
  if (
    decoded.includes("\\") ||
    decoded.includes("\0") ||
    decoded.split("/").includes("..")
  ) {
    return sendJson(response, 403, "Invalid path");
  }
  const requestedPath =
    decoded === "/" && entryPath ? `/${entryPath}` : decoded;
  let path = resolve(root, `.${normalize(requestedPath)}`);
  if (!path.startsWith(root + sep) && path !== root)
    return sendJson(response, 403, "Invalid path");
  let info;
  try {
    info = await lstat(path);
    if (info.isDirectory()) {
      path = join(path, "index.html");
      info = await lstat(path);
    }
  } catch {
    return sendJson(response, 404, "Not found");
  }
  if (!info.isFile()) return sendJson(response, 404, "Not found");
  const actual = await realpath(path);
  if (!actual.startsWith(rootReal + sep) && actual !== rootReal)
    return sendJson(response, 403, "Invalid symlink target");
  const headers: Record<string, string> = {
    "content-type":
      MIME[extname(path).toLowerCase()] ?? "application/octet-stream",
    "x-content-type-options": "nosniff",
  };
  if (extname(path).toLowerCase() === ".html") {
    const secured = secureHtml(await readFile(path, "utf8"));
    headers["content-security-policy"] = secured.csp;
    response.writeHead(200, headers);
    response.end(request.method === "HEAD" ? undefined : secured.body);
    return;
  }
  response.writeHead(200, headers);
  if (request.method === "HEAD") {
    response.end();
    return;
  }
  createReadStream(path).pipe(response);
}
