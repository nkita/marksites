import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { startMarksitesServer } from "../dist/server/server.js";
import { convertDirectoryDetailed } from "../dist/cli/directory.js";

test("serves static output and annotation CRUD", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "marksites-server-"));
  await mkdir(root, { recursive: true });
  await writeFile(
    join(root, "index.html"),
    "<!doctype html><title>Test</title>",
  );
  await writeFile(
    join(root, ".index.json"),
    JSON.stringify({
      schemaVersion: 1,
      document: "index.md",
      revision: 0,
      annotations: [],
    }),
  );
  let changed = 0;
  const server = await startMarksitesServer({
    outputRoot: root,
    port: 0,
    projectId: "test",
    projectName: "Test",
    documents: new Map([["index.md", ".index.json"]]),
    onAnnotationsChange: async () => {
      changed++;
    },
  });
  t.after(() => server.close());
  const page = await fetch(server.url);
  assert.equal(page.status, 200);
  assert.match(
    page.headers.get("content-security-policy"),
    /script-src 'nonce-/,
  );
  assert.doesNotMatch(
    page.headers.get("content-security-policy"),
    /script-src[^;]*unsafe-inline/,
  );
  const runtime = await fetch(server.url + "/_marksites/api/v1/runtime").then(
    (r) => r.json(),
  );
  assert.equal(runtime.data.service, "marksites");
  const headers = { "content-type": "application/json", origin: server.url };
  const createdResponse = await fetch(
    server.url + "/_marksites/api/v1/annotations",
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        document: "index.md",
        baseRevision: 0,
        selection: {
          exact: "Test",
          prefix: "",
          suffix: "",
          headingId: null,
          startOffset: 0,
          endOffset: 4,
        },
        comment: { body: "Explain" },
      }),
    },
  );
  assert.equal(createdResponse.status, 201);
  const created = (await createdResponse.json()).data;
  assert.equal(created.revision, 1);
  assert.equal(changed, 1);
  const id = created.annotations[0].id;
  const fetched = await fetch(
    server.url + "/_marksites/api/v1/annotations?document=index.md",
  ).then((response) => response.json());
  assert.equal(fetched.data.annotations[0].comment.body, "Explain");
  const stale = await fetch(
    server.url + "/_marksites/api/v1/annotations/" + id,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        document: "index.md",
        baseRevision: 0,
        comment: { body: "Stale" },
      }),
    },
  );
  assert.equal(stale.status, 409);
  const updated = await fetch(
    server.url + "/_marksites/api/v1/annotations/" + id,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        document: "index.md",
        baseRevision: 1,
        comment: { body: "Updated" },
      }),
    },
  );
  assert.equal(updated.status, 200);
  const archived = await fetch(
    server.url + "/_marksites/api/v1/annotations/" + id,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        document: "index.md",
        baseRevision: 2,
        status: "archived",
      }),
    },
  );
  assert.equal(archived.status, 200);
  assert.equal((await archived.json()).data.annotations[0].status, "archived");
  const oversized = await fetch(
    server.url + "/_marksites/api/v1/annotations/" + id,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        document: "index.md",
        baseRevision: 3,
        comment: { body: "x".repeat(10_001) },
      }),
    },
  );
  assert.equal(oversized.status, 413);
  const invalidJson = await fetch(
    server.url + "/_marksites/api/v1/annotations",
    { method: "POST", headers, body: "{" },
  );
  assert.equal(invalidJson.status, 400);
  const exported = await fetch(
    server.url + "/_marksites/api/v1/annotations/export",
  ).then((response) => response.json());
  const duplicate = await fetch(
    server.url + "/_marksites/api/v1/annotations/import",
    {
      method: "POST",
      headers,
      body: JSON.stringify({ export: exported.data, replace: false }),
    },
  );
  assert.equal(duplicate.status, 409);
  const deleted = await fetch(
    server.url + "/_marksites/api/v1/annotations/" + id,
    {
      method: "DELETE",
      headers,
      body: JSON.stringify({ document: "index.md", baseRevision: 3 }),
    },
  );
  assert.equal(deleted.status, 200);
  assert.equal((await deleted.json()).data.annotations.length, 0);
  const documentComment = await fetch(
    server.url + "/_marksites/api/v1/annotations",
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        document: "index.md",
        baseRevision: 4,
        selection: {
          exact: "",
          prefix: "",
          suffix: "",
          headingId: null,
          startOffset: 0,
          endOffset: 0,
        },
        comment: { body: "Document-level note" },
      }),
    },
  );
  assert.equal(documentComment.status, 201);
  assert.equal(
    (await documentComment.json()).data.annotations[0].selection.exact,
    "",
  );
  assert.equal((await fetch(server.url + "/../package.json")).status, 404);
  assert.equal(
    (
      await fetch(server.url + "/_marksites/api/v1/health", {
        headers: { Origin: "http://evil.example" },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await fetch(
        server.url + "/_marksites/api/v1/annotations?document=unknown.md",
      )
    ).status,
    404,
  );
});

test("authorizes the image viewer script and ignores favicon probes", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "marksites-viewer-csp-"));
  const input = join(root, "docs"), output = join(root, "site");
  await mkdir(input);
  await writeFile(join(input, "image.png"), "image");
  await writeFile(join(input, "index.md"), "![Preview](image.png)\n");
  await convertDirectoryDetailed(input, output);
  const server = await startMarksitesServer({
    outputRoot: output,
    entryPath: "index.html",
    port: 0,
    projectId: "viewer-test",
    projectName: "Viewer",
    documents: new Map([["index.md", ".index.json"]]),
    onAnnotationsChange: async () => {},
  });
  t.after(() => server.close());

  const response = await fetch(server.url);
  const html = await response.text();
  const nonce = /script-src 'nonce-([^']+)'/.exec(
    response.headers.get("content-security-policy") ?? "",
  )?.[1];
  assert.ok(nonce);
  const scripts = [...html.matchAll(/<script data-marksites-script="true"([^>]*)>/g)];
  assert.ok(scripts.length > 0);
  assert.ok(scripts.every((match) => match[1].includes(`nonce="${nonce}"`)));
  assert.match(html, /data-image-viewer/);
  assert.equal((await fetch(server.url + "/favicon.ico")).status, 204);
});

test("reports a port conflict", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "marksites-server-port-"));
  const options = {
    outputRoot: root,
    port: 0,
    projectId: "port-test",
    projectName: "Test",
    documents: new Map(),
    onAnnotationsChange: async () => {},
  };
  const first = await startMarksitesServer(options);
  t.after(() => first.close());
  const port = Number(new URL(first.url).port);
  await assert.rejects(
    startMarksitesServer({ ...options, port }),
    /EADDRINUSE/,
  );
});

test("falls back to a later port when the preferred port is occupied", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "marksites-server-fallback-"));
  const options = {
    outputRoot: root,
    port: 0,
    projectId: "fallback-test",
    projectName: "Test",
    documents: new Map(),
    onAnnotationsChange: async () => {},
  };
  const first = await startMarksitesServer(options);
  t.after(() => first.close());
  const occupiedPort = Number(new URL(first.url).port);
  const second = await startMarksitesServer({
    ...options,
    port: occupiedPort,
    fallbackPort: true,
  });
  t.after(() => second.close());

  assert.ok(Number(new URL(second.url).port) > occupiedPort);
});

test("serves the configured entry page when index.html is absent", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "marksites-entry-"));
  await writeFile(
    join(root, "guide.html"),
    "<!doctype html><title>Guide</title>",
  );
  const server = await startMarksitesServer({
    outputRoot: root,
    entryPath: "guide.html",
    port: 0,
    projectId: "entry",
    projectName: "Entry",
    documents: new Map(),
    onAnnotationsChange: async () => {},
  });
  t.after(() => server.close());
  const response = await fetch(server.url);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /<title>Guide<\/title>/);
});

test("serializes concurrent annotation updates", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "marksites-concurrent-"));
  await writeFile(
    join(root, ".index.json"),
    JSON.stringify({
      schemaVersion: 1,
      document: "index.md",
      revision: 0,
      annotations: [],
    }),
  );
  const server = await startMarksitesServer({
    outputRoot: root,
    port: 0,
    projectId: "concurrent",
    projectName: "Test",
    documents: new Map([["index.md", ".index.json"]]),
    onAnnotationsChange: async () => {},
  });
  t.after(() => server.close());
  const request = (body) =>
    fetch(server.url + "/_marksites/api/v1/annotations", {
      method: "POST",
      headers: { "content-type": "application/json", origin: server.url },
      body: JSON.stringify(body),
    });
  const base = {
    document: "index.md",
    baseRevision: 0,
    selection: {
      exact: "x",
      prefix: "",
      suffix: "",
      headingId: null,
      startOffset: 0,
      endOffset: 1,
    },
    comment: { body: "comment" },
  };
  const responses = await Promise.all([request(base), request(base)]);
  assert.deepEqual(
    responses.map((response) => response.status).sort(),
    [201, 409],
  );
});

test("rejects output-root symlinks and reserved paths", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "marksites-security-"));
  const outside = join(
    await mkdtemp(join(tmpdir(), "marksites-outside-")),
    "secret.txt",
  );
  await writeFile(outside, "secret");
  await symlink(outside, join(root, "secret.txt"));
  const server = await startMarksitesServer({
    outputRoot: root,
    port: 0,
    projectId: "security",
    projectName: "Test",
    documents: new Map(),
    onAnnotationsChange: async () => {},
  });
  t.after(() => server.close());
  assert.equal((await fetch(server.url + "/secret.txt")).status, 404);
  const reserved = await mkdtemp(join(tmpdir(), "marksites-reserved-"));
  await mkdir(join(reserved, "_marksites"));
  await assert.rejects(
    startMarksitesServer({
      outputRoot: reserved,
      port: 0,
      projectId: "reserved",
      projectName: "Test",
      documents: new Map(),
      onAnnotationsChange: async () => {},
    }),
    /Reserved output path/,
  );
});

test("persists a saved comment into standalone HTML", async () => {
  const root = await mkdtemp(join(tmpdir(), "marksites-persist-"));
  const input = join(root, "docs"),
    output = join(root, "site");
  await mkdir(input);
  await writeFile(join(input, "index.md"), "# Home\n\nSelected text\n");
  await convertDirectoryDetailed(input, output);
  const server = await startMarksitesServer({
    outputRoot: output,
    port: 0,
    projectId: "persist",
    projectName: "Test",
    documents: new Map([["index.md", ".index.json"]]),
    onAnnotationsChange: async () => {
      await convertDirectoryDetailed(input, output);
    },
  });
  const response = await fetch(server.url + "/_marksites/api/v1/annotations", {
    method: "POST",
    headers: { "content-type": "application/json", origin: server.url },
    body: JSON.stringify({
      document: "index.md",
      baseRevision: 0,
      selection: {
        exact: "Selected text",
        prefix: "",
        suffix: "",
        headingId: null,
        startOffset: 0,
        endOffset: 13,
      },
      comment: { body: "Persisted comment" },
    }),
  });
  assert.equal(response.status, 201);
  await server.close();
  const html = await readFile(join(output, "index.html"), "utf8");
  assert.match(html, /Persisted comment/);
});
