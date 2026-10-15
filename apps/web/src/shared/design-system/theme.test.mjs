import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("./theme.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext },
}).outputText;
const { initializeThemeScript, getTheme, setTheme, subscribeTheme } =
  await import(
    `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
  );
function browser(value, blocked = false) {
  const attributes = {};
  const listeners = new Set();
  const storage = {
    getItem: () => {
      if (blocked) throw Error("denied");
      return value;
    },
    setItem: (key, next) => {
      if (blocked) throw Error("denied");
      value = next;
    },
  };
  return {
    document: { documentElement: { dataset: attributes } },
    localStorage: storage,
    Event,
    addEventListener: (_, fn) => listeners.add(fn),
    removeEventListener: (_, fn) => listeners.delete(fn),
    dispatchEvent: () => listeners.forEach((fn) => fn()),
    saved: () => value,
    listeners,
  };
}
for (const [value, expected] of [
  ["dark", "dark"],
  ["light", "light"],
  [null, "light"],
  ["system", "light"],
]) {
  test(`bootstrap restores ${value} as ${expected} before React`, () => {
    const win = browser(value);
    runInNewContext(initializeThemeScript, {
      document: win.document,
      localStorage: win.localStorage,
    });
    assert.equal(win.document.documentElement.dataset.theme, expected);
  });
}
test("blocked storage bootstrap falls back to light", () => {
  const win = browser("dark", true);
  runInNewContext(initializeThemeScript, {
    document: win.document,
    localStorage: win.localStorage,
  });
  assert.equal(win.document.documentElement.dataset.theme, "light");
});
test("switch updates DOM, persists and notifies only on changes; unsubscribe cleans up", () => {
  const win = browser(null);
  globalThis.window = win;
  globalThis.document = win.document;
  let notifications = 0;
  const unsubscribe = subscribeTheme(() => notifications++);
  setTheme("dark");
  assert.equal(getTheme(), "dark");
  assert.equal(win.saved(), "dark");
  setTheme("dark");
  assert.equal(notifications, 1);
  setTheme("light");
  assert.equal(getTheme(), "light");
  assert.equal(notifications, 2);
  unsubscribe();
  assert.equal(win.listeners.size, 0);
});
test("blocked persistence does not prevent in-memory changes", () => {
  const win = browser(null, true);
  globalThis.window = win;
  globalThis.document = win.document;
  setTheme("dark");
  assert.equal(getTheme(), "dark");
  setTheme("light");
  assert.equal(getTheme(), "light");
});

test("theme update does not fetch, navigate, refresh or touch unrelated storage", () => {
  const win = browser(null);
  globalThis.window = win;
  globalThis.document = win.document;
  let effects = 0;
  win.location = { reload: () => effects++, assign: () => effects++ };
  win.fetch = globalThis.fetch = () => {
    effects++;
    throw Error("unexpected request");
  };
  const writes = [];
  const save = win.localStorage.setItem;
  win.localStorage.setItem = (key, value) => {
    writes.push(key);
    save(key, value);
  };
  setTheme("dark");
  setTheme("light");
  assert.equal(effects, 0);
  assert.deepEqual(writes, ["centro-medico-theme", "centro-medico-theme"]);
});
