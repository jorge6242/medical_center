import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import ts from "typescript";
import { NextRequest } from "next/server.js";

const source = await fs.readFile(
  new URL("../../middleware.ts", import.meta.url),
  "utf8",
);
const compiled = ts
  .transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  })
  .outputText.replace(
    /(['"])next\/server\1/,
    JSON.stringify(import.meta.resolve("next/server.js")),
  );
const { middleware } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);
const request = (host, path) =>
  new NextRequest(`http://${host}${path}`, { headers: { host } });

test("admin host admits same-origin platform proxy, not clinical pages", () => {
  assert.equal(
    middleware(request("admin.goratechlabs.com", "/api/platform/auth/me"))
      .status,
    200,
  );
  assert.equal(
    new URL(
      middleware(request("admin.goratechlabs.com", "/patients")).headers.get(
        "location",
      ),
    ).pathname,
    "/platform/login",
  );
});

test("tenant host rejects global UI and proxy, preserves tenant routing context", () => {
  for (const path of ["/platform", "/api/platform/auth/me"]) {
    assert.equal(
      new URL(
        middleware(request("centro.goratechlabs.com", path)).headers.get(
          "location",
        ),
      ).pathname,
      "/login",
    );
  }
  assert.equal(
    middleware(request("centro.goratechlabs.com", "/inicio")).headers.get(
      "x-tenant-web-slug",
    ),
    "centro",
  );
});

test("localhost supports both realms without inventing tenant context", () => {
  for (const path of ["/platform/login", "/api/platform/auth/me", "/login"]) {
    const response = middleware(request("localhost:3000", path));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-tenant-web-slug"), null);
  }
});
