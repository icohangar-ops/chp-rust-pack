#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import process from "node:process";

import {
  buildBundle,
  buildImplementationGuide,
  buildLandingPage,
  buildPackManifest,
  buildConsumerReadme,
  getVariant,
} from "../index.js";
import { resolveWithinBase } from "../safe-path.js";

function parseArgs(argv) {
  const args = [...argv];
  const command = args[0] ?? "show";
  const rest = args.slice(1);
  const options = { variant: "cubiczan" };
  const positional = [];

  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i];
    if (token === "--variant") {
      options.variant = rest[i + 1] ?? options.variant;
      i += 1;
      continue;
    }
    if (token.startsWith("--variant=")) {
      options.variant = token.split("=", 2)[1] || options.variant;
      continue;
    }
    positional.push(token);
  }

  return { command, positional, options };
}

function usage() {
  return [
    "Usage:",
    "  chp-rust-pack show [--variant cubiczan|impactquadrant]",
    "  chp-rust-pack manifest [--variant cubiczan|impactquadrant]",
    "  chp-rust-pack init <dir> [--variant cubiczan|impactquadrant]",
    "  chp-rust-pack html [--variant cubiczan|impactquadrant]",
  ].join("\n");
}

function writeBundle(targetDir, variantName) {
  const bundle = buildBundle(variantName);
  const baseDir = resolve(targetDir);
  for (const [relativePath, contents] of Object.entries(bundle.files)) {
    const filePath = resolveWithinBase(baseDir, relativePath);
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, contents, "utf8");
  }
  return bundle.manifest;
}

const { command, positional, options } = parseArgs(process.argv.slice(2));

try {
  const variant = getVariant(options.variant);

  if (command === "help" || command === "--help" || command === "-h") {
    console.log(usage());
    process.exit(0);
  }

  if (command === "show") {
    console.log(`${variant.brand} CHP + Rust pack`);
    console.log(variant.description);
    console.log("");
    console.log(`Install: npm install @cubiczan/chp-rust-pack`);
    console.log(`Scaffold: npx chp-rust-pack init ./chp-rust-pack --variant ${variant.key}`);
    console.log("");
    console.log(buildImplementationGuide(variant.key));
    process.exit(0);
  }

  if (command === "manifest") {
    console.log(JSON.stringify(buildPackManifest(variant.key), null, 2));
    process.exit(0);
  }

  if (command === "html") {
    console.log(buildLandingPage(variant.key));
    process.exit(0);
  }

  if (command === "init") {
    const dest = positional[0] ?? "./chp-rust-pack";
    const targetDir = isAbsolute(dest)
      ? resolve(dest)
      : resolveWithinBase(process.cwd(), dest);
    mkdirSync(targetDir, { recursive: true });
    const manifest = writeBundle(targetDir, variant.key);
    console.log(`Wrote ${variant.brand} pack to ${targetDir}`);
    console.log(`Variant: ${manifest.selectedVariant.key}`);
    console.log(`Next: open ${join(targetDir, "IMPLEMENTATION.md")}`);
    process.exit(0);
  }

  console.error(usage());
  process.exit(1);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
