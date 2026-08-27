#!/usr/bin/env node
// scripts/build-perf-report.js
const { execSync } = require("child_process");
const fs = require("fs");
const PACKAGES = ["frontend", "backend", "packages/events"];
console.log("Build Performance Report\n========================");
const results = [];
for (const pkg of PACKAGES) {
  if (!fs.existsSync(pkg)) { console.log("Skipping " + pkg); continue; }
  const start = Date.now();
  try {
    execSync("npm run build --if-present", { cwd: pkg, stdio: "pipe" });
    const d = Date.now() - start;
    results.push({ package: pkg, status: "success", durationMs: d });
    console.log("  " + pkg + ": OK (" + d + "ms)");
  } catch (e) {
    const d = Date.now() - start;
    results.push({ package: pkg, status: "failed", durationMs: d });
    console.log("  " + pkg + ": FAILED (" + d + "ms)");
  }
}
const total = results.reduce((s, r) => s + r.durationMs, 0);
console.log("Total: " + total + "ms");
fs.writeFileSync("build-perf-report.json", JSON.stringify(results, null, 2));