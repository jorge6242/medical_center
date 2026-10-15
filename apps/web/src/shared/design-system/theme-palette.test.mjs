import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const css = readFileSync(
  new URL("../../app/globals.css", import.meta.url),
  "utf8",
);
const roles = (text) =>
  new Map(
    [...text.matchAll(/--color-([\w-]+):\s*(#[\da-f]{6});/gi)].map((m) => [
      m[1],
      m[2],
    ]),
  );
const light = roles(css.slice(0, css.indexOf("}")));
const dark = roles(
  css.match(/:root\[data-theme="dark"\]\s*{([^}]+)}/)?.[1] ?? "",
);
test("dark palette covers every light role and CSS utilities retain runtime variables", () => {
  assert.equal(light.size, 31);
  assert.deepEqual([...dark.keys()].sort(), [...light.keys()].sort());
  assert.match(css, /@theme\s*{/);
  assert.doesNotMatch(css, /@theme inline/);
  assert.match(css, /:root\[data-theme="dark"\][\s\S]*?color-scheme: dark/);
});
function luminance(hex) {
  const c = hex
    .slice(1)
    .match(/../g)
    .map((n) => parseInt(n, 16) / 255)
    .map((n) => (n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4));
  return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
}
test("dark opaque semantic text pairs reach 4.5:1 (not rendered contrast)", () => {
  assert.equal(dark.size, 31);
  for (const [name, hex] of dark) {
    if (!name.startsWith("on-")) continue;
    const fill = luminance(dark.get(name.slice(3)));
    const text = luminance(hex);
    assert.ok(
      (Math.max(fill, text) + 0.05) / (Math.min(fill, text) + 0.05) >= 4.5,
      name,
    );
  }
});

test("theme action indicators and text contrast in both opaque palettes", () => {
  for (const [theme, palette] of [
    ["light", light],
    ["dark", dark],
  ]) {
    const contrast = (first, second) => {
      const a = luminance(palette.get(first));
      const b = luminance(palette.get(second));
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    };
    for (const surface of ["surface", "surface-variant"]) {
      const indicator = contrast("on-surface-variant", surface);
      const text = contrast("on-surface", surface);
      assert.ok(indicator >= 3, `${theme} indicator/${surface}: ${indicator}`);
      assert.ok(text >= 4.5, `${theme} text/${surface}: ${text}`);
      assert.ok(contrast("primary", surface) >= 3, `${theme} focus/${surface}`);
      console.info(
        `${theme}/${surface}: indicator ${indicator.toFixed(2)}, text ${text.toFixed(2)}, focus ${contrast("primary", surface).toFixed(2)}`,
      );
    }
  }
});
