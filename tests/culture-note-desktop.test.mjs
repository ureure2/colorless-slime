import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const packageJson = JSON.parse(await readFile(new URL("package.json", root), "utf8"));
const tauriConfig = JSON.parse(await readFile(new URL("src-tauri/tauri.conf.json", root), "utf8"));
const cargoToml = await readFile(new URL("src-tauri/Cargo.toml", root), "utf8");

test("keeps the desktop product identity and version aligned", () => {
  assert.equal(tauriConfig.productName, "무색슬라임");
  assert.equal(tauriConfig.app.windows[0].title, "무색슬라임");
  assert.equal(tauriConfig.version, "0.1.0");
  assert.equal(packageJson.version, tauriConfig.version);
  assert.match(cargoToml, /^version = "0\.1\.0"$/m);
  assert.equal(tauriConfig.identifier, "io.github.musaekslime");
});

test("packages the isolated culture note build as a Windows installer", () => {
  assert.equal(tauriConfig.build.beforeBuildCommand, "npm run build");
  assert.equal(tauriConfig.build.frontendDist, "../dist/culture-note");
  assert.deepEqual(tauriConfig.bundle.targets, ["nsis"]);
  assert.deepEqual(tauriConfig.bundle.windows.nsis.languages, ["Korean", "English"]);
  assert.equal(tauriConfig.bundle.windows.nsis.installMode, "currentUser");
  assert.equal(packageJson.scripts["desktop:build"], "tauri build");
});

test("includes usable desktop application icons", async () => {
  const requiredIcons = ["32x32.png", "128x128.png", "128x128@2x.png", "icon.ico", "icon.icns"];
  assert.deepEqual(tauriConfig.bundle.icon, requiredIcons.map((name) => "icons/" + name));
  for (const name of requiredIcons) {
    const icon = await stat(new URL("src-tauri/icons/" + name, root));
    assert.ok(icon.size > 0, name + " must not be empty");
  }
});
