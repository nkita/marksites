import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { convertFile } from "../dist/cli/directory.js";

test("embeds annotations without allowing script element escape", async () => {
  const root = await mkdtemp(join(tmpdir(), "marksites-annotations-"));
  const input = join(root, "note.md"),
    output = join(root, "note.html");
  await writeFile(input, "# Note\n\nSelected text\n");
  await writeFile(
    join(root, "note.annotations.json"),
    JSON.stringify({
      schemaVersion: 1,
      document: "note.md",
      revision: 1,
      annotations: [
        {
          id: "one",
          selection: {
            exact: "Selected text",
            prefix: "",
            suffix: "",
            headingId: null,
            startOffset: 0,
            endOffset: 13,
          },
          comment: { body: "</script><script>alert(1)</script>", author: null },
          status: "open",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    }),
  );
  await convertFile(input, output);
  assert.equal(
    JSON.parse(await readFile(join(root, ".note.json"), "utf8")).revision,
    1,
  );
  await assert.rejects(
    readFile(join(root, "note.annotations.json"), "utf8"),
    /ENOENT/,
  );
  const html = await readFile(output, "utf8");
  assert.match(html, /\\u003c\/script\\u003e/);
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
  assert.match(html, /Add comment<\/button>/);
  assert.match(
    html,
    /data-selection-action="copy"><svg class="action-icon copy-icon"[^>]*>[\s\S]*?<span data-copy-label>Copy<\/span>/,
  );
  assert.match(
    html,
    /data-selection-action="comment"[^>]*><svg class="action-icon add-icon"[^>]*>[\s\S]*?<span>Comment<\/span><\/button>/,
  );
  assert.match(
    html,
    /data-selection-action="ai"><svg class="action-icon copy-icon"[^>]*>[\s\S]*?<span data-copy-label>Copy for AI<\/span>/,
  );
  assert.match(
    html,
    /data-sidebar-tab="comments">Comments <span class="sidebar-count" id="annotation-count">1<\/span>/,
  );
  assert.match(html, /id="sidebar-panel-comments" role="tabpanel"/);
  assert.doesNotMatch(html, /class="table-of-contents sidebar-panel"/);
  assert.match(html, /aria-selected="true"[^>]*data-sidebar-tab="comments"/);
  assert.match(html, /marksites:show-comments/);
  assert.match(html, /data-add-document-comment disabled/);
  assert.match(
    html,
    /data-copy-all-comments><svg class="action-icon copy-icon"[^>]*>[\s\S]*?<span data-copy-comments-label>Copy<\/span>/,
  );
  assert.match(html, /pendingSelection=\{exact:'',prefix:'',suffix:''/);
  assert.match(html, /function updateCurrentFileCount\(\)/);
  assert.match(html, /className='annotation-updated'/);
  assert.match(html, /Updated '\+formatTimestamp\(a\.updatedAt\)/);
  assert.match(html, /function sortedAnnotations\(\)/);
  assert.match(html, /function annotationMetadata\(a,title='Comment'\)/);
  assert.match(html, /'Document: '\+state\.document/);
  assert.match(html, /'Heading: '\+headingText/);
  assert.match(html, /'Comment:',a\.comment\.body/);
  assert.doesNotMatch(html, /'Heading ID: '/);
  assert.doesNotMatch(html, /'Location: '/);
  assert.doesNotMatch(html, /'Status: '/);
  assert.doesNotMatch(html, /'Created: '\+a\.createdAt/);
  assert.doesNotMatch(html, /'Updated: '\+a\.updatedAt/);
  assert.match(html, /function headingFor\(node\)\{if\(!node\)return null/);
  assert.match(html, /heading\.compareDocumentPosition\(node\)&Node\.DOCUMENT_POSITION_FOLLOWING/);
  assert.match(html, /function allCommentsMetadata\(\)/);
  assert.match(html, /const created=method==='POST'/);
  assert.match(html, /focused\.card\?\.focus\(\{preventScroll:true\}\)/);
  assert.match(html, /-webkit-line-clamp:2/);
  assert.match(html, /\.annotation-card\{position:relative/);
  assert.match(
    html,
    /\.annotation-card-actions\{position:absolute;top:6px;right:6px/,
  );
  assert.match(html, /\.annotation-card:hover>\.annotation-card-actions/);
  assert.match(html, /\.annotation-card-actions:focus-within/);
  assert.doesNotMatch(
    html,
    /\.annotation-card\.is-focused>\.annotation-card-actions/,
  );
  assert.match(html, /actions\.className='annotation-card-actions'/);
  assert.match(html, /availableActions=\[\['Copy','copy'/);
  assert.match(html, /class=\\?"action-icon copy-icon/);
  assert.match(html, /class=\\?"action-icon edit-icon/);
  assert.match(html, /class=\\?"action-icon delete-icon/);
  assert.match(html, /b\.setAttribute\('aria-label',label\+' comment'\)/);
  assert.match(html, /formHome=document\.createComment\('annotation-form-home'\)/);
  assert.match(html, /function openForm\(card=null\)/);
  assert.match(html, /card\.classList\.add\('is-editing'\);card\.append\(form\)/);
  assert.match(html, /else list\.before\(form\)/);
  assert.match(html, /\.annotation-card\.is-editing #annotation-form\{margin:0\}/);
  assert.match(html, /class="annotation-form-actions"/);
  assert.match(html, /\.annotation-card\.is-editing:focus-visible\{[^}]*outline:0/);
  assert.match(html, /\.annotation-form-actions\{[^}]*justify-content:flex-end/);
  assert.match(html, /button\[type="submit"\]\{color:#fff/);
  assert.doesNotMatch(html, /@media\((?:any-)?hover:none\)/);
  assert.match(html, /e\.pointerType!==\x27touch\x27/);
  assert.match(html, /\.annotation-card\.is-focused\{/);
  assert.match(html, /\.annotation-highlight\.is-focused\{/);
  assert.match(html, /\.annotation-card\{[^}]*border-radius:8px/);
  assert.match(html, /\.annotations-panel button\{[^}]*border-radius:6px/);
  assert.match(html, /\.annotation-card\{[^}]*font-size:\.8125rem/);
  assert.match(html, /\.annotation-quote\{[^}]*font-size:\.75rem/);
  assert.match(html, /\.annotation-updated\{[^}]*font-size:\.6875rem/);
  const executableScripts = [
    ...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g),
  ]
    .filter((match) => !/type="application\/json"/.test(match[0]))
    .map((match) => match[1]);
  for (const script of executableScripts) {
    assert.doesNotThrow(() => new Function(script));
  }
});

test("migrates the previous marksites metadata filename", async () => {
  const root = await mkdtemp(join(tmpdir(), "marksites-metadata-"));
  const input = join(root, "guide.md");
  await writeFile(input, "# Guide\n");
  await writeFile(
    join(root, ".guide.marksites.json"),
    JSON.stringify({
      schemaVersion: 1,
      document: "guide.md",
      revision: 2,
      annotations: [],
    }),
  );
  await convertFile(input, join(root, "guide.html"));
  const migrated = JSON.parse(
    await readFile(join(root, ".guide.json"), "utf8"),
  );
  assert.equal(migrated.revision, 2);
  await assert.rejects(
    readFile(join(root, ".guide.marksites.json"), "utf8"),
    /ENOENT/,
  );
});
