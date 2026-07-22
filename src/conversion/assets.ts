import { readFile } from "node:fs/promises";
import { dirname, extname, join, posix, resolve } from "node:path";
import { marked, type Token } from "marked";
import { atomicWriteFile } from "../utils/files.js";
import { contentHash } from "./rendering.js";
import { pathExists } from "./paths.js";

export const ASSET_DIRECTORY = "_marksites-assets";

export interface PreparedAssets {
  hash: string;
  outputs: string[];
  rewrite(token: Token): void;
}

function localPath(href: string, sourcePath: string): string | undefined {
  const raw = href.split(/[?#]/, 1)[0]!;
  if (
    !raw ||
    raw.startsWith("/") ||
    raw.startsWith("//") ||
    /^[a-z][a-z\d+.-]*:/i.test(raw)
  )
    return undefined;
  try {
    return resolve(dirname(sourcePath), decodeURIComponent(raw));
  } catch {
    return undefined;
  }
}

export async function prepareImageAssets(
  markdown: string,
  sourcePath: string,
  outputPath: string,
  outputRoot: string,
): Promise<PreparedAssets> {
  const hrefs = new Set<string>();
  marked.walkTokens(marked.lexer(markdown), (token) => {
    if (token.type === "image") hrefs.add(token.href);
  });
  const rewrites = new Map<string, string>();
  const fingerprints: string[] = [];
  const outputs = new Set<string>();
  for (const href of [...hrefs].sort()) {
    const source = localPath(href, sourcePath);
    if (!source || !(await pathExists(source))) continue;
    let data: Buffer;
    try {
      data = await readFile(source);
    } catch {
      continue;
    }
    const digest = contentHash(data).slice("sha256:".length);
    const extension = extname(source).toLowerCase().replace(/[^.a-z0-9]/g, "");
    const assetPath = posix.join(ASSET_DIRECTORY, `${digest}${extension}`);
    const suffix = href.slice(href.split(/[?#]/, 1)[0]!.length);
    const relativeHref = posix.relative(posix.dirname(outputPath), assetPath);
    rewrites.set(href, `${relativeHref || posix.basename(assetPath)}${suffix}`);
    fingerprints.push(`${href}\0${digest}`);
    outputs.add(assetPath);
    const destination = join(outputRoot, ...assetPath.split("/"));
    if (!(await pathExists(destination))) await atomicWriteFile(destination, data);
  }
  return {
    hash: contentHash(fingerprints.join("\n")),
    outputs: [...outputs].sort(),
    rewrite(token) {
      if (token.type === "image")
        token.href = rewrites.get(token.href) ?? token.href;
    },
  };
}
