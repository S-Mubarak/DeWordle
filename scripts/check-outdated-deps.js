#!/usr/bin/env node
// scripts/check-outdated-deps.js
// Checks for outdated npm packages across monorepo workspaces

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const WORKSPACES = ["frontend", "backend", "packages/events"];

let hasOutdated = false;

for (const ws of WORKSPACES) {
  if (!fs.existsSync(path.join(ws, "package.json"))) continue;
  console.log("\n== " + ws + " ==");
  try {
    const out = execSync("npm outdated --json", { cwd: ws, stdio: "pipe" }).toString();
    const data = JSON.parse(out || "{}");
    const pkgs = Object.keys(data);
    if (pkgs.length === 0) {
      console.log("  All packages up to date.");
    } else {
      hasOutdated = true;
      for (const pkg of pkgs) {
        const d = data[pkg];
        console.log("  " + pkg + ": current=" + d.current + " wanted=" + d.wanted + " latest=" + d.latest);
      }
    }
  } catch (e) {
    const data = JSON.parse(e.stdout ? e.stdout.toString() : "{}");
    const pkgs = Object.keys(data);
    if (pkgs.length > 0) {
      hasOutdated = true;
      for (const pkg of pkgs) {
        const d = data[pkg];
        console.log("  " + pkg + ": current=" + d.current + " wanted=" + d.wanted + " latest=" + d.latest);
      }
    }
  }
}

if (hasOutdated) {
  console.log("\nOutdated packages found. Run npm update in affected workspaces.");
  process.exit(1);
}