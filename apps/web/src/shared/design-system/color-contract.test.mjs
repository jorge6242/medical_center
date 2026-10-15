import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const css = readFileSync(
  new URL("../../app/globals.css", import.meta.url),
  "utf8",
);
const definitions = new Map(
  [
    ...css.slice(0, css.indexOf("}")).matchAll(/--color-([\w-]+):\s*([^;]+);/g),
  ].map((m) => [m[1], m[2]]),
);

test("semantic state and surface colors are defined by the actual stylesheet", () => {
  for (const token of [
    "success",
    "on-success",
    "success-container",
    "on-success-container",
    "warning",
    "on-warning",
    "warning-container",
    "on-warning-container",
    "surface-container",
    "surface-container-high",
    "scrim",
  ]) {
    assert.match(
      definitions.get(token) ?? "",
      /^#[\da-f]{6}$/i,
      `missing semantic token: ${token}`,
    );
  }
});

function declarations(selector) {
  const start = css.indexOf(`${selector} {`);
  assert.notEqual(start, -1, `missing stylesheet contract: ${selector}`);
  return Object.fromEntries(
    [
      ...css
        .slice(start, css.indexOf("}", start))
        .matchAll(/([\w-]+):\s*([^;]+);/g),
    ].map((m) => [m[1], m[2].trim()]),
  );
}

test("native controls explicitly consume screen semantic paint and a light color scheme", () => {
  assert.equal(declarations(":root")["color-scheme"], "light");
  const controls = declarations(":where(input, select, textarea)");
  assert.equal(controls.color, "var(--color-on-surface)");
  assert.equal(controls["accent-color"], "var(--color-primary)");
});

test("Sonner palette adapter resolves every notification role through our tokens", () => {
  const toast = declarations(":root [data-sonner-toaster].medical-toaster");
  for (const state of ["normal", "success", "warning", "error", "info"]) {
    for (const part of ["bg", "text", "border"]) {
      assert.match(
        toast[`--${state}-${part}`] ?? "",
        /^var\(--color-[\w-]+\)$/,
      );
    }
  }
});

test("print scope resets semantic screen colors to a separate documentary palette", () => {
  const print = declarations("[data-document-print]");
  assert.equal(print["--color-surface"], "var(--document-paper)");
  assert.equal(print["--color-on-surface"], "var(--document-ink)");
  assert.equal(print["--color-on-surface-variant"], "var(--document-ink)");
});

function luminance(hex) {
  const channels = hex
    .slice(1)
    .match(/../g)
    .map((channel) => {
      const value = parseInt(channel, 16) / 255;
      return value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4;
    });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

test("new opaque semantic state pairs meet normal text contrast, independently of render", () => {
  for (const state of ["success", "warning"]) {
    for (const suffix of ["", "-container"]) {
      const fill = luminance(definitions.get(`${state}${suffix}`));
      const text = luminance(definitions.get(`on-${state}${suffix}`));
      assert.ok(
        (Math.max(fill, text) + 0.05) / (Math.min(fill, text) + 0.05) >= 4.5,
        `${state}${suffix} pair`,
      );
    }
  }
});

test("Sonner loading and close hover inherit semantic grayscale adapter roles", () => {
  const toast = declarations(":root [data-sonner-toaster].medical-toaster");
  assert.equal(toast["--gray2"], "var(--color-surface-variant)");
  assert.equal(toast["--gray5"], "var(--color-outline)");
  assert.equal(toast["--gray11"], "var(--color-on-surface-variant)");
});

test("document descendants receive actual print paint, not only inline-theme variable overrides", () => {
  const descendants = declarations("[data-document-print] *");
  assert.equal(descendants["background-color"], "var(--document-paper)");
  assert.equal(descendants.color, "var(--document-ink)");
  assert.equal(descendants["border-color"], "var(--document-outline)");
  assert.equal(descendants["box-shadow"], "none");
});
