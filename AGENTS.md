# Development guidelines

## Project goals

`marksites` converts Markdown into a standalone GitHub-styled HTML document. Preserve the small public API, the zero-runtime-service design, and the ability to open generated files directly from the local filesystem.

## Architecture

- Keep `src/index.ts` as the public facade. Export only supported public functions and types from it.
- Keep orchestration in `src/markdown-to-html.ts`. It resolves options and composes features, but must not contain large CSS, HTML, or browser scripts.
- Keep feature-specific rendering and browser behavior in `src/features/`. A feature should own its markup and client script together.
- Keep the standalone document shell and embedded styles in `src/template/`.
- Keep only shared, side-effect-free helpers in `src/utils/`. Do not create generic utilities for logic used by a single feature.
- Keep public option types in `src/types.ts`. Feature-internal state and types stay private to their feature module.
- Preserve ESM imports with explicit `.js` extensions in TypeScript source files.

## Compatibility

- Treat `markdownToHtml()` and the types exported by `src/index.ts` as the public API.
- Do not change CLI arguments, defaults, generated markup, styling, or browser behavior as part of an unrelated refactor.
- Generated HTML must remain standalone. Embed required CSS and browser JavaScript; do not add CDN or network requirements.
- Generated HTML must continue to work when opened through `file://`. Clipboard functionality therefore needs a non-Clipboard-API fallback.
- Directory conversion must preserve relative folder structure, rewrite relative Markdown links to HTML, and generate page-relative file-tree links.
- Directory pages must show breadcrumbs above the content. Link breadcrumb segments to an `index.md` or `index.markdown` when that directory provides one.
- Continue escaping document metadata, code from unsupported languages, generated attributes, and table-of-contents text.
- Preserve GitHub-compatible heading IDs and deterministic suffixes for duplicate headings.

## Testing

- Run `npm test` and `git diff --check` before handing off a change.
- Organize tests by feature under `test/` and test only through the public `dist/index.js` entry point unless a unit genuinely requires a private boundary.
- Add coverage for enabled, disabled, empty, unsupported, and duplicate cases when changing an optional feature.
- For structural refactors, capture representative HTML before the change and compare it byte-for-byte after the change.
- Verify the CLI against a real Markdown file when changing document assembly, embedded assets, or file handling.
- Cover recursive traversal, nested output paths, and cross-document links when changing directory conversion.

## Dependencies and build

- Prefer the current TypeScript-only build. Keep CSS and browser scripts in TypeScript modules unless adding an asset pipeline has a clear, reviewed benefit.
- Avoid adding a bundler, framework, dependency-injection layer, or class hierarchy without a concrete requirement.
- Add runtime dependencies only when they provide standards compatibility or substantial maintained functionality that would be risky to reproduce locally.
- Keep internal modules private through the package `exports` map.

## Repository hygiene

- Do not commit generated HTML or `dist/` output.
- Keep `sample.md` and `sample/` as local manual-verification fixtures. Do not commit their source or generated HTML output unless the project policy is explicitly changed.
- Use Conventional Commits for subsequent commits, for example `feat: add ...`, `fix: handle ...`, or `refactor: split ...`.
