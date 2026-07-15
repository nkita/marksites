import { readFile } from "node:fs/promises";
import { join, posix, relative } from "node:path";
import createIgnore from "ignore";

interface GitignoreRules {
  basePath: string;
  matcher: ReturnType<typeof createIgnore>;
}

export async function loadGitignoreRules(
  root: string,
  directory: string,
  inherited: GitignoreRules[],
): Promise<GitignoreRules[]> {
  let source: string;
  try {
    source = await readFile(join(directory, ".gitignore"), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return inherited;
    throw error;
  }
  const basePath = relative(root, directory).split("\\").join(posix.sep);
  return [
    ...inherited,
    {
      basePath: basePath || ".",
      matcher: createIgnore().add(source),
    },
  ];
}

export function isGitignored(
  relativePath: string,
  directory: boolean,
  rules: GitignoreRules[],
): boolean {
  let ignored = false;
  for (const ruleSet of rules) {
    const scoped = scopePath(relativePath, ruleSet.basePath);
    if (!scoped) continue;
    const result = ruleSet.matcher.test(directory ? `${scoped}/` : scoped);
    if (result.ignored) ignored = true;
    if (result.unignored) ignored = false;
  }
  return ignored;
}

function scopePath(relativePath: string, basePath: string): string | undefined {
  if (basePath === ".") return relativePath;
  if (!relativePath.startsWith(`${basePath}/`)) return undefined;
  return relativePath.slice(basePath.length + 1);
}
