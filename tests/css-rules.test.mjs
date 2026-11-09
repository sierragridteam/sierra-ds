import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const dir = new URL("../packages/design-system/src/styles/", import.meta.url);

test("no stylesheet repeats an identical rule", () => {
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".css"))) {
    const css = readFileSync(new URL(file, dir), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const seen = new Map();
    // Top-level and nested rules alike: "selector { declarations }" with no inner braces.
    for (const [, selector, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const key = `${selector.trim().replace(/\s+/g, " ")} {${body.replace(/\s+/g, " ").trim()}}`;
      if (/^@|^\d|^from$|^to$/.test(selector.trim())) continue;
      assert.ok(!seen.has(key), `${file}: duplicate rule ${key.slice(0, 80)}`);
      seen.set(key, true);
    }
  }
});
