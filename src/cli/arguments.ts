export interface ConvertArguments {
  positional: string[];
  watch: boolean;
  verbose: boolean;
  historyLimit: number;
  documentDiff: boolean;
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
  const positional: string[] = [];
  let watch = false;
  let verbose = false;
  let historyLimit = 10;
  let documentDiff = true;
  for (let index = 0; index < args.length; index++) {
    const argument = args[index]!;
    if (argument === "--watch") watch = true;
    else if (argument === "--verbose") verbose = true;
    else if (argument === "--no-diff") documentDiff = false;
    else if (argument === "--history-limit") {
      const value = args[++index];
      if (!value) return null;
      historyLimit = Number(value);
      if (!Number.isInteger(historyLimit) || historyLimit < 1)
        throw new Error(`Invalid history limit: ${value}`);
    } else if (argument.startsWith("--")) unknownOption(argument);
    else positional.push(argument);
  }
  if (positional.length > 2) return null;
  return { positional, watch, verbose, historyLimit, documentDiff };
}

export function parseServeArguments(args: string[]): ServeArguments | null {
  const positional: string[] = [];
  let host = "127.0.0.1";
  let port: number | undefined;
  let open = false;
  let watch = false;
  let verbose = false;
  let historyLimit = 10;
  let documentDiff = true;
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
    if (argument === "--no-diff") {
      documentDiff = false;
      continue;
    }
    if (
      argument === "--host" ||
      argument === "--port" ||
      argument === "--history-limit"
    ) {
      const value = args[++index];
      if (!value) return null;
      if (argument === "--host") host = value;
      else if (argument === "--port") {
        port = Number(value);
        if (!Number.isInteger(port) || port < 0 || port > 65535)
          throw new Error(`Invalid port: ${value}`);
      } else {
        historyLimit = Number(value);
        if (!Number.isInteger(historyLimit) || historyLimit < 1)
          throw new Error(`Invalid history limit: ${value}`);
      }
      continue;
    }
    if (argument.startsWith("--")) unknownOption(argument);
    positional.push(argument);
  }
  if (positional.length > 2) return null;
  return {
    positional,
    host,
    port,
    open,
    watch,
    verbose,
    historyLimit,
    documentDiff,
  };
}
