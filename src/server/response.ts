import type { ServerResponse } from "node:http";

export function sendJson(
  response: ServerResponse,
  status: number,
  data: unknown,
): void {
  response.writeHead(status, {
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
  });
  response.end(
    JSON.stringify(
      status >= 400 ? { error: { code: status, message: data } } : { data },
    ),
  );
}
