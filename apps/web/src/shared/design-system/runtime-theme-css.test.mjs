import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// Opt-in integration check: requires an already-running Next dev server.
// Source-only contracts cannot detect stale CSS served by the dev cache.
test(
  "served stylesheet includes the current dark palette",
  {
    skip: !process.env.THEME_TEST_URL,
  },
  async () => {
    const base = process.env.THEME_TEST_URL;
    const response = await fetch(new URL("/login", base));
    assert.equal(response.status, 200);
    const html = await response.text();
    const links = [
      ...html.matchAll(/<link\b[^>]*href="([^"]+\.css(?:\?[^"]*)?)"[^>]*>/g),
    ];
    assert.ok(links.length, "HTML must link a stylesheet");
    const styles = await Promise.all(
      links.map(async ([, href]) => {
        const css = await fetch(new URL(href.replaceAll("&amp;", "&"), base));
        assert.equal(css.status, 200);
        return css.text();
      }),
    );
    const emitted = styles.join("\n");
    const emittedDark = emitted.match(
      /:root\[data-theme=["']?dark["']?\]\s*{([^}]+)}/,
    )?.[1];
    assert.ok(emittedDark, "served CSS must include the runtime dark selector");
    const normalizeHex = (value) =>
      value.length === 4
        ? `#${[...value.slice(1)].map((digit) => digit.repeat(2)).join("")}`
        : value;
    const palette = new Map(
      [...emittedDark.matchAll(/(--color-[\w-]+):\s*(#[\da-f]{3,6});/gi)].map(
        ([, token, value]) => [token, normalizeHex(value)],
      ),
    );
    const source = readFileSync(
      new URL("../../app/globals.css", import.meta.url),
      "utf8",
    );
    const dark = source.match(/:root\[data-theme="dark"\]\s*{([^}]+)}/)[1];
    for (const [, token, value] of dark.matchAll(
      /(--color-[\w-]+):\s*(#[\da-f]{6});/gi,
    )) {
      assert.equal(
        palette.get(token),
        value,
        `served dark CSS must match ${token}`,
      );
    }
  },
);
