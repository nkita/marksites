import assert from "node:assert/strict";
import test from "node:test";
import {
  parseConvertArguments,
  parseServeArguments,
} from "../dist/cli/arguments.js";

test("parses conversion arguments without process side effects", () => {
  assert.deepEqual(parseConvertArguments(["docs", "site", "--watch", "--verbose"]), {
    positional: ["docs", "site"],
    watch: true,
    verbose: true,
    historyLimit: 5,
  });
  assert.equal(parseConvertArguments(["a", "b", "c"]), null);
  assert.throws(() => parseConvertArguments(["--open"]), /Unknown option/);
});

test("parses serve arguments and validates its port", () => {
  assert.deepEqual(
    parseServeArguments(["docs", "site", "--host", "0.0.0.0", "--port", "4000", "--open"]),
    {
      positional: ["docs", "site"],
      host: "0.0.0.0",
      port: 4000,
      open: true,
      watch: false,
      verbose: false,
      historyLimit: 5,
    },
  );
  assert.equal(parseServeArguments(["--port"]), null);
  assert.throws(() => parseServeArguments(["--port", "70000"]), /Invalid port/);
  assert.equal(parseConvertArguments(["--history-limit"]), null);
  assert.equal(parseConvertArguments(["--history-limit", "8"]).historyLimit, 8);
  assert.throws(
    () => parseConvertArguments(["--history-limit", "0"]),
    /Invalid history limit/,
  );
});
