import assert from "node:assert/strict";
import { test } from "node:test";
import { presets, retroPalette } from "../src/config/presets.ts";
import { contrast, deriveVars, isDark, mix, normalize, validatePalette } from "../shared/palette.ts";

const good = { bg: "#17181b", surf: "#212227", ink: "#ececf0", acc: "#8ab4ff", acc2: "#c792ea" };

test("every built-in preset passes the readability rules", () => {
  for (const preset of presets) assert.equal(validatePalette(preset.palette), null, preset.id);
});

test("the 2003 mode palette is readable", () => {
  assert.equal(validatePalette(retroPalette), null);
});

test("contrast follows the WCAG formula", () => {
  assert.equal(Math.round(contrast("#000000", "#ffffff")), 21);
  assert.equal(contrast("#777777", "#777777"), 1);
});

test("bad colors and unreadable combinations are rejected", () => {
  assert.equal(validatePalette({ ...good, bg: "red" }), "colors");
  assert.equal(validatePalette({ ...good, acc: "#12345" }), "colors");
  assert.equal(validatePalette(null), "colors");
  assert.equal(validatePalette({ ...good, ink: "#2a2a2e" }), "text");
  assert.equal(validatePalette({ ...good, ink: "#8a8a90" }), "muted");
  assert.equal(validatePalette({ ...good, acc: "#1f2024" }), "accent");
});

test("colors are normalized and derived variables are complete", () => {
  assert.deepEqual(normalize({ ...good, bg: "#17181B" })?.bg, "#17181b");
  assert.equal(normalize({ ...good, extra: "x" })?.acc, good.acc);
  const vars = deriveVars(good);
  assert.deepEqual(Object.keys(vars).sort(), [
    "--acc",
    "--acc2",
    "--bg",
    "--dot",
    "--ink",
    "--line",
    "--mut",
    "--surf",
    "--surf2",
  ]);
  assert.equal(mix("#000000", "#ffffff", 0.5), "#808080");
  assert.equal(isDark("#0b0b14"), true);
  assert.equal(isDark("#f2ecdf"), false);
});
