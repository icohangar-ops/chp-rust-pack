import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { resolveWithinBase } from "../safe-path.js";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const cli = join(repoRoot, "bin/chp-rust-pack.js");

test("keeps legitimate in-tree relative paths", () => {
  const base = resolve("/tmp/chp-pack-base");
  assert.equal(resolveWithinBase(base, "README.md"), join(base, "README.md"));
  assert.equal(
    resolveWithinBase(base, "assets/landing-page.html"),
    join(base, "assets/landing-page.html"),
  );
  assert.equal(resolveWithinBase(base, "assets/../pack.json"), join(base, "pack.json"));
  assert.equal(resolveWithinBase(base, "./chp-rust-pack"), join(base, "chp-rust-pack"));
});

test("rejects relative traversal and absolute escapes", () => {
  const base = resolve("/tmp/chp-pack-base");
  assert.throws(() => resolveWithinBase(base, "../secret"), /outside base directory/);
  assert.throws(() => resolveWithinBase(base, "assets/../../etc/passwd"), /outside base directory/);
  assert.throws(() => resolveWithinBase(base, "/etc/passwd"), /outside base directory/);
  assert.throws(() => resolveWithinBase(base, ""), /non-empty string/);
});

test("init writes the in-tree pack and rejects dest traversal", () => {
  const workspace = mkdtempSync(join(tmpdir(), "chp-rust-pack-"));
  try {
    const dest = join(workspace, "chp-rust-pack");
    const ok = spawnSync(process.execPath, [cli, "init", dest, "--variant", "cubiczan"], {
      encoding: "utf8",
    });
    assert.equal(ok.status, 0, ok.stderr);
    assert.match(readFileSync(join(dest, "README.md"), "utf8"), /CHP \+ Rust pack/);

    const escaped = spawnSync(
      process.execPath,
      [cli, "init", join("..", "escape-pack"), "--variant", "cubiczan"],
      { cwd: dest, encoding: "utf8" },
    );
    assert.notEqual(escaped.status, 0);
    assert.match(escaped.stderr, /outside base directory/);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});
