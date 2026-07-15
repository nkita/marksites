import { lstat, realpath } from "node:fs/promises";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { join, resolve } from "node:path";
import { AnnotationRepository } from "./annotation-repository.js";
import { handleApi } from "./api.js";
import { MARKSITES_RESERVED_PATH } from "./constants.js";
import { sendJson } from "./response.js";
import { handleStaticFile } from "./static-files.js";
import type { MarksitesServerOptions, RunningServer } from "./types.js";

export type { MarksitesServerOptions, RunningServer } from "./types.js";

async function assertReservedPathIsAvailable(root: string): Promise<void> {
  try {
    await lstat(join(root, MARKSITES_RESERVED_PATH));
    throw new Error(`Reserved output path exists: ${MARKSITES_RESERVED_PATH}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

export async function startMarksitesServer(
  options: MarksitesServerOptions,
): Promise<RunningServer> {
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 3000;
  const root = resolve(options.outputRoot);
  const rootReal = await realpath(root);
  await assertReservedPathIsAvailable(root);
  const repository = new AnnotationRepository(
    root,
    options.documents,
    async (document) => options.onAnnotationsChange(document),
  );
  let ownOrigin = "";
  const server = createServer(async (request, response) => {
    try {
      const hostHeader = request.headers.host;
      if (
        !hostHeader ||
        ![`${host}:`, "127.0.0.1:", "localhost:"].some((prefix) =>
          hostHeader.startsWith(prefix),
        )
      ) {
        return sendJson(response, 403, "Invalid Host header");
      }
      const url = new URL(request.url ?? "/", ownOrigin);
      if (url.pathname.startsWith("/_marksites/")) {
        return await handleApi(
          request,
          response,
          url,
          ownOrigin,
          options,
          repository,
        );
      }
      await handleStaticFile(
        request,
        response,
        url,
        root,
        rootReal,
        options.entryPath,
      );
    } catch (error) {
      sendJson(
        response,
        (error as { statusCode?: number }).statusCode ?? 500,
        error instanceof Error ? error.message : String(error),
      );
    }
  });
  await new Promise<void>((done, fail) => {
    server.once("error", fail);
    server.listen(port, host, () => {
      server.off("error", fail);
      done();
    });
  });
  const address = server.address() as AddressInfo;
  ownOrigin = `http://${host}:${address.port}`;
  return {
    url: ownOrigin,
    close: () =>
      new Promise((done, fail) =>
        server.close((error) => (error ? fail(error) : done())),
      ),
  };
}
