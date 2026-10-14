import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import ts from "typescript";

const transpile = (source) =>
  ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
const dataUrl = (source) =>
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const helper = dataUrl(
  transpile(
    await fs.readFile(
      new URL("./mutation-attempt.ts", import.meta.url),
      "utf8",
    ),
  ),
);
const registry = transpile(
  await fs.readFile(new URL("./mutation-registry.ts", import.meta.url), "utf8"),
).replace(/(['"]).\/mutation-attempt\1/, JSON.stringify(helper));
const { getMutationAttempt } = await import(dataUrl(registry));

test("SPA reauth and remount of same actor/operation restores frozen request and original key", () => {
  const before = getMutationAttempt("admin-a", "create-tenant");
  const original = before.prepare({
    initialAdmin: { password: "RAM-only" },
    slug: "one",
  });
  before.failed(new Error("response lost"));
  before.failed(Object.assign(new Error("expired"), { status: 401 }));
  const remounted = getMutationAttempt("admin-a", "create-tenant");
  assert.equal(remounted.isUncertain(), true);
  assert.deepEqual(remounted.retry(), original);
  remounted.succeeded();
  assert.equal(getMutationAttempt("admin-a", "create-tenant").retry(), null);
});

test("different actors and operations cannot read another pending request", () => {
  const owner = getMutationAttempt("admin-a", "invoice-one");
  owner.prepare({ amount: "25" });
  owner.failed(new Error("lost"));
  assert.equal(getMutationAttempt("admin-b", "invoice-one").retry(), null);
  assert.equal(getMutationAttempt("admin-a", "invoice-two").retry(), null);
});

test("recovery replays only the authenticated actor original operation with a fresh CSRF token", async () => {
  const {
    registerMutationExecutor,
    replayMutationAttempt,
    pendingMutationOperations,
  } = await import(dataUrl(registry));
  const flow = getMutationAttempt("admin-r", "payment:invoice-r");
  const original = flow.prepare({ amount: "15" });
  flow.failed(new Error("lost"));
  const calls = [];
  registerMutationExecutor(
    "admin-r",
    "payment:invoice-r",
    async (payload, token, key) => {
      calls.push({ payload, token, key });
      return { replayed: true };
    },
  );
  await assert.rejects(
    replayMutationAttempt("other-admin", "payment:invoice-r", "fresh"),
    /pendiente/i,
  );
  assert.deepEqual(pendingMutationOperations("admin-r"), ["payment:invoice-r"]);
  await replayMutationAttempt("admin-r", "payment:invoice-r", "fresh-csrf");
  assert.deepEqual(calls, [
    { payload: original.payload, token: "fresh-csrf", key: original.key },
  ]);
  assert.deepEqual(pendingMutationOperations("admin-r"), []);
});
