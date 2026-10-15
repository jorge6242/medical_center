import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = readFileSync(
  new URL("./theme-controls.tsx", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

for (const [theme, destination] of [
  ["light", "dark"],
  ["dark", "light"],
]) {
  test(`theme action in ${theme} names and selects ${destination}`, () => {
    const changes = [];
    const exports = {};
    runInNewContext(compiled, {
      exports,
      require: (name) => {
        if (name === "react") return { useSyncExternalStore: () => theme };
        if (name === "sonner") return { Toaster: () => null };
        if (name === "./theme")
          return { setTheme: (next) => changes.push(next) };
        if (name.includes("/switch")) return { Switch: () => null };
        return require(name);
      },
    });
    const action = exports.ThemeSwitch();
    assert.equal(action.type, "button");
    assert.equal(action.props.type, "button");
    const label = destination === "dark" ? "Modo oscuro" : "Modo claro";
    assert.equal(
      action.props["aria-label"],
      `Cambiar a ${label.toLowerCase()}`,
    );
    for (const attribute of ["role", "aria-pressed", "aria-checked"]) {
      assert.equal(action.props[attribute], undefined);
    }
    const html = require("react-dom/server").renderToStaticMarkup(action);
    assert.ok(html.includes(label));
    assert.ok(html.includes('aria-hidden="true"'));
    assert.ok(html.includes("bg-on-surface-variant"));
    assert.ok(html.includes("bg-surface"));
    action.props.onClick();
    assert.deepEqual(changes, [destination]);
  });
}
