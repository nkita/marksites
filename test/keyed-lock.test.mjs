import assert from "node:assert/strict";
import test from "node:test";

import { KeyedLock } from "../dist/server/keyed-lock.js";

test("KeyedLock serializes operations for the same key", async () => {
  const lock = new KeyedLock();
  const events = [];
  let release;
  const gate = new Promise((resolve) => (release = resolve));
  const first = lock.run("document", async () => {
    events.push("first:start");
    await gate;
    events.push("first:end");
  });
  const second = lock.run("document", async () => events.push("second"));
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(events, ["first:start"]);
  release();
  await Promise.all([first, second]);
  assert.deepEqual(events, ["first:start", "first:end", "second"]);
});

test("KeyedLock does not block a different key", async () => {
  const lock = new KeyedLock();
  let release;
  const gate = new Promise((resolve) => (release = resolve));
  const first = lock.run("left", () => gate);
  let completed = false;
  await lock.run("right", async () => {
    completed = true;
  });
  assert.equal(completed, true);
  release();
  await first;
});
