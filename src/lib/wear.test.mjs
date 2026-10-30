import assert from "node:assert/strict";
import test from "node:test";
import { preferredPack, resolvePack, snapshot } from "./wear.mjs";

test("snapshot lists the five bundled skins with a preferred id", () => {
  const snap = snapshot();
  assert.equal(snap.packs.length >= 5, true);
  assert.equal(snap.packs[0].id, "ink-night");
  assert.ok(snap.activeId);
  assert.ok(snap.packs.some((pack) => pack.selected && pack.id === snap.activeId));
  assert.ok(snap.kitRoot);
});

test("resolvePack falls back to the remembered or featured skin", () => {
  const pack = resolvePack();
  assert.equal(pack.id, preferredPack().id);
  const named = resolvePack("starlight");
  assert.equal(named.id, "starlight");
  assert.equal(named.displayName.includes("星光") || named.id === "starlight", true);
});
