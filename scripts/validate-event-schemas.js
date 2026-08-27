#!/usr/bin/env node
// scripts/validate-event-schemas.js
// Validates TypeScript event schema versions against a baseline

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SCHEMA_DIR = path.join(__dirname, '../packages/events/src');
const BASELINE_FILE = path.join(__dirname, 'event-schema-baseline.json');

function hashFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return crypto.createHash('sha256').update(content).digest('hex');
}

function getSchemaHashes() {
  if (!fs.existsSync(SCHEMA_DIR)) {
    console.warn('Schema directory not found:', SCHEMA_DIR);
    return {};
  }
  const files = fs.readdirSync(SCHEMA_DIR).filter(f => f.endsWith('.ts'));
  const hashes = {};
  for (const file of files) {
    hashes[file] = hashFile(path.join(SCHEMA_DIR, file));
  }
  return hashes;
}

const current = getSchemaHashes();

if (process.argv.includes('--save')) {
  fs.writeFileSync(BASELINE_FILE, JSON.stringify(current, null, 2));
  console.log('Baseline saved.');
  process.exit(0);
}

if (!fs.existsSync(BASELINE_FILE)) {
  console.error('No baseline found. Run with --save first.');
  process.exit(1);
}

const baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));
let changed = false;
for (const [file, hash] of Object.entries(current)) {
  if (baseline[file] !== hash) {
    console.error('CHANGED:', file);
    changed = true;
  }
}
if (changed) { console.error('Schema drift detected!'); process.exit(1); }
else { console.log('All schemas match baseline.'); }