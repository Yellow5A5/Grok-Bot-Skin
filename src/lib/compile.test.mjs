import assert from "node:assert/strict";
import test from "node:test";
import { compileOverlay } from "./compile.mjs";
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
  }
});

test("paper-dawn is a light skin", () => {
  const pack = getPack("paper-dawn");
  assert.equal(pack.appearance, "light");
  const css = compileOverlay(pack);
  assert.match(css, /color-scheme: light/);
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
