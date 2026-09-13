import { isAbsolute, relative, resolve, sep } from "node:path";

/**
 * Resolve `userPath` against `baseDir` and reject any result that escapes it.
 * In-tree relatives (including `a/../b`) stay allowed after normalization.
 */
export function resolveWithinBase(baseDir, userPath) {
  if (typeof userPath !== "string" || userPath.length === 0) {
    throw new Error("path must be a non-empty string");
  }

  const base = resolve(baseDir);
  const resolved = resolve(base, userPath);
  const rel = relative(base, resolved);

  if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    throw new Error(`refusing path outside base directory: ${userPath}`);
  }

  return resolved;
}
