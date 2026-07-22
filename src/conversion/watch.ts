import { watch, type FSWatcher } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { findWatchDirectories } from "./paths.js";

export interface ConversionWatcher {
  close(): void;
}

export interface ConversionWatchOptions {
  onLog?: (message: string) => void;
}

export async function watchConversionInput(
  input: string,
  output: string,
  rebuild: () => Promise<void>,
  options: ConversionWatchOptions = {},
): Promise<ConversionWatcher> {
  const watchers = new Map<string, FSWatcher>();
  let timer: NodeJS.Timeout | undefined;
  let building = false;
  let pending = false;
  const outputRelative = relative(input, output);
  const outputInsideInput =
    outputRelative !== "" &&
    !outputRelative.startsWith(`..${sep}`) &&
    outputRelative !== ".." &&
    !isAbsolute(outputRelative);

  const refresh = async () => {
    const directories = new Set(
      await findWatchDirectories(
        input,
        outputInsideInput ? resolve(output) : undefined,
      ),
    );
    for (const [directory, active] of watchers) {
      if (!directories.has(directory)) {
        active.close();
        watchers.delete(directory);
      }
    }
    for (const directory of directories) {
      if (watchers.has(directory)) continue;
      watchers.set(
        directory,
        watch(directory, (eventType, filename) => {
          const target = filename ? String(filename) : "(unknown)";
          options.onLog?.(
            `Watch event ${eventType}: ${relative(input, resolve(directory, target)) || "."}`,
          );
          schedule();
        }),
      );
    }
  };
  const run = async () => {
    if (building) {
      pending = true;
      return;
    }
    building = true;
    try {
      options.onLog?.("Watch rebuild started");
      await rebuild();
      await refresh();
    } catch (error) {
      console.error(
        `Watch rebuild failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      building = false;
      if (pending) {
        pending = false;
        schedule();
      }
    }
  };
  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(run, 100);
  };
  await refresh();
  return {
    close() {
      if (timer) clearTimeout(timer);
      for (const active of watchers.values()) active.close();
      watchers.clear();
    },
  };
}
