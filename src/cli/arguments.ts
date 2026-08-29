export interface ConvertArguments {
  positional: string[];
  watch: boolean;
  verbose: boolean;
}

export interface ServeArguments extends ConvertArguments {
  host: string;
  port?: number;
  open: boolean;
}

function unknownOption(argument: string): never {
  throw new Error(`Unknown option: ${argument}`);
}

export function parseConvertArguments(args: string[]): ConvertArguments | null {
  const watch = args.includes("--watch");
  const verbose = args.includes("--verbose");
  const positional = args.filter(
    (argument) => argument !== "--watch" && argument !== "--verbose",
  );
  const unknown = positional.find((argument) => argument.startsWith("--"));
  if (unknown) unknownOption(unknown);
  if (positional.length > 2) return null;
  return { positional, watch, verbose };
}

export function parseServeArguments(args: string[]): ServeArguments | null {
  const positional: string[] = [];
  let host = "127.0.0.1";
  let port: number | undefined;
  let open = false;
  let watch = false;
  let verbose = false;
  for (let index = 0; index < args.length; index++) {
    const argument = args[index]!;
    if (argument === "--open") {
      open = true;
      continue;
    }
    if (argument === "--watch") {
      watch = true;
      continue;
    }
    if (argument === "--verbose") {
      verbose = true;
      continue;
    }
    if (argument === "--host" || argument === "--port") {
      const value = args[++index];
      if (!value) return null;
      if (argument === "--host") host = value;
      else {
        port = Number(value);
        if (!Number.isInteger(port) || port < 0 || port > 65535)
          throw new Error(`Invalid port: ${value}`);
      }
      continue;
    }
    if (argument.startsWith("--")) unknownOption(argument);
    positional.push(argument);
  }
  if (positional.length > 2) return null;
  return { positional, host, port, open, watch, verbose };
}
