import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import ts from "typescript";

const source = await fs.readFile(
  new URL("../../config/api.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const { apiJson } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);
globalThis.window = { location: { pathname: "/platform/login" } };

test("HTTP error carries status for safe mutation retry classification", async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ message: "invalid" }), { status: 400 });
  await assert.rejects(
    apiJson("/platform/test"),
    (error) => error.status === 400 && error.message === "invalid",
  );
});

test("non JSON failure retains its ambiguous HTTP status", async () => {
  globalThis.fetch = async () =>
    new Response("gateway failure", { status: 502 });
  await assert.rejects(
    apiJson("/platform/test"),
    (error) => error.status === 502 && error.message === "HTTP 502",
  );
});

test("platform browser requests use same-origin proxy while tenant URLs stay unchanged", async () => {
  const urls = [];
  globalThis.fetch = async (url) => {
    urls.push(url);
    return new Response("{}", { status: 200 });
  };
  await apiJson("/platform/auth/me");
  await apiJson("/patients");
  assert.deepEqual(urls, [
    "/api/platform/auth/me",
    "http://localhost:3001/patients",
  ]);
});

test("platform 401 signals SPA reauth instead of reloading away pending RAM attempts", async () => {
  const events = [];
  globalThis.CustomEvent = class extends Event {};
  globalThis.window = {
    location: {
      pathname: "/platform/tenants/one/suscripcion",
      href: "unchanged",
    },
    dispatchEvent: (event) => {
      events.push(event.type);
      return true;
    },
  };
  globalThis.fetch = async () => new Response("{}", { status: 401 });
  await assert.rejects(
    apiJson("/platform/auth/me"),
    (error) => error.status === 401,
  );
  assert.equal(window.location.href, "unchanged");
  assert.deepEqual(events, ["platform-session-expired"]);
});
