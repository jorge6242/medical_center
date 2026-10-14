import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import ts from "typescript";

const source = await fs.readFile(
  new URL("./mutation-attempt.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const { createMutationAttempt } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);

function attempt() {
  let index = 0;
  return createMutationAttempt(() => `key-${++index}`);
}

test("lost response retries the same key and original payload, not edited fields", () => {
  const flow = attempt();
  const dto = { amount: "20", nested: { invoice: "a" } };
  const first = flow.prepare(dto);
  flow.failed(new TypeError("network failed"));
  dto.nested.invoice = "b";
  assert.deepEqual(flow.retry(), {
    key: "key-1",
    payload: { amount: "20", nested: { invoice: "a" } },
  });
  assert.throws(() => flow.prepare({ amount: "40" }), /resultado.*incierto/i);
  assert.equal(first.key, flow.retry().key);
});

test("server 500 or conflict remains uncertain and cannot create another attempt", () => {
  for (const status of [500, 502, 409]) {
    const flow = attempt();
    flow.prepare({ slug: "one" });
    flow.failed(Object.assign(new Error("rejected"), { status }));
    assert.equal(flow.isUncertain(), true);
    assert.equal(flow.retry().key, "key-1");
  }
});

test("definite validation rejection permits corrected payload with new key", () => {
  const flow = attempt();
  flow.prepare({ amount: "0" });
  flow.failed(Object.assign(new Error("invalid"), { status: 400 }));
  assert.equal(flow.isUncertain(), false);
  assert.deepEqual(flow.prepare({ amount: "25" }), {
    key: "key-2",
    payload: { amount: "25" },
  });
});

test("success clears sensitive payload and next independent operation gets new key", () => {
  const flow = attempt();
  flow.prepare({ password: "secret" });
  flow.succeeded();
  assert.equal(flow.retry(), null);
  assert.deepEqual(flow.prepare({ amount: "10" }), {
    key: "key-2",
    payload: { amount: "10" },
  });
});

test("uncertain retry accepts exactly the frozen payload for the original key", () => {
  const flow = attempt();
  flow.prepare({ amount: "20" });
  flow.failed(new Error("response lost"));
  assert.deepEqual(flow.prepare({ amount: "20" }), {
    key: "key-1",
    payload: { amount: "20" },
  });
});

test("authentication failure during uncertain retry cannot discard an earlier committed operation", () => {
  const flow = attempt();
  flow.prepare({ amount: "20" });
  flow.failed(new Error("response lost"));
  flow.failed(Object.assign(new Error("session expired"), { status: 401 }));
  assert.equal(flow.isUncertain(), true);
  assert.equal(flow.retry().key, "key-1");
});
