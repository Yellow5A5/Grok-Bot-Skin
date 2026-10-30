import assert from "node:assert/strict";
import test from "node:test";
import { compileOverlay, injectExpression } from "./compile.mjs";
import { getPack, listPacks } from "./pack.mjs";

test("bundled packs load and compile", () => {
  const packs = listPacks();
  const ids = packs.map((pack) => pack.id).sort();
  assert.deepEqual(ids, [
    "ember-forge",
    "ink-night",
    "jade-grove",
    "leaf-warm",
    "paper-dawn",
    "starlight",
    "straw-sea",
  ]);
  assert.equal(packs[0].id, "ink-night");
  for (const pack of packs) {
    const css = compileOverlay(pack);
    assert.match(css, /--cursor-accent:/);
    assert.match(css, /--cursor-chrome:/);
    assert.match(css, new RegExp(`grok-bot-skin ${pack.id}`));
    if (pack.wallpaperAbs) {
      assert.match(css, /\.sand-shell/);
      assert.match(css, /file:/);
      assert.match(css, /--grok-skin-wallpaper:/);
    }
    assert.match(css, /#grok-bot-skin-usage/);
  }
});

test("paper-dawn is a light skin", () => {
  const pack = getPack("paper-dawn");
  assert.equal(pack.appearance, "light");
  const css = compileOverlay(pack);
  assert.match(css, /color-scheme: light/);
});

test("injecting a skin also boots the usage HUD", () => {
  const css = compileOverlay(getPack("straw-sea"));
  assert.match(css, /#grok-bot-skin-usage/);
  assert.match(css, /pointer-events: none/);
  const js = injectExpression("/*css*/", "straw-sea");
  assert.match(js, /getCursorUsageSummary/);
  assert.match(js, /getCursorUsageBreakdown/);
  assert.match(js, /desktop\.main/);
  assert.match(js, /grok-bot-skin-usage/);
});

test("cartoon packs are light and paint window ornaments", () => {
  for (const id of ["straw-sea", "leaf-warm"]) {
    const pack = getPack(id);
    assert.equal(pack.appearance, "light");
    const css = compileOverlay(pack);
    assert.match(css, /color-scheme: light/);
    assert.match(css, /stickers\.svg/);
    assert.match(css, /file:/);
    assert.match(css, /border-radius/);
  }
});
