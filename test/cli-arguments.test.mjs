import assert from "node:assert/strict";
import test from "node:test";
import { parseConvertArguments } from "../dist/cli/arguments.js";

test("parses conversion arguments without process side effects", () => {
  assert.deepEqual(parseConvertArguments(["docs", "site", "--watch", "--verbose"]), {
    positional: ["docs", "site"],
    watch: true,
    verbose: true,
    historyLimit: 10,
    documentDiff: true,
  });
  assert.equal(parseConvertArguments(["a", "b", "c"]), null);
  assert.throws(() => parseConvertArguments(["--open"]), /Unknown option/);
});

test("parses diff and history options", () => {
  assert.equal(parseConvertArguments(["--no-diff"]).documentDiff, false);
  assert.equal(parseConvertArguments(["--history-limit"]), null);
  assert.equal(parseConvertArguments(["--history-limit", "8"]).historyLimit, 8);
  assert.throws(
    () => parseConvertArguments(["--history-limit", "0"]),
    /Invalid history limit/,
  );
});
