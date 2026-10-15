import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { auditSource, reachableSources } from "./source-color-contract.mjs";

const root = new URL("../../", import.meta.url);
const css = readFileSync(new URL("app/globals.css", root), "utf8");

test("analyzer reports local palettes, arbitrary colors, inline paint and undefined roles", () => {
  const issues = auditSource(
    `<div className="hover:bg-red-100 text-success bg-[#abcdef]" style={{color: '#fff'}} />`,
    new Set(),
  );
  assert.deepEqual(issues.map((i) => i.kind).sort(), [
    "inline-color",
    "literal-color",
    "palette",
    "undefined-token",
  ]);
});

test("analyzer accepts defined roles and non-color utilities without parsing comments as UI", () => {
  assert.deepEqual(
    auditSource(
      `// text-red-500\nconst node = <div className="text-sm bg-surface/50 text-on-surface border-2 w-[20px]" />;`,
      new Set(["surface", "on-surface"]),
    ),
    [],
  );
});

test("all reachable application sources obey the screen color contract", () => {
  const sources = reachableSources(root);
  assert.equal(sources.filter((p) => p.endsWith("/page.tsx")).length, 41);
  assert.equal(sources.filter((p) => p.endsWith(".tsx")).length, 129);
  const tokens = new Set(
    [...css.matchAll(/--color-([\w-]+):/g)].map((m) => m[1]),
  );
  const pdfs = new Set(
    [
      "consultations/components/consultation-detail-pdf.tsx",
      "doctor-payouts/components/doctor-payout-pdf.tsx",
      "medical-records/components/medical-record-pdf.tsx",
      "payments/components/doctor-receipt-pdf.tsx",
      "reports/components/report-pdf.tsx",
    ].map((p) => `features/${p}`),
  );
  const issues = sources.flatMap((path) => {
    const relative = path.slice(root.pathname.length);
    const source = readFileSync(path, "utf8");
    if (pdfs.has(relative)) {
      assert.match(
        source,
        /@react-pdf\/renderer/,
        `document exception must remain PDF-only: ${relative}`,
      );
      return [];
    }
    return auditSource(source, tokens).map((issue) => ({
      file: relative,
      ...issue,
    }));
  });
  assert.deepEqual(issues, []);
});

test("analyzer detects SVG paint attributes and undefined CSS variable references", () => {
  assert.deepEqual(
    auditSource(
      `<svg fill="#fff" stroke="currentColor" /><div style={{color: 'var(--color-unknown)'}} />`,
      new Set(),
    )
      .map((i) => i.kind)
      .sort(),
    ["inline-color", "undefined-token"],
  );
});

test("analyzer follows conditional classes and template interpolations", () => {
  assert.deepEqual(
    auditSource(
      'const classes = `bg-green-100 ${active ? "text-red-500" : "text-on-surface"}`;',
      new Set(["on-surface"]),
    )
      .map((i) => i.value)
      .sort(),
    ["bg-green-100", "text-red-500"],
  );
});

test("analyzer rejects arbitrary named colors, longhand paints, JSX expression paint and unknown backgrounds", () => {
  assert.deepEqual(
    auditSource(
      '<div className="bg-[blue] text-[rebeccapurple] bg-brand" style={{borderBottomColor: "#fff"}} /><svg fill={"#fff"} />',
      new Set(),
    )
      .map((i) => i.kind)
      .sort(),
    ["inline-color", "literal-color", "literal-color", "undefined-token"],
  );
});
