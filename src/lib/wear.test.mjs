import assert from "node:assert/strict";
import test from "node:test";
import { parseOnOff } from "./prefs.mjs";
import { preferredPack, resolvePack, snapshot } from "./wear.mjs";

test("snapshot lists bundled skins with a preferred id", () => {
  const snap = snapshot();
  assert.equal(snap.packs.length >= 5, true);
  assert.equal(snap.packs[0].id, "ink-night");
  assert.ok(snap.activeId);
  assert.ok(snap.packs.some((pack) => pack.selected && pack.id === snap.activeId));
  assert.ok(snap.kitRoot);
  assert.equal(typeof snap.prefs.followOfficialLaunch, "boolean");
  assert.equal(typeof snap.prefs.openAtLogin, "boolean");
  assert.equal(typeof snap.prefs.showUsageHud, "boolean");
});

test("parseOnOff accepts on/off tokens", () => {
  assert.equal(parseOnOff("on"), true);
  assert.equal(parseOnOff("off"), false);
  assert.equal(parseOnOff("false"), false);
});

test("resolvePack falls back to the remembered or featured skin", () => {
  const pack = resolvePack();
  assert.equal(pack.id, preferredPack().id);
  const named = resolvePack("avenger-neon");
  assert.equal(named.id, "avenger-neon");
  assert.equal(named.appearance, "dark");
  assert.match(named.displayName, /复联霓|Avenger/);
});
