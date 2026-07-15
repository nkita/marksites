import { spawn, type ChildProcess } from "node:child_process";

type SpawnBrowser = (
  command: string,
  args: string[],
  options: { detached: true; stdio: "ignore" },
) => ChildProcess;

interface BrowserOpenEnvironment {
  platform?: NodeJS.Platform;
  environment?: NodeJS.ProcessEnv;
  spawnBrowser?: SpawnBrowser;
}

interface BrowserCommand {
  command: string;
  args: string[];
}

function browserCommands(
  url: string,
  platform: NodeJS.Platform,
  environment: NodeJS.ProcessEnv,
): BrowserCommand[] {
  if (platform === "win32") {
    return [{ command: "cmd.exe", args: ["/d", "/s", "/c", "start", "", url] }];
  }
  if (platform === "darwin") return [{ command: "open", args: [url] }];

  const isWsl = Boolean(environment.WSL_DISTRO_NAME || environment.WSL_INTEROP);
  return isWsl
    ? [
        { command: "cmd.exe", args: ["/d", "/s", "/c", "start", "", url] },
        { command: "xdg-open", args: [url] },
      ]
    : [{ command: "xdg-open", args: [url] }];
}

function tryCommand(
  command: BrowserCommand,
  spawnBrowser: SpawnBrowser,
): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawnBrowser(command.command, command.args, {
      detached: true,
      stdio: "ignore",
    });
    child.once("error", () => resolve(false));
    child.once("spawn", () => {
      child.unref();
      resolve(true);
    });
  });
}

export async function openBrowser(
  url: string,
  environment: BrowserOpenEnvironment = {},
): Promise<boolean> {
  const spawnBrowser = environment.spawnBrowser ?? spawn;
  const commands = browserCommands(
    url,
    environment.platform ?? process.platform,
    environment.environment ?? process.env,
  );
  for (const command of commands) {
    if (await tryCommand(command, spawnBrowser)) return true;
  }
  return false;
}
