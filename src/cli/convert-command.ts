import { stat } from "node:fs/promises";
import { resolve } from "node:path";
import { convertDirectoryDetailed } from "../conversion/directory.js";
import { convertFile } from "../conversion/single-file.js";
import { watchConversionInput } from "../conversion/watch.js";
import type { ConvertArguments } from "./arguments.js";
import { reportConversion } from "./reporting.js";

export async function runConvertCommand(parsed: ConvertArguments): Promise<void> {
  const { positional, watch: shouldWatch, verbose, historyLimit } = parsed;
  const inputArgument = positional[0] ?? ".";
  const input = resolve(inputArgument);
  const inputStat = await stat(input);
  const outputArgument = positional[1];
  const conversionOptions = {
    onLog: verbose ? (message: string) => console.log(message) : undefined,
    historyLimit,
  };
  if (inputStat.isDirectory()) {
    const initial = await convertDirectoryDetailed(input, outputArgument, conversionOptions);
    reportConversion(initial);
    if (shouldWatch) {
      const watcher = await watchConversionInput(
        input,
        initial.outputRoot,
        async () => reportConversion(
          await convertDirectoryDetailed(input, initial.outputRoot, conversionOptions),
        ),
        conversionOptions,
      );
      console.log(`Watching ${input}`);
      await new Promise<void>((done) => {
        const close = () => {
          watcher.close();
          done();
        };
        process.once("SIGINT", close);
        process.once("SIGTERM", close);
      });
    }
    return;
  }
  if (!inputStat.isFile())
    throw new Error(`Input is not a file or directory: ${inputArgument}`);
  if (shouldWatch) throw new Error("--watch input must be a directory");
  if (verbose) console.log(`Converting ${input}`);
  console.log(
    `Created ${await convertFile(input, outputArgument, { historyLimit })}`,
  );
}
