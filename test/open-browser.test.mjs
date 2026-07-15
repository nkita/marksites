import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import { openBrowser } from "../dist/cli/open-browser.js";

function childThat(event) {
  const child = new EventEmitter();
  child.unref = () => {};
  queueMicrotask(() =>
    child.emit(event, event === "error" ? new Error("missing") : undefined),
  );
  return child;
}

test("falls back to the Windows browser opener in WSL", async () => {
  const commands = [];
  const opened = await openBrowser("http://127.0.0.1:3000", {
    platform: "linux",
    environment: { WSL_DISTRO_NAME: "Ubuntu" },
    spawnBrowser(command) {
      commands.push(command);
      return childThat("spawn");
    },
  });
  assert.equal(opened, true);
  assert.deepEqual(commands, ["cmd.exe"]);
});

test("does not throw when no browser opener is installed", async () => {
  const opened = await openBrowser("http://127.0.0.1:3000", {
    platform: "linux",
    environment: {},
    spawnBrowser() {
      return childThat("error");
    },
  });
  assert.equal(opened, false);
});
